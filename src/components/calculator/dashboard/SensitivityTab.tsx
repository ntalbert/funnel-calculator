import { useMemo } from 'react';
import { useCalculator } from '../state/context';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { solve } from '../engine/solver';
import { formatPercent, formatNum, formatCurrency } from '../shared/formatters';
import type { SolverVariableId } from '../engine/solver-types';
import { SOLVER_BOUNDS } from '../engine/solver-bounds';

const RATE_VARIABLES: { id: SolverVariableId; label: string }[] = [
  { id: 'accountToLead', label: 'Account \u2192 Lead' },
  { id: 'leadToMQL', label: 'Lead \u2192 MQL' },
  { id: 'mqlToOpp', label: 'MQL \u2192 Opportunity' },
  { id: 'oppToClose', label: 'Opp \u2192 Close' },
];

const IMPROVEMENTS = [0.10, 0.20, 0.30, 0.50];

function getFeasibilityColor(feasibility: 'solved' | 'overconstrained' | 'underconstrained'): { bg: string; text: string; border: string } {
  if (feasibility === 'solved') return { bg: 'bg-green-900/20', text: 'text-green-400', border: 'border-green-700' };
  return { bg: 'bg-amber-900/20', text: 'text-amber-400', border: 'border-amber-700' };
}

export function SensitivityTab() {
  const { state } = useCalculator();
  const { solver, inputs } = state;
  const { values, locks } = solver;

  // Extract only the specific input fields used by solve() — avoids recomputing
  // 16 solver runs when unrelated inputs (e.g. UI state, scenario list) change
  const profileId = inputs.cohorts[0]?.profileId || 'abm';
  const { advanced } = inputs;
  const { inHouseCreative, agencyPercent } = inputs.budget;
  const { tierMultipliers } = inputs.budget.frequencyConfig;

  // Build sensitivity scenarios: for each rate variable, show what happens if it improves
  const sensitivityData = useMemo(() => {
    return RATE_VARIABLES.map(rateVar => {
      const currentRate = values[rateVar.id];
      const isLocked = locks[rateVar.id];
      const bounds = SOLVER_BOUNDS[rateVar.id];

      const scenarios = IMPROVEMENTS.map(improvement => {
        const improvedRate = Math.min(currentRate * (1 + improvement), bounds.max);

        // Run solver with this improved rate to see impact on other variables
        const testValues = { ...values, [rateVar.id]: improvedRate };
        const testLocks = { ...locks, [rateVar.id]: true };

        const result = solve(
          testValues,
          testLocks,
          rateVar.id,
          improvedRate,
          profileId,
          advanced,
          inHouseCreative,
          agencyPercent,
          tierMultipliers,
        );

        return {
          improvement,
          newRate: improvedRate,
          resultAccounts: result.values.accounts,
          resultBudget: result.values.totalBudget,
          resultRevenue: result.values.revenueGoal,
          feasibility: result.feasibility,
        };
      });

      return {
        variable: rateVar,
        currentRate,
        isLocked,
        scenarios,
      };
    });
  }, [values, locks, profileId, advanced, inHouseCreative, agencyPercent, tierMultipliers]);

  // Show which variables are unlocked (solver-derived) vs locked
  const lockedVars = (Object.keys(locks) as SolverVariableId[]).filter(v => locks[v]);
  const unlockedVars = (Object.keys(locks) as SolverVariableId[]).filter(v => !locks[v]);

  return (
    <div className="space-y-4">
      {/* Current Lock Configuration */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-white mb-1">Constraint Configuration</h3>
        <p className="text-[10px] text-gray-500 mb-3">
          Locked variables are fixed by you; derived variables are computed by the solver.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-semibold text-[#1de2c4] uppercase tracking-wider mb-2">
              Locked ({lockedVars.length})
            </div>
            <div className="space-y-1">
              {lockedVars.map(v => (
                <div key={v} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{formatVarName(v)}</span>
                  <span className="text-white font-medium tabular-nums">{formatVarValue(v, values[v])}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Derived ({unlockedVars.length})
            </div>
            <div className="space-y-1">
              {unlockedVars.map(v => (
                <div key={v} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{formatVarName(v)}</span>
                  <span className="text-gray-300 font-medium tabular-nums">{formatVarValue(v, values[v])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sensitivity Analysis Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-white mb-1">Conversion Rate Sensitivity</h3>
        <p className="text-[10px] text-gray-500 mb-4">
          How derived values change if each conversion rate improves
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-3 py-2 font-semibold text-gray-400">Stage</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-400">Current</th>
                {IMPROVEMENTS.map(imp => (
                  <th key={imp} className="text-right px-3 py-2 font-semibold text-gray-400">
                    +{Math.round(imp * 100)}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivityData.map(row => (
                <tr key={row.variable.id} className="border-b border-gray-800/50">
                  <td className="px-3 py-2.5 font-medium text-white">
                    {row.variable.label}
                    {!row.isLocked && (
                      <span className="ml-1 text-[9px] text-gray-500">(derived)</span>
                    )}
                  </td>
                  <td className="text-right px-3 py-2.5 text-gray-300">
                    {formatPercent(row.currentRate)}
                  </td>
                  {row.scenarios.map(scenario => {
                    const colors = getFeasibilityColor(scenario.feasibility);
                    // Show the primary impact: accounts if unlocked, or budget if accounts locked
                    const showValue = !locks.accounts ? scenario.resultAccounts : scenario.resultBudget;
                    const showFormat = !locks.accounts ? formatNum : formatCurrency;
                    return (
                      <td key={scenario.improvement} className="text-right px-3 py-2.5">
                        <div className={`inline-flex flex-col items-end rounded-md px-2 py-1 ${colors.bg} border ${colors.border}`}>
                          <span className={`font-semibold ${colors.text}`}>
                            <AnimatedNumber
                              value={showValue}
                              format={showFormat}
                              className={colors.text}
                            />
                          </span>
                          <span className={`text-[9px] ${colors.text} opacity-70`}>
                            {formatPercent(scenario.newRate)}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-800">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Status:</span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-gray-400">Solved</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-gray-400">Constrained</span>
          </div>
          <span className="text-[10px] text-gray-500 ml-auto">
            Showing: {!locks.accounts ? 'required accounts' : 'required budget'}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatVarName(v: SolverVariableId): string {
  const names: Record<SolverVariableId, string> = {
    revenueGoal: 'Revenue Goal',
    totalBudget: 'Total Budget',
    asp: 'Avg Selling Price',
    accounts: 'Target Accounts',
    accountToLead: 'Account \u2192 Lead',
    leadToMQL: 'Lead \u2192 MQL',
    mqlToOpp: 'MQL \u2192 Opportunity',
    oppToClose: 'Opp \u2192 Close',
    blendedCPL: 'Blended CPL',
    timeHorizonQuarters: 'Time Horizon',
    monthlyFrequency: 'Monthly Frequency',
    costPerTouch: 'Cost per Touch',
    softwareCostPerQuarter: 'Software / Quarter',
  };
  return names[v] || v;
}

function formatVarValue(v: SolverVariableId, value: number): string {
  const rateVars: SolverVariableId[] = ['accountToLead', 'leadToMQL', 'mqlToOpp', 'oppToClose'];
  if (rateVars.includes(v)) return formatPercent(value);
  if (['revenueGoal', 'totalBudget', 'asp', 'blendedCPL', 'softwareCostPerQuarter'].includes(v)) return formatCurrency(value);
  if (v === 'accounts') return formatNum(value);
  if (v === 'timeHorizonQuarters') return `${Math.round(value)} qtrs`;
  if (v === 'monthlyFrequency') return `${Math.round(value)}/mo`;
  if (v === 'costPerTouch') return `$${value.toFixed(2)}`;
  return value.toFixed(1);
}
