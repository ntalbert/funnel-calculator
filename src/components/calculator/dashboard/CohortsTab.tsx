import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { useCalculator } from '../state/context';
import { CAMPAIGN_PROFILES } from '../engine/defaults';
import { formatNum, formatCurrency } from '../shared/formatters';
import { CohortBadge } from '../shared/CohortBadge';
import { CHART_TOOLTIP, AXIS_TICK } from '../shared/chartConstants';

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div style={{ ...CHART_TOOLTIP, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => {
        const pct = total > 0 ? ((p.value / total) * 100).toFixed(0) : '0';
        return (
          <div key={p.name} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: p.color, flexShrink: 0 }} />
            <span style={{ color: '#e5e7eb' }}>{p.name}</span>
            <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>{formatNum(p.value)} ({pct}%)</span>
          </div>
        );
      })}
      <div style={{ fontSize: 10, color: '#6b7280', borderTop: '1px solid #374151', marginTop: 4, paddingTop: 4 }}>
        Total Active: {formatNum(total)}
      </div>
    </div>
  );
}

export function CohortsTab() {
  const { state } = useCalculator();
  const outputs = state.outputs;
  const { cohorts: cohortOutputs } = outputs;
  const cohortInputs = state.inputs.cohorts;

  if (cohortOutputs.length === 0) return <div className="text-sm text-gray-500 p-4">No cohorts configured.</div>;

  // Activity chart: bar height = total active accounts, segments = cohort share
  const activityData = outputs.quarterly.map((q, qi) => {
    const row: Record<string, string | number> = { name: q.quarterLabel };
    for (const co of cohortOutputs) {
      const qd = co.quarterlyData[qi];
      row[co.cohortName] = qd?.accountState.totalActive ?? 0;
    }
    return row;
  });

  return (
    <div className="space-y-4">
      {/* Cohort Badges */}
      <div className="flex flex-wrap gap-2">
        {cohortOutputs.map((co, idx) => {
          const input = cohortInputs[idx];
          return (
            <CohortBadge
              key={co.cohortId}
              cohortName={co.cohortName}
              profileId={co.profileId}
              strategyType={input?.strategyType ?? CAMPAIGN_PROFILES[co.profileId].category}
              owner={input?.owner}
              totalAccounts={input?.totalAccounts ?? 0}
              closedWon={co.totals.closedWon}
            />
          );
        })}
      </div>

      {/* Stacked Activity Chart */}
      {cohortOutputs.length > 1 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Active Accounts by Cohort</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} tickFormatter={formatNum} />
                <RTooltip content={<CustomTooltip />} />
                {cohortOutputs.map((co) => {
                  const profile = CAMPAIGN_PROFILES[co.profileId];
                  const isCold = profile.category === 'cold';
                  return (
                    <Bar
                      key={co.cohortId}
                      dataKey={co.cohortName}
                      stackId="activity"
                      fill={profile.chartColor}
                      stroke={isCold ? '#3B82F6' : '#F97316'}
                      strokeWidth={2}
                    />
                  );
                })}
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
          <div key={co.cohortId} className={`bg-gray-900 rounded-xl border-2 p-4 ${
            isWarm ? 'border-orange-500/30' : 'border-blue-500/30'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: profile.chartColor }} />
                <h3 className="text-sm font-semibold text-white">{co.cohortName}</h3>
                {input?.owner && <span className="text-[10px] text-gray-500">{input.owner}</span>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                isWarm
                  ? 'text-amber-400 bg-amber-900/30'
                  : 'text-blue-400 bg-blue-900/30'
              }`}>
                {profile.label}
              </span>
            </div>

            {/* Markets tags */}
            {input?.markets && input.markets.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {input.markets.map((m) => (
                  <span key={m} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{m}</span>
                ))}
              </div>
            )}

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
