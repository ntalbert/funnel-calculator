import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useCalculator } from '../state/context';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1'];
const CHART_TOOLTIP = { fontSize: 11, borderRadius: 8, border: '1px solid #374151', backgroundColor: '#1f2937', color: '#e5e7eb' };
const AXIS_TICK = { fontSize: 10, fill: '#9ca3af' };

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function CohortsTab() {
  const { state } = useCalculator();
  const { cohorts: cohortOutputs } = state.outputs;
  const { cohorts: cohortInputs } = state.inputs;

  if (cohortOutputs.length === 0) return <div className="text-sm text-gray-500 p-4">No cohorts configured.</div>;

  // Contribution chart: shows each cohort's closed-won contribution per quarter
  const contributionData = state.outputs.quarterly.map((q, qi) => {
    const row: any = { name: q.quarterLabel };
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
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                {cohortOutputs.map((co, i) => (
                  <Bar key={co.cohortId} dataKey={co.cohortName} stackId="a" fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-Cohort Detail Cards */}
      {cohortOutputs.map((co, idx) => {
        const input = cohortInputs[idx];
        const funnelData = [
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
              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                {co.profileId.toUpperCase()}
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
