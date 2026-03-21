import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer, Line, ComposedChart, ReferenceArea, ReferenceLine } from 'recharts';
import { useCalculator } from '../state/context';
import { CAMPAIGN_PROFILES, getQuarterLabel } from '../engine/defaults';
import { formatNum, formatCurrency } from '../shared/formatters';
import { CHART_TOOLTIP, AXIS_TICK, LEGEND_STYLE } from '../shared/chartConstants';

const COLORS = {
  leads: '#3B82F6',      // blue
  mqls: '#10B981',       // green
  opportunities: '#F59E0B', // amber
  closedWon: '#8B5CF6',  // purple
  revenue: '#EC4899',     // pink (line)
};

export function TimelineTab() {
  const { state } = useCalculator();

  const outputs = state.outputs;

  const { quarterly } = outputs;
  const { summary } = outputs;
  const { arrGoal } = state.inputs.goals;

  const { startYear, startQ, cohorts: cohortInputs } = state.inputs;

  const chartData = quarterly.map(q => ({
    name: q.quarterLabel,
    Leads: parseFloat(q.leads.toFixed(1)),
    MQLs: parseFloat(q.mqls.toFixed(1)),
    Opportunities: parseFloat(q.opportunities.toFixed(1)),
    'Closed Won': parseFloat(q.closedWon.toFixed(2)),
    'Cum. Revenue': q.cumulativeRevenue,
  }));

  // Investment period boundaries for shading (PRD C.2)
  const firstRevIdx = summary.firstRevenueQuarter;
  const investmentPeriodStart = quarterly.length > 0 ? quarterly[0].quarterLabel : null;
  const investmentPeriodEnd = firstRevIdx !== null && firstRevIdx < quarterly.length
    ? quarterly[firstRevIdx].quarterLabel
    : null;

  // Cohort start markers — deduplicated by quarter, skip Q0 (first cohort is implicit)
  const cohortStartMarkers = cohortInputs
    .filter(c => c.startQuarter > 0)
    .map(c => ({
      quarterLabel: getQuarterLabel(c.startQuarter, startYear, startQ),
      cohortName: c.name,
      profileLabel: CAMPAIGN_PROFILES[c.profileId].label,
      chartColor: CAMPAIGN_PROFILES[c.profileId].chartColor,
    }))
    // Deduplicate by quarter (if multiple cohorts start same quarter, combine names)
    .reduce<Array<{ quarterLabel: string; label: string; color: string }>>((acc, m) => {
      const existing = acc.find(a => a.quarterLabel === m.quarterLabel);
      if (existing) {
        existing.label += `, ${m.cohortName}`;
      } else {
        acc.push({ quarterLabel: m.quarterLabel, label: `${m.cohortName} starts`, color: m.chartColor });
      }
      return acc;
    }, []);

  return (
    <div className="space-y-4">
      {state.solver.result.feasibility === 'overconstrained' && (
        <div className="rounded-lg border border-amber-800 bg-amber-900/20 px-3 py-2">
          <p className="text-[11px] text-amber-300">Some constraints are in tension — results use bounded values</p>
        </div>
      )}

      {/* Funnel Volume Chart */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Funnel Volume by Quarter</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} tickFormatter={formatNum} />
              <RTooltip
                contentStyle={CHART_TOOLTIP}
                formatter={(value: any, name: any) => [formatNum(Number(value)), String(name)]}
              />
              <Legend wrapperStyle={LEGEND_STYLE} />
              {/* Investment Period Shading (PRD C.2) */}
              {investmentPeriodStart && investmentPeriodEnd && firstRevIdx !== null && firstRevIdx > 0 && (
                <ReferenceArea
                  x1={investmentPeriodStart}
                  x2={investmentPeriodEnd}
                  fill="#78350f"
                  fillOpacity={0.2}
                  label={{ value: 'Investment Period', position: 'insideTop', fontSize: 9, fill: '#fbbf24' }}
                />
              )}
              {/* Cohort start markers */}
              {cohortStartMarkers.map(m => (
                <ReferenceLine
                  key={m.quarterLabel}
                  x={m.quarterLabel}
                  stroke={m.color}
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{
                    value: m.label,
                    position: 'insideTopRight',
                    fontSize: 9,
                    fill: m.color,
                    offset: 8,
                  }}
                />
              ))}
              <Area type="monotone" dataKey="Leads" stackId="1" fill={COLORS.leads} stroke={COLORS.leads} fillOpacity={0.6} />
              <Area type="monotone" dataKey="MQLs" stackId="1" fill={COLORS.mqls} stroke={COLORS.mqls} fillOpacity={0.6} />
              <Area type="monotone" dataKey="Opportunities" stackId="1" fill={COLORS.opportunities} stroke={COLORS.opportunities} fillOpacity={0.6} />
              <Area type="monotone" dataKey="Closed Won" stackId="1" fill={COLORS.closedWon} stroke={COLORS.closedWon} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cumulative Revenue vs Goal */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Cumulative Revenue vs. Goal</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} tickFormatter={formatCurrency} />
              <RTooltip
                contentStyle={CHART_TOOLTIP}
                formatter={(value: any) => [formatCurrency(Number(value))]}
              />
              <Area type="monotone" dataKey="Cum. Revenue" fill={COLORS.revenue} stroke={COLORS.revenue} fillOpacity={0.2} />
              {/* Goal reference line */}
              <Line
                type="monotone"
                dataKey={() => arrGoal}
                stroke="#DC2626"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                dot={false}
                name="ARR Goal"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
          <span>Progress: <strong className="text-white">{(summary.progressToGoal * 100).toFixed(0)}%</strong> of goal</span>
          {summary.crossoverQuarterLabel !== 'Beyond modeled range' && (
            <span>Crossover: <strong className="text-white">{summary.crossoverQuarterLabel}</strong></span>
          )}
          <span>
            Sales Velocity: <strong className="text-white">{Math.round(summary.currentSalesVelocity)}d</strong>
            {summary.daysSavedVsBaseline > 0 && (
              <span className="text-green-400 ml-1">({Math.round(summary.daysSavedVsBaseline)}d faster)</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
