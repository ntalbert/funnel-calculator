/** The 13 solver variables that can be locked/unlocked */
export type SolverVariableId =
  | 'revenueGoal'
  | 'totalBudget'
  | 'asp'
  | 'accounts'
  | 'accountToLead'
  | 'leadToMQL'
  | 'mqlToOpp'
  | 'oppToClose'
  | 'blendedCPL'
  | 'timeHorizonQuarters'
  | 'monthlyFrequency'
  | 'costPerTouch'
  | 'softwareCostPerQuarter';

/** Lock state for every solver variable. true = locked (user-set), false = unlocked (solver-computed) */
export type LockState = Record<SolverVariableId, boolean>;

/** Current values of all solver variables */
export type SolverValues = Record<SolverVariableId, number>;

/** Result of attempting to solve the system */
export interface SolverResult {
  values: SolverValues;
  feasibility: 'solved' | 'overconstrained' | 'underconstrained';
  warnings: SolverWarning[];
  /** Variables that hit their min/max bounds during solve */
  boundedVariables: SolverVariableId[];
  /** Squeeze analysis when constraints conflict */
  squeezeAnalysis: SqueezeAnalysis | null;
}

export interface SolverWarning {
  variable: SolverVariableId;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface SqueezeAnalysis {
  tension: 'budget-too-low' | 'revenue-too-high' | 'rates-maxed' | 'accounts-excessive';
  message: string;
  requiredBudget?: number;
  suggestion: string;
}

/** Named lock presets */
export interface LockPreset {
  id: string;
  label: string;
  locks: LockState;
}
