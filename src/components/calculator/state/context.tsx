import { createContext, useContext, useReducer, useMemo, useEffect, type ReactNode } from 'react';
import type {
  CalculatorInputs,
  CalculatorOutputs,
  ValidationResult,
  CohortDefinition,
  GoalsConfig,
  BudgetConfig,
  AdvancedConfig,
  CampaignProfileId,
  Scenario,
  ASPScalingResult,
} from '../engine/types';
import type { SolverVariableId, SolverValues, LockState, SolverResult } from '../engine/solver-types';
import { solve } from '../engine/solver';
import { calculate, applyGoalDrivenAccounts } from '../engine/calculate';
import { validate } from '../engine/validate';
import {
  createDefaultInputs,
  CAMPAIGN_PROFILES,
  DEFAULT_LOCK_STATE,
  LOCK_PRESETS,
} from '../engine/defaults';
import { interpolateASPScaling } from '../engine/asp-scaling';
import { loadScenarios, saveScenarios } from './scenarios';

// --- State ---

export interface ASPNotification {
  bandLabel: string;
  timestamp: number;
  adjustedFields: string[];
  preservedFields: string[];
  scalingResult: ASPScalingResult;
}

export interface CalculatorState {
  // Solver state (source of truth for 13 lockable variables)
  solver: {
    values: SolverValues;
    locks: LockState;
    result: SolverResult;
    activePresetId: string | null;
  };

  // Derived from solver
  inputs: CalculatorInputs;
  outputs: CalculatorOutputs;
  validations: ValidationResult[];

  // Shared
  scenarios: Scenario[];
  activeScenarioId: string;
  ui: {
    activeTab: 'timeline' | 'budget' | 'cohorts' | 'data' | 'sensitivity';
    expandedSections: string[];
    showCompare: boolean;
    showEmailCapture: boolean;
    compareScenarioIds: string[];
    isFirstVisit: boolean;
    showWizard: boolean;
    aspNotification: ASPNotification | null;
  };
}

// --- Actions ---

type Action =
  // Solver actions
  | { type: 'SET_SOLVER_VALUE'; variable: SolverVariableId; value: number }
  | { type: 'TOGGLE_LOCK'; variable: SolverVariableId }
  | { type: 'SET_LOCK_PRESET'; presetId: string }
  // Forward mode inputs (used by CohortBuilder, AdvancedSection)
  | { type: 'SET_GOALS'; payload: Partial<GoalsConfig> }
  | { type: 'ASP_CHANGED'; newASP: number }
  | { type: 'DISMISS_ASP_NOTIFICATION' }
  | { type: 'SET_COHORT'; cohortId: string; payload: Partial<CohortDefinition> }
  | { type: 'ADD_COHORT' }
  | { type: 'REMOVE_COHORT'; cohortId: string }
  | { type: 'SET_COHORT_PROFILE'; cohortId: string; profileId: CampaignProfileId }
  | { type: 'SET_BUDGET'; payload: Partial<BudgetConfig> }
  | { type: 'SET_FREQUENCY'; payload: Partial<import('../engine/types').FrequencyConfig> }
  | { type: 'SET_ADVANCED'; payload: Partial<AdvancedConfig> }
  | { type: 'SET_SIMULATION_QUARTERS'; value: number }
  // UI
  | { type: 'SET_TAB'; tab: CalculatorState['ui']['activeTab'] }
  | { type: 'TOGGLE_SECTION'; section: string }
  // Scenarios
  | { type: 'SAVE_SCENARIO'; name: string }
  | { type: 'LOAD_SCENARIO'; scenarioId: string }
  | { type: 'DELETE_SCENARIO'; scenarioId: string }
  | { type: 'RENAME_SCENARIO'; scenarioId: string; name: string }
  | { type: 'TOGGLE_COMPARE' }
  | { type: 'SET_COMPARE_SCENARIOS'; ids: string[] }
  | { type: 'SHOW_EMAIL_CAPTURE' }
  | { type: 'HIDE_EMAIL_CAPTURE' }
  | { type: 'DISMISS_FIRST_VISIT' }
  | { type: 'SHOW_WIZARD' }
  | { type: 'HIDE_WIZARD' };

// --- Bridge Functions ---

/** Extract solver-compatible values from CalculatorInputs + outputs */
function inputsToSolverValues(inputs: CalculatorInputs, totalBudget: number): SolverValues {
  const totalAccounts = inputs.cohorts.reduce((s, c) => s + c.totalAccounts, 0);
  // Prefer first cold cohort for solver rate extraction (warm profiles have non-standard rates)
  const coldCohort = inputs.cohorts.find(c => CAMPAIGN_PROFILES[c.profileId].category === 'cold');
  const refCohort = coldCohort || inputs.cohorts[0];
  const profile = CAMPAIGN_PROFILES[refCohort?.profileId || 'abm'];
  const rates = refCohort?.conversionOverrides
    ? { ...profile.conversionRates, ...refCohort.conversionOverrides }
    : profile.conversionRates;

  return {
    revenueGoal: inputs.goals.arrGoal,
    asp: inputs.goals.averageSellingPrice,
    accounts: totalAccounts,
    totalBudget,
    accountToLead: rates.accountToLead,
    leadToMQL: rates.leadToMQL,
    mqlToOpp: rates.mqlToOpp,
    oppToClose: rates.oppToClose,
    blendedCPL: inputs.budget.blendedCPL,
    timeHorizonQuarters: inputs.simulationQuarters,
    monthlyFrequency: inputs.budget.frequencyConfig.monthlyFrequency,
    costPerTouch: inputs.budget.frequencyConfig.costPerTouch,
    softwareCostPerQuarter: inputs.budget.softwareCostPerQuarter,
  };
}

/** Map solver values back into a CalculatorInputs structure */
function solverValuesToInputs(solverValues: SolverValues, baseInputs: CalculatorInputs): CalculatorInputs {
  const isMultiCohort = baseInputs.cohorts.length > 1;

  let cohorts: typeof baseInputs.cohorts;
  if (isMultiCohort) {
    // Multi-cohort: preserve each cohort's own rates and accounts — don't overwrite
    cohorts = baseInputs.cohorts;
  } else {
    // Single cohort: solver rates/accounts apply directly
    const currentTotal = baseInputs.cohorts.reduce((s, c) => s + c.totalAccounts, 0);
    const targetTotal = Math.max(1, Math.round(solverValues.accounts));
    const rawCohorts = baseInputs.cohorts.map(c => ({
      ...c,
      totalAccounts: currentTotal > 0
        ? Math.max(1, Math.round(targetTotal * (c.totalAccounts / currentTotal)))
        : Math.round(targetTotal / baseInputs.cohorts.length),
      accountsOverridden: true,
      conversionOverrides: {
        accountToLead: solverValues.accountToLead,
        leadToMQL: solverValues.leadToMQL,
        mqlToOpp: solverValues.mqlToOpp,
        oppToClose: solverValues.oppToClose,
      },
    }));
    const roundedTotal = rawCohorts.reduce((s, c) => s + c.totalAccounts, 0);
    const drift = targetTotal - roundedTotal;
    if (drift !== 0 && rawCohorts.length > 0) {
      const largest = rawCohorts.reduce((max, c, i) => c.totalAccounts > rawCohorts[max].totalAccounts ? i : max, 0);
      rawCohorts[largest].totalAccounts = Math.max(1, rawCohorts[largest].totalAccounts + drift);
    }
    cohorts = rawCohorts;
  }

  return {
    ...baseInputs,
    goals: {
      ...baseInputs.goals,
      arrGoal: solverValues.revenueGoal,
      averageSellingPrice: solverValues.asp,
    },
    cohorts,
    budget: {
      ...baseInputs.budget,
      blendedCPL: solverValues.blendedCPL,
      softwareCostPerQuarter: solverValues.softwareCostPerQuarter,
      frequencyConfig: {
        ...baseInputs.budget.frequencyConfig,
        monthlyFrequency: solverValues.monthlyFrequency,
        costPerTouch: solverValues.costPerTouch,
      },
    },
    simulationQuarters: solverValues.timeHorizonQuarters,
  };
}

// --- Helpers ---

function recalculate(rawInputs: CalculatorInputs): { inputs: CalculatorInputs; outputs: CalculatorOutputs; validations: ValidationResult[] } {
  const inputs = applyGoalDrivenAccounts(rawInputs);
  return { inputs, outputs: calculate(inputs), validations: validate(inputs) };
}

/** Recalculate without goal-driven account override (solver already set accounts) */
function recalculateFromSolver(rawInputs: CalculatorInputs): { inputs: CalculatorInputs; outputs: CalculatorOutputs; validations: ValidationResult[] } {
  return { inputs: rawInputs, outputs: calculate(rawInputs), validations: validate(rawInputs) };
}

/** Run solver and recalculate simulation from result */
function runSolverAndRecalculate(
  currentValues: SolverValues,
  locks: LockState,
  changedVariable: SolverVariableId,
  newValue: number,
  baseInputs: CalculatorInputs,
): { solverResult: SolverResult; inputs: CalculatorInputs; outputs: CalculatorOutputs; validations: ValidationResult[] } {
  const coldCohort = baseInputs.cohorts.find(c => CAMPAIGN_PROFILES[c.profileId].category === 'cold');
  const profileId = coldCohort?.profileId || baseInputs.cohorts[0]?.profileId || 'abm';
  const solverResult = solve(
    currentValues,
    locks,
    changedVariable,
    newValue,
    profileId,
    baseInputs.advanced,
    baseInputs.budget.inHouseCreative,
    baseInputs.budget.agencyPercent,
    baseInputs.budget.frequencyConfig.tierMultipliers,
  );

  const rawInputs = solverValuesToInputs(solverResult.values, baseInputs);
  const { inputs, outputs, validations } = recalculateFromSolver(rawInputs);

  return { solverResult, inputs, outputs, validations };
}

/** Sync solver values from current inputs/outputs after a legacy action */
function syncSolverFromInputs(state: CalculatorState): CalculatorState {
  const totalBudget = state.outputs.summary.totalInvestment || state.solver.values.totalBudget;
  const newValues = inputsToSolverValues(state.inputs, totalBudget);
  return {
    ...state,
    solver: { ...state.solver, values: newValues },
  };
}

// --- Reducer ---

function reducer(state: CalculatorState, action: Action): CalculatorState {
  switch (action.type) {
    // === Solver actions ===
    case 'SET_SOLVER_VALUE': {
      const { solverResult, inputs, outputs, validations } = runSolverAndRecalculate(
        state.solver.values,
        state.solver.locks,
        action.variable,
        action.value,
        state.inputs,
      );
      return {
        ...state,
        solver: { ...state.solver, values: solverResult.values, result: solverResult, activePresetId: null },
        inputs,
        outputs,
        validations,
      };
    }

    case 'TOGGLE_LOCK': {
      const newLocks = { ...state.solver.locks, [action.variable]: !state.solver.locks[action.variable] };
      const { solverResult, inputs, outputs, validations } = runSolverAndRecalculate(
        state.solver.values,
        newLocks,
        action.variable,
        state.solver.values[action.variable],
        state.inputs,
      );
      return {
        ...state,
        solver: { ...state.solver, values: solverResult.values, locks: newLocks, result: solverResult, activePresetId: null },
        inputs,
        outputs,
        validations,
      };
    }

    case 'SET_LOCK_PRESET': {
      const preset = LOCK_PRESETS.find(p => p.id === action.presetId);
      if (!preset) return state;
      const newLocks = { ...preset.locks };
      const firstUnlocked = (Object.keys(newLocks) as SolverVariableId[]).find(v => !newLocks[v]) || 'accounts';
      const { solverResult, inputs, outputs, validations } = runSolverAndRecalculate(
        state.solver.values,
        newLocks,
        firstUnlocked,
        state.solver.values[firstUnlocked],
        state.inputs,
      );
      return {
        ...state,
        solver: { ...state.solver, values: solverResult.values, locks: newLocks, result: solverResult, activePresetId: action.presetId },
        inputs,
        outputs,
        validations,
      };
    }

    // === Input actions (used by CohortBuilder, AdvancedSection, etc.) ===
    case 'SET_GOALS': {
      const rawInputs = { ...state.inputs, goals: { ...state.inputs.goals, ...action.payload } };
      return syncSolverFromInputs({ ...state, ...recalculate(rawInputs) });
    }

    case 'ASP_CHANGED': {
      const scaling = interpolateASPScaling(action.newASP);
      const goals = { ...state.inputs.goals, averageSellingPrice: action.newASP };
      let budget = { ...state.inputs.budget };
      let advanced = { ...state.inputs.advanced };
      const adjustedFields: string[] = [];
      const preservedFields: string[] = [];

      if (!state.inputs.userOverrides?.blendedCPL) {
        budget = { ...budget, blendedCPL: scaling.suggestedCPL };
        adjustedFields.push('CPL');
      } else {
        preservedFields.push('CPL');
      }

      if (!state.inputs.userOverrides?.salesVelocityDays) {
        advanced = { ...advanced, salesVelocityDays: scaling.salesVelocityDays };
        adjustedFields.push('Sales Velocity');
      } else {
        preservedFields.push('Sales Velocity');
      }

      adjustedFields.push('Conversion Rates');

      const rawInputs = { ...state.inputs, goals, budget, advanced };
      const result = recalculate(rawInputs);
      return syncSolverFromInputs({
        ...state,
        ...result,
        ui: {
          ...state.ui,
          aspNotification: {
            bandLabel: scaling.bandLabel,
            timestamp: Date.now(),
            adjustedFields,
            preservedFields,
            scalingResult: scaling,
          },
        },
      });
    }

    case 'DISMISS_ASP_NOTIFICATION':
      return { ...state, ui: { ...state.ui, aspNotification: null } };

    case 'SET_COHORT': {
      const cohorts = state.inputs.cohorts.map(c => {
        if (c.id !== action.cohortId) return c;
        const updated = { ...c, ...action.payload };
        // When user manually changes totalAccounts or conversion overrides,
        // lock accounts so goal-driven sizing doesn't counteract the change
        if ('totalAccounts' in action.payload && !('accountsOverridden' in action.payload)) {
          updated.accountsOverridden = true;
        }
        if ('conversionOverrides' in action.payload && !updated.accountsOverridden) {
          updated.accountsOverridden = true;
        }
        return updated;
      });
      const rawInputs = { ...state.inputs, cohorts };
      return syncSolverFromInputs({ ...state, ...recalculate(rawInputs) });
    }

    case 'ADD_COHORT': {
      if (state.inputs.cohorts.length >= 8) return state;
      const nextNum = state.inputs.cohorts.length + 1;
      const newCohort: CohortDefinition = {
        id: `cohort-${Date.now()}`,
        name: `Cohort ${nextNum}`,
        profileId: 'abm',
        totalAccounts: 0,
        startQuarter: state.inputs.cohorts.length,
      };
      const rawInputs = { ...state.inputs, cohorts: [...state.inputs.cohorts, newCohort] };
      return syncSolverFromInputs({ ...state, ...recalculate(rawInputs) });
    }

    case 'REMOVE_COHORT': {
      if (state.inputs.cohorts.length <= 1) return state;
      const cohorts = state.inputs.cohorts.filter(c => c.id !== action.cohortId);
      const rawInputs = { ...state.inputs, cohorts };
      return syncSolverFromInputs({ ...state, ...recalculate(rawInputs) });
    }

    case 'SET_COHORT_PROFILE': {
      const cohorts = state.inputs.cohorts.map(c =>
        c.id === action.cohortId
          ? { ...c, profileId: action.profileId, conversionOverrides: undefined, velocityOverrides: undefined }
          : c
      );
      const rawInputs = { ...state.inputs, cohorts };
      return syncSolverFromInputs({ ...state, ...recalculate(rawInputs) });
    }

    case 'SET_BUDGET': {
      const userOverrides = { ...state.inputs.userOverrides };
      if ('blendedCPL' in action.payload) {
        userOverrides.blendedCPL = true;
      }
      const rawInputs = {
        ...state.inputs,
        budget: { ...state.inputs.budget, ...action.payload },
        userOverrides,
      };
      return syncSolverFromInputs({ ...state, ...recalculate(rawInputs) });
    }

    case 'SET_FREQUENCY': {
      const frequencyConfig = { ...state.inputs.budget.frequencyConfig, ...action.payload };
      const rawInputs = { ...state.inputs, budget: { ...state.inputs.budget, frequencyConfig } };
      return syncSolverFromInputs({ ...state, ...recalculate(rawInputs) });
    }

    case 'SET_ADVANCED': {
      const userOverrides = { ...state.inputs.userOverrides };
      if ('salesVelocityDays' in action.payload) {
        userOverrides.salesVelocityDays = true;
      }
      const rawInputs = {
        ...state.inputs,
        advanced: { ...state.inputs.advanced, ...action.payload },
        userOverrides,
      };
      return syncSolverFromInputs({ ...state, ...recalculate(rawInputs) });
    }

    case 'SET_SIMULATION_QUARTERS': {
      const rawInputs = { ...state.inputs, simulationQuarters: action.value };
      return syncSolverFromInputs({ ...state, ...recalculate(rawInputs) });
    }

    // === UI ===
    case 'SET_TAB':
      return { ...state, ui: { ...state.ui, activeTab: action.tab } };

    case 'TOGGLE_SECTION': {
      const expanded = state.ui.expandedSections.includes(action.section)
        ? state.ui.expandedSections.filter(s => s !== action.section)
        : [...state.ui.expandedSections, action.section];
      return { ...state, ui: { ...state.ui, expandedSections: expanded } };
    }

    // === Scenarios ===
    case 'SAVE_SCENARIO': {
      const now = Date.now();
      const scenario: Scenario = {
        id: `scenario-${now}`,
        name: action.name,
        inputs: JSON.parse(JSON.stringify(state.inputs)),
        solverValues: JSON.parse(JSON.stringify(state.solver.values)),
        solverLocks: JSON.parse(JSON.stringify(state.solver.locks)),
        createdAt: now,
        updatedAt: now,
      };
      const scenarios = [...state.scenarios, scenario];
      saveScenarios(scenarios);
      return { ...state, scenarios, activeScenarioId: scenario.id };
    }

    case 'LOAD_SCENARIO': {
      const scenario = state.scenarios.find(s => s.id === action.scenarioId);
      if (!scenario) return state;

      const rawInputs = JSON.parse(JSON.stringify(scenario.inputs));
      if (!rawInputs.userOverrides) rawInputs.userOverrides = {};
      if (rawInputs.advanced.quarterlyOnboardingCap == null) rawInputs.advanced.quarterlyOnboardingCap = 750;

      // If scenario has solver state, restore it
      if (scenario.solverValues && scenario.solverLocks) {
        const locks = JSON.parse(JSON.stringify(scenario.solverLocks));
        const values = JSON.parse(JSON.stringify(scenario.solverValues));

        const firstUnlocked = (Object.keys(locks) as SolverVariableId[]).find(v => !locks[v]) || 'accounts';
        const solverResult = solve(
          values,
          locks,
          firstUnlocked,
          values[firstUnlocked],
          rawInputs.cohorts[0]?.profileId || 'abm',
          rawInputs.advanced,
          rawInputs.budget.inHouseCreative,
          rawInputs.budget.agencyPercent,
          rawInputs.budget.frequencyConfig.tierMultipliers,
        );

        const bridgedInputs = solverValuesToInputs(solverResult.values, rawInputs);
        const { inputs, outputs, validations } = recalculateFromSolver(bridgedInputs);

        return {
          ...state,
          solver: { values: solverResult.values, locks, result: solverResult, activePresetId: null },
          inputs,
          outputs,
          validations,
          activeScenarioId: scenario.id,
        };
      }

      // Legacy scenario (no solver state) — load via old path and sync
      const result = recalculate(rawInputs);
      return syncSolverFromInputs({ ...state, ...result, activeScenarioId: scenario.id });
    }

    case 'DELETE_SCENARIO': {
      const scenarios = state.scenarios.filter(s => s.id !== action.scenarioId);
      saveScenarios(scenarios);
      return { ...state, scenarios };
    }

    case 'RENAME_SCENARIO': {
      const scenarios = state.scenarios.map(s =>
        s.id === action.scenarioId ? { ...s, name: action.name, updatedAt: Date.now() } : s
      );
      saveScenarios(scenarios);
      return { ...state, scenarios };
    }

    case 'TOGGLE_COMPARE':
      return { ...state, ui: { ...state.ui, showCompare: !state.ui.showCompare } };

    case 'SET_COMPARE_SCENARIOS':
      return { ...state, ui: { ...state.ui, compareScenarioIds: action.ids } };

    case 'SHOW_EMAIL_CAPTURE':
      return { ...state, ui: { ...state.ui, showEmailCapture: true } };

    case 'HIDE_EMAIL_CAPTURE':
      return { ...state, ui: { ...state.ui, showEmailCapture: false } };

    case 'DISMISS_FIRST_VISIT':
      return { ...state, ui: { ...state.ui, isFirstVisit: false } };

    case 'SHOW_WIZARD':
      return { ...state, ui: { ...state.ui, showWizard: true } };

    case 'HIDE_WIZARD':
      return { ...state, ui: { ...state.ui, showWizard: false, isFirstVisit: false } };

    default:
      return state;
  }
}

// --- Context ---

interface CalculatorContextValue {
  state: CalculatorState;
  dispatch: React.Dispatch<Action>;
}

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

export function useCalculator() {
  const ctx = useContext(CalculatorContext);
  if (!ctx) throw new Error('useCalculator must be used within CalculatorProvider');
  return ctx;
}

// --- Provider ---

function createInitialState(): CalculatorState {
  const defaultInputs = createDefaultInputs();
  const scenarios = loadScenarios();

  // Compute initial outputs
  const { inputs, outputs, validations } = recalculate(defaultInputs);

  // Initialize solver values from computed inputs
  const solverValues = inputsToSolverValues(inputs, outputs.summary.totalInvestment);
  const locks = { ...DEFAULT_LOCK_STATE };

  // Run solver once to get initial result (for squeeze analysis, feasibility)
  const solverResult = solve(
    solverValues,
    locks,
    'revenueGoal',
    solverValues.revenueGoal,
    (inputs.cohorts.find(c => CAMPAIGN_PROFILES[c.profileId].category === 'cold') || inputs.cohorts[0])?.profileId || 'abm',
    inputs.advanced,
    inputs.budget.inHouseCreative,
    inputs.budget.agencyPercent,
    inputs.budget.frequencyConfig.tierMultipliers,
  );

  let isFirstVisit = true;
  try {
    isFirstVisit = !localStorage.getItem('strategnik_calc_visited');
  } catch {}

  return {
    solver: {
      values: solverValues,
      locks,
      result: solverResult,
      activePresetId: 'forward',
    },
    inputs,
    outputs,
    validations,
    scenarios,
    activeScenarioId: '',
    ui: {
      activeTab: 'timeline',
      expandedSections: ['goals'],
      showCompare: false,
      showEmailCapture: false,
      compareScenarioIds: [],
      isFirstVisit,
      showWizard: isFirstVisit,
      aspNotification: null,
    },
  };
}

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);

  // Persist wizard dismissal outside the reducer (reducers must be pure)
  useEffect(() => {
    if (!state.ui.showWizard && !state.ui.isFirstVisit) {
      try { localStorage.setItem('strategnik_calc_visited', '1'); } catch {}
    }
  }, [state.ui.showWizard, state.ui.isFirstVisit]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <CalculatorContext.Provider value={value}>
      {children}
    </CalculatorContext.Provider>
  );
}
