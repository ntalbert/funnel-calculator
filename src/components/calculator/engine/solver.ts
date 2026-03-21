import type { SolverVariableId, SolverValues, LockState, SolverResult, SolverWarning, SqueezeAnalysis } from './solver-types';
import type { CampaignProfileId, AdvancedConfig, BudgetConfig, FrequencyConfig } from './types';
import { SOLVER_BOUNDS, clampToSolverBounds } from './solver-bounds';
import { estimateBudgetForAccounts } from './cost-helpers';
import { CAMPAIGN_PROFILES } from './defaults';
import { frequencyConversionBoost } from './frequency-boost';

/**
 * Constraint-based funnel solver.
 *
 * Given current values and lock states, when a variable changes,
 * recompute all unlocked variables to satisfy the system of equations.
 *
 * Core equations:
 *   deals = revenueGoal / asp
 *   dealsPerQ = deals / timeHorizonQuarters
 *   oppsPerQ = dealsPerQ / oppToClose
 *   mqlsPerQ = oppsPerQ / mqlToOpp
 *   leadsPerQ = mqlsPerQ / leadToMQL
 *   accounts = leadsPerQ / (accountToLead * avgVelocityWeight)
 *   totalBudget = f(accounts, CPL, frequency, costPerTouch, software, quarters)
 */
export function solve(
  currentValues: SolverValues,
  lockState: LockState,
  changedVariable: SolverVariableId,
  newValue: number,
  profileId: CampaignProfileId,
  advancedConfig: AdvancedConfig,
  inHouseCreative: boolean,
  agencyPercent: number,
  tierMultipliers?: FrequencyConfig['tierMultipliers'],
): SolverResult {
  // Start with current values, apply the change
  const values: SolverValues = { ...currentValues };
  values[changedVariable] = newValue;

  const warnings: SolverWarning[] = [];
  const boundedVariables: SolverVariableId[] = [];

  // Average velocity weight across first 4 quarters (simplified for solver)
  const AVG_VELOCITY_WEIGHT = 0.25; // accounts produce leads over ~4 quarters

  // Frequency-to-conversion coupling
  const baselineFrequency = CAMPAIGN_PROFILES[profileId].defaultFrequency;
  const freqBoost = frequencyConversionBoost(values.monthlyFrequency, baselineFrequency);

  // --- Solve the funnel chain ---
  // The chain: revenueGoal → asp → deals → oppToClose → opps → mqlToOpp → mqls → leadToMQL → leads → accountToLead → accounts
  // We solve by propagating from locked values toward unlocked ones.

  const funnelChain: SolverVariableId[] = [
    'revenueGoal', 'asp', 'oppToClose', 'mqlToOpp', 'leadToMQL', 'accountToLead', 'accounts',
  ];
  const unlockedFunnel = funnelChain.filter(v => !lockState[v]);

  // Intermediate computed values (quarterly rates)
  function computeFunnelDown(v: SolverValues): {
    deals: number; dealsPerQ: number; oppsPerQ: number;
    mqlsPerQ: number; leadsPerQ: number; requiredAccounts: number;
  } {
    const deals = v.asp > 0 ? v.revenueGoal / v.asp : 0;
    const dealsPerQ = v.timeHorizonQuarters > 0 ? deals / v.timeHorizonQuarters : 0;
    const oppsPerQ = v.oppToClose > 0 ? dealsPerQ / v.oppToClose : 0;
    const effectiveMqlToOpp = Math.min(0.50, v.mqlToOpp * freqBoost);
    const effectiveLeadToMQL = Math.min(0.85, v.leadToMQL * freqBoost);
    const mqlsPerQ = effectiveMqlToOpp > 0 ? oppsPerQ / effectiveMqlToOpp : 0;
    const leadsPerQ = effectiveLeadToMQL > 0 ? mqlsPerQ / effectiveLeadToMQL : 0;
    const requiredAccounts = v.accountToLead > 0
      ? leadsPerQ / (v.accountToLead * AVG_VELOCITY_WEIGHT)
      : 0;
    return { deals, dealsPerQ, oppsPerQ, mqlsPerQ, leadsPerQ, requiredAccounts };
  }

  function computeFunnelUp(v: SolverValues): {
    leadsPerQ: number; mqlsPerQ: number; oppsPerQ: number;
    dealsPerQ: number; deals: number; achievableRevenue: number;
  } {
    const leadsPerQ = v.accounts * v.accountToLead * AVG_VELOCITY_WEIGHT;
    const effectiveLeadToMQL = Math.min(0.85, v.leadToMQL * freqBoost);
    const effectiveMqlToOpp = Math.min(0.50, v.mqlToOpp * freqBoost);
    const mqlsPerQ = leadsPerQ * effectiveLeadToMQL;
    const oppsPerQ = mqlsPerQ * effectiveMqlToOpp;
    const dealsPerQ = oppsPerQ * v.oppToClose;
    const deals = dealsPerQ * v.timeHorizonQuarters;
    const achievableRevenue = deals * v.asp;
    return { leadsPerQ, mqlsPerQ, oppsPerQ, dealsPerQ, deals, achievableRevenue };
  }

  // Determine solve direction based on what's locked
  const revenueAndAspLocked = lockState.revenueGoal && lockState.asp;
  const accountsLocked = lockState.accounts;

  if (revenueAndAspLocked && !accountsLocked) {
    // Standard top-down: revenue is fixed, compute required accounts
    const funnel = computeFunnelDown(values);
    if (!lockState.accounts) {
      values.accounts = funnel.requiredAccounts;
    }
  } else if (accountsLocked && !lockState.revenueGoal) {
    // Bottom-up: accounts are fixed, compute achievable revenue
    const funnel = computeFunnelUp(values);
    values.revenueGoal = funnel.achievableRevenue;
  } else if (accountsLocked && lockState.revenueGoal) {
    // Both accounts and revenue locked — need to solve for rates
    // Find the end-to-end conversion rate needed
    const deals = values.asp > 0 ? values.revenueGoal / values.asp : 0;
    const dealsPerQ = values.timeHorizonQuarters > 0 ? deals / values.timeHorizonQuarters : 0;
    const leadsPerQ = values.accounts * AVG_VELOCITY_WEIGHT;

    if (leadsPerQ > 0 && dealsPerQ > 0) {
      const requiredEndToEnd = dealsPerQ / leadsPerQ;
      // The simulation multiplies leadToMQL and mqlToOpp by freqBoost,
      // so base rates only need to produce: requiredEndToEnd / freqBoost^2
      const adjustedEndToEnd = freqBoost > 0
        ? requiredEndToEnd / (freqBoost * freqBoost)
        : requiredEndToEnd;
      distributeRates(values, lockState, adjustedEndToEnd, boundedVariables);
    }
  }

  // --- Solve the cost equation ---
  const tiers = tierMultipliers || { new: 1.0, inProgress: 1.5, pastLead: 2.0 };
  const budgetConfig = buildBudgetConfig(values, inHouseCreative, agencyPercent, tiers);

  const onboardingCap = advancedConfig.quarterlyOnboardingCap;

  if (!lockState.totalBudget) {
    // Budget is unlocked: compute it from accounts + cost params
    values.totalBudget = estimateBudgetForAccounts(
      Math.round(values.accounts),
      profileId,
      budgetConfig,
      values.timeHorizonQuarters,
      advancedConfig.quarterlyDropoutRate,
      onboardingCap,
    );
  } else if (lockState.totalBudget && !lockState.accounts) {
    // Budget locked, accounts unlocked: bisection to find accounts that fit budget
    const budgetAccounts = solveAccountsFromBudget(
      values.totalBudget,
      profileId,
      budgetConfig,
      values.timeHorizonQuarters,
      advancedConfig.quarterlyDropoutRate,
      onboardingCap,
    );

    // Check if this conflicts with funnel-derived accounts
    if (revenueAndAspLocked) {
      // Revenue and budget both locked — use budget-constrained accounts
      // and adjust rates to make the funnel work
      const funnelNeeded = computeFunnelDown(values).requiredAccounts;
      if (budgetAccounts < funnelNeeded * 0.95) {
        // Budget can't afford enough accounts, need to improve rates
        values.accounts = budgetAccounts;
        const funnel = computeFunnelUp({ ...values, accounts: budgetAccounts });
        if (funnel.achievableRevenue < values.revenueGoal) {
          // Adjust unlocked rates upward to close the gap
          const deals = values.revenueGoal / values.asp;
          const dealsPerQ = deals / values.timeHorizonQuarters;
          const leadsPerQ = budgetAccounts * AVG_VELOCITY_WEIGHT;
          if (leadsPerQ > 0) {
            const requiredEndToEnd = dealsPerQ / leadsPerQ;
            const adjustedEndToEnd = freqBoost > 0
              ? requiredEndToEnd / (freqBoost * freqBoost)
              : requiredEndToEnd;
            distributeRates(values, lockState, adjustedEndToEnd, boundedVariables);
          }
        }
      } else {
        values.accounts = Math.min(budgetAccounts, funnelNeeded);
      }
    } else {
      values.accounts = budgetAccounts;
    }
  } else if (lockState.totalBudget && lockState.accounts) {
    // Both locked — back-solve an unlocked cost variable if possible
    backSolveCostVariable(values, lockState, profileId, advancedConfig.quarterlyDropoutRate, inHouseCreative, agencyPercent, tiers, boundedVariables, onboardingCap);
  }

  // --- Clamp all values to bounds ---
  for (const key of Object.keys(values) as SolverVariableId[]) {
    if (!lockState[key]) {
      const clamped = clampToSolverBounds(key, values[key]);
      if (clamped !== values[key]) {
        boundedVariables.push(key);
        values[key] = clamped;
      }
    }
  }

  // --- Detect squeeze / tension ---
  // --- Onboarding overflow check ---
  if (onboardingCap < values.accounts) {
    const quartersNeeded = Math.ceil(values.accounts / onboardingCap);
    if (quartersNeeded > values.timeHorizonQuarters) {
      const activatable = onboardingCap * values.timeHorizonQuarters;
      warnings.push({
        variable: 'accounts',
        message: `Only ${activatable.toLocaleString()} of ${Math.round(values.accounts).toLocaleString()} accounts can be activated in ${values.timeHorizonQuarters} quarters at ${onboardingCap}/qtr`,
        severity: 'warning',
      });
    }
  }

  const squeezeAnalysis = detectSqueeze(values, lockState, boundedVariables, profileId, budgetConfig, advancedConfig.quarterlyDropoutRate, onboardingCap);

  // --- Generate warnings ---
  if (boundedVariables.length > 0) {
    for (const v of boundedVariables) {
      const bounds = SOLVER_BOUNDS[v];
      const atMax = values[v] >= bounds.max * 0.99;
      warnings.push({
        variable: v,
        message: `${v} hit its ${atMax ? 'maximum' : 'minimum'} bound (${atMax ? bounds.max : bounds.min})`,
        severity: 'warning',
      });
    }
  }

  const feasibility = boundedVariables.length > 0
    ? 'overconstrained'
    : unlockedFunnel.length === 0
      ? 'overconstrained'
      : 'solved';

  return { values, feasibility, warnings, boundedVariables, squeezeAnalysis };
}

/**
 * Distribute a required end-to-end conversion rate across unlocked rate variables.
 * Uses proportional scaling from current values.
 */
function distributeRates(
  values: SolverValues,
  locks: LockState,
  requiredEndToEnd: number,
  boundedVariables: SolverVariableId[],
): void {
  const rateVars: SolverVariableId[] = ['accountToLead', 'leadToMQL', 'mqlToOpp', 'oppToClose'];
  const unlockedRates = rateVars.filter(v => !locks[v]);

  if (unlockedRates.length === 0) return;

  // Current end-to-end rate from locked rates
  const lockedProduct = rateVars
    .filter(v => locks[v])
    .reduce((p, v) => p * values[v], 1);

  // Required product from unlocked rates
  const neededFromUnlocked = lockedProduct > 0 ? requiredEndToEnd / lockedProduct : requiredEndToEnd;

  // Current product of unlocked rates
  const currentUnlockedProduct = unlockedRates.reduce((p, v) => p * values[v], 1);

  if (currentUnlockedProduct <= 0 || neededFromUnlocked <= 0) return;

  // Scale factor to apply evenly (nth root where n = number of unlocked rates)
  const scaleFactor = Math.pow(neededFromUnlocked / currentUnlockedProduct, 1 / unlockedRates.length);

  for (const v of unlockedRates) {
    const newVal = values[v] * scaleFactor;
    const clamped = clampToSolverBounds(v, newVal);
    if (clamped !== newVal) boundedVariables.push(v);
    values[v] = clamped;
  }
}

/**
 * Bisection search: find number of accounts where estimated budget = target budget.
 * estimateBudgetForAccounts is monotonically increasing in accounts.
 */
function solveAccountsFromBudget(
  targetBudget: number,
  profileId: CampaignProfileId,
  budgetConfig: BudgetConfig,
  quarters: number,
  dropoutRate: number,
  onboardingCap: number,
): number {
  let lo = SOLVER_BOUNDS.accounts.min;
  let hi = SOLVER_BOUNDS.accounts.max;

  for (let i = 0; i < 30; i++) {
    const mid = Math.round((lo + hi) / 2);
    const est = estimateBudgetForAccounts(mid, profileId, budgetConfig, quarters, dropoutRate, onboardingCap);
    if (est < targetBudget) {
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo <= 1) break;
  }

  return lo;
}

/**
 * When both totalBudget and accounts are locked, try to back-solve
 * an unlocked cost variable to make the budget equation balance.
 */
function backSolveCostVariable(
  values: SolverValues,
  locks: LockState,
  profileId: CampaignProfileId,
  dropoutRate: number,
  inHouseCreative: boolean,
  agencyPercent: number,
  tierMultipliers: FrequencyConfig['tierMultipliers'],
  boundedVariables: SolverVariableId[],
  onboardingCap: number,
): void {
  // Priority order for back-solving
  const costPriority: SolverVariableId[] = [
    'blendedCPL', 'costPerTouch', 'monthlyFrequency', 'softwareCostPerQuarter',
  ];
  const target = costPriority.find(v => !locks[v]);
  if (!target) return; // All cost vars locked — overconstrained

  // Binary search on the target variable to match budget
  const bounds = SOLVER_BOUNDS[target];
  let lo = bounds.min;
  let hi = bounds.max;

  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const testValues = { ...values, [target]: mid };
    const budgetConfig = buildBudgetConfig(testValues, inHouseCreative, agencyPercent, tierMultipliers);
    const est = estimateBudgetForAccounts(
      Math.round(testValues.accounts), profileId, budgetConfig,
      testValues.timeHorizonQuarters, dropoutRate, onboardingCap,
    );

    if (est < values.totalBudget) {
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < 0.01) break;
  }

  const solved = (lo + hi) / 2;
  const clamped = clampToSolverBounds(target, solved);
  if (Math.abs(clamped - solved) > 0.01) boundedVariables.push(target);
  values[target] = clamped;
}

/**
 * Build a BudgetConfig from solver values for use with estimateBudgetForAccounts.
 */
function buildBudgetConfig(
  values: SolverValues,
  inHouseCreative: boolean,
  agencyPercent: number,
  tierMultipliers: FrequencyConfig['tierMultipliers'],
): BudgetConfig {
  return {
    blendedCPL: values.blendedCPL,
    softwareCostPerQuarter: values.softwareCostPerQuarter,
    agencyPercent,
    inHouseCreative,
    frequencyConfig: {
      monthlyFrequency: values.monthlyFrequency,
      costPerTouch: values.costPerTouch,
      tierMultipliers,
    },
  };
}

/**
 * Detect constraint tension and generate squeeze analysis.
 */
function detectSqueeze(
  values: SolverValues,
  locks: LockState,
  boundedVariables: SolverVariableId[],
  profileId: CampaignProfileId,
  budgetConfig: BudgetConfig,
  dropoutRate: number,
  onboardingCap: number,
): SqueezeAnalysis | null {
  if (boundedVariables.length === 0) return null;

  const ratesBounded = boundedVariables.filter(v =>
    ['accountToLead', 'leadToMQL', 'mqlToOpp', 'oppToClose'].includes(v),
  );

  // Check if budget is the constraint
  if (locks.totalBudget && locks.revenueGoal && ratesBounded.length > 0) {
    const requiredBudget = estimateBudgetForAccounts(
      Math.round(values.accounts), profileId, budgetConfig,
      values.timeHorizonQuarters, dropoutRate, onboardingCap,
    );

    if (requiredBudget > values.totalBudget * 1.1) {
      return {
        tension: 'budget-too-low',
        message: `To reach $${fmtCurrency(values.revenueGoal)} with the current rates, you'd need a budget of $${fmtCurrency(requiredBudget)}, but it's locked at $${fmtCurrency(values.totalBudget)}.`,
        requiredBudget,
        suggestion: 'Unlock the budget, lower the revenue goal, or accept the extreme conversion rates shown.',
      };
    }
  }

  if (ratesBounded.length > 0) {
    const maxedRates = ratesBounded.map(v => v.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ');
    return {
      tension: 'rates-maxed',
      message: `Conversion rates (${maxedRates}) have hit their maximum bounds. The system cannot achieve the locked constraints with realistic rates.`,
      suggestion: 'Unlock some rates, increase the budget, lower the revenue goal, or extend the time horizon.',
    };
  }

  if (boundedVariables.includes('accounts')) {
    return {
      tension: 'accounts-excessive',
      message: `The target account list (${values.accounts.toLocaleString()}) has hit its maximum. This many accounts may not be realistic for your market.`,
      suggestion: 'Improve conversion rates, increase budget per account, or lower the revenue goal.',
    };
  }

  return null;
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return Math.round(n).toLocaleString();
}
