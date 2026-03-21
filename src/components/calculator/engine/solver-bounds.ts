import type { SolverVariableId } from './solver-types';

export const SOLVER_BOUNDS: Record<SolverVariableId, { min: number; max: number }> = {
  revenueGoal:            { min: 100_000,   max: 100_000_000 },
  totalBudget:            { min: 50_000,    max: 50_000_000 },
  asp:                    { min: 10_000,    max: 1_000_000 },
  accounts:               { min: 1,         max: 100_000 },
  accountToLead:          { min: 0.03,      max: 1.00 },
  leadToMQL:              { min: 0.20,      max: 1.00 },
  mqlToOpp:               { min: 0.08,      max: 1.00 },
  oppToClose:             { min: 0.05,      max: 0.60 },
  blendedCPL:             { min: 250,       max: 2_000 },
  timeHorizonQuarters:    { min: 4,         max: 16 },
  monthlyFrequency:       { min: 1,         max: 25 },
  costPerTouch:           { min: 0.50,      max: 25 },
  softwareCostPerQuarter: { min: 0,         max: 200_000 },
};

export function clampToSolverBounds(variable: SolverVariableId, value: number): number {
  const { min, max } = SOLVER_BOUNDS[variable];
  return Math.max(min, Math.min(max, value));
}
