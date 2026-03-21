import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useCalculator } from '../state/context';
import { CAMPAIGN_PROFILES } from '../engine/defaults';
import { formatNum, formatCurrency } from '../shared/formatters';
import { CHART_TOOLTIP, AXIS_TICK, LEGEND_STYLE } from '../shared/chartConstants';

export function CohortsTab() {
  const { state } = useCalculator();

  const outputs = state.outputs;

  const { cohorts: cohortOutputs } = outputs;
  const cohortInputs = state.inputs.cohorts;

  if (cohortOutputs.length === 0) return <div className="text-sm text-gray-500 p-4">No cohorts configured.</div>;

  // Contribution chart: shows each cohort's closed-won contribution per quarter
  const contributionData = outputs.quarterly.map((q, qi) => {
    const row: Record<string, string | number> = { name: q.quarterLabel };
    for (const co of cohortOutputs) {
      row[co.cohortName] = parseFloat((co.quarterlyData[qi]?.closedWon || 0).toFixed(2));
    }
    return row;
  });

  return (
    <div className="space-y-4">
      {/* Cohort Contribution */}
      {cohortOutputs.length > 1 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Closed-Won Contribution by Cohort</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contributionData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} tickFormatter={formatNum} />
                <RTooltip contentStyle={CHART_TOOLTIP} />
                <Legend wrapperStyle={LEGEND_STYLE} />
                {cohortOutputs.map((co) => (
                  <Bar key={co.cohortId} dataKey={co.cohortName} stackId="a" fill={CAMPAIGN_PROFILES[co.profileId].chartColor} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-Cohort Detail Cards */}
      {cohortOutputs.map((co, idx) => {
        const input = cohortInputs[idx];
        const profile = CAMPAIGN_PROFILES[co.profileId];
        const isOpportunityEntry = profile.funnelEntry === 'opportunity';
        const isWarm = profile.category === 'warm';

        const funnelData = isOpportunityEntry
          ? [
              { stage: 'Opps', value: input?.totalAccounts || 0 },
              { stage: 'Won', value: co.totals.closedWon },
            ]
          : [
              { stage: 'Accounts', value: input?.totalAccounts || 0 },
              { stage: 'Leads', value: co.totals.leads },
              { stage: 'MQLs', value: co.totals.mqls },
              { stage: 'Opps', value: co.totals.opportunities },
              { stage: 'Won', value: co.totals.closedWon },
            ];

        return (
          <div key={co.cohortId} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">{co.cohortName}</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${
                isWarm
                  ? 'text-amber-400 bg-amber-900/30'
                  : 'text-gray-400 bg-gray-800'
              }`}>
                {profile.label}
              </span>
            </div>

            {/* Funnel Summary */}
            <div className="flex items-center gap-1 mb-3">
              {funnelData.map((f, i) => (
                <div key={f.stage} className="flex items-center">
                  <div className="text-center">
                    <div className="text-lg font-light text-white">{formatNum(f.value)}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider">{f.stage}</div>
                  </div>
                  {i < funnelData.length - 1 && (
                    <div className="mx-1 text-gray-600">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-gray-800 rounded-lg p-2">
                <div className="text-gray-500">Revenue</div>
                <div className="font-semibold text-white">{formatCurrency(co.totals.revenue)}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-2">
                <div className="text-gray-500">Total Cost</div>
                <div className="font-semibold text-white">{formatCurrency(co.totals.totalCost)}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-2">
                <div className="text-gray-500">Deals</div>
                <div className="font-semibold text-white">{co.totals.closedWon.toFixed(1)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
