import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar, ComposedChart, Line, ReferenceArea } from 'recharts';
import { useCalculator } from '../state/context';
import { CAMPAIGN_PROFILES } from '../engine/defaults';
import { formatNum, formatCurrency } from '../shared/formatters';

// Light-theme axis styles for PDF
const AXIS_TICK = { fontSize: 10, fill: '#374151' };
const GRID_STROKE = '#e5e7eb';

const TIMELINE_COLORS = {
  leads: '#3B82F6',
  mqls: '#10B981',
  opportunities: '#F59E0B',
  closedWon: '#8B5CF6',
  revenue: '#EC4899',
};

const BUDGET_COLORS = {
  frequency: '#3B82F6',
  cpl: '#06B6D4',
  software: '#8B5CF6',
  agency: '#F59E0B',
  cumCost: '#DC2626',
  cumRevenue: '#10B981',
};

export function ChartCaptureContainer() {
  const { state } = useCalculator();
  const { quarterly, cohorts: cohortOutputs, summary } = state.outputs;
  const arrGoal = state.inputs.goals.arrGoal;

  if (!state.ui.showEmailCapture) return null;

  // Timeline chart data
  const timelineData = quarterly.map(q => ({
    name: q.quarterLabel,
    Leads: parseFloat(q.leads.toFixed(1)),
    MQLs: parseFloat(q.mqls.toFixed(1)),
    Opportunities: parseFloat(q.opportunities.toFixed(1)),
    'Closed Won': parseFloat(q.closedWon.toFixed(2)),
    'Cum. Revenue': q.cumulativeRevenue,
  }));

  // Budget chart data
  const budgetData = quarterly.map(q => ({
    name: q.quarterLabel,
    'Frequency Targeting': Math.round(q.frequencyCost),
    'CPL Lead Gen': Math.round(q.cplCost),
    Software: Math.round(q.softwareCost),
    Agency: Math.round(q.agencyCost),
  }));

  const crossoverData = quarterly.map(q => ({
    name: q.quarterLabel,
    'Cumulative Cost': q.cumulativeCost,
    'Cumulative Revenue': q.cumulativeRevenue,
  }));

  // Cohort contribution data
  const contributionData = quarterly.map((q, qi) => {
    const row: Record<string, string | number> = { name: q.quarterLabel };
    for (const co of cohortOutputs) {
      row[co.cohortName] = parseFloat((co.quarterlyData[qi]?.closedWon || 0).toFixed(2));
    }
    return row;
  });

  // Investment period boundaries
  const firstRevIdx = summary.firstRevenueQuarter;
  const investStart = quarterly.length > 0 ? quarterly[0].quarterLabel : null;
  const investEnd = firstRevIdx !== null && firstRevIdx < quarterly.length ? quarterly[firstRevIdx].quarterLabel : null;

  const LEGEND_STYLE = { fontSize: 10, color: '#374151' };

  return (
    <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
      {/* Timeline: Funnel Volume */}
      <div id="pdf-chart-timeline-funnel" style={{ width: 800, height: 400, background: 'white', padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 8 }}>Funnel Volume by Quarter</div>
        <AreaChart width={768} height={350} data={timelineData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="name" tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatNum} />
          <Legend wrapperStyle={LEGEND_STYLE} />
          {investStart && investEnd && firstRevIdx !== null && firstRevIdx > 0 && (
            <ReferenceArea x1={investStart} x2={investEnd} fill="#fef3c7" fillOpacity={0.5}
              label={{ value: 'Investment Period', position: 'insideTop', fontSize: 9, fill: '#92400e' }} />
          )}
          <Area type="monotone" dataKey="Leads" stackId="1" fill={TIMELINE_COLORS.leads} stroke={TIMELINE_COLORS.leads} fillOpacity={0.6} isAnimationActive={false} />
          <Area type="monotone" dataKey="MQLs" stackId="1" fill={TIMELINE_COLORS.mqls} stroke={TIMELINE_COLORS.mqls} fillOpacity={0.6} isAnimationActive={false} />
          <Area type="monotone" dataKey="Opportunities" stackId="1" fill={TIMELINE_COLORS.opportunities} stroke={TIMELINE_COLORS.opportunities} fillOpacity={0.6} isAnimationActive={false} />
          <Area type="monotone" dataKey="Closed Won" stackId="1" fill={TIMELINE_COLORS.closedWon} stroke={TIMELINE_COLORS.closedWon} fillOpacity={0.6} isAnimationActive={false} />
        </AreaChart>
      </div>

      {/* Timeline: Cumulative Revenue vs Goal */}
      <div id="pdf-chart-timeline-revenue" style={{ width: 800, height: 320, background: 'white', padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 8 }}>Cumulative Revenue vs. Goal</div>
        <ComposedChart width={768} height={270} data={timelineData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="name" tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatCurrency} />
          <Legend wrapperStyle={LEGEND_STYLE} />
          <Area type="monotone" dataKey="Cum. Revenue" fill={TIMELINE_COLORS.revenue} stroke={TIMELINE_COLORS.revenue} fillOpacity={0.2} isAnimationActive={false} />
          <Line type="monotone" dataKey={() => arrGoal} stroke="#DC2626" strokeDasharray="5 5" strokeWidth={1.5} dot={false} name="ARR Goal" isAnimationActive={false} />
        </ComposedChart>
      </div>

      {/* Budget: Quarterly Breakdown */}
      <div id="pdf-chart-budget-breakdown" style={{ width: 800, height: 400, background: 'white', padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 8 }}>Quarterly Budget Breakdown</div>
        <BarChart width={768} height={350} data={budgetData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="name" tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatCurrency} />
          <Legend wrapperStyle={LEGEND_STYLE} />
          <Bar dataKey="Frequency Targeting" stackId="a" fill={BUDGET_COLORS.frequency} isAnimationActive={false} />
          <Bar dataKey="CPL Lead Gen" stackId="a" fill={BUDGET_COLORS.cpl} isAnimationActive={false} />
          <Bar dataKey="Software" stackId="a" fill={BUDGET_COLORS.software} isAnimationActive={false} />
          <Bar dataKey="Agency" stackId="a" fill={BUDGET_COLORS.agency} isAnimationActive={false} />
        </BarChart>
      </div>

      {/* Budget: Cumulative Investment vs Revenue */}
      <div id="pdf-chart-budget-crossover" style={{ width: 800, height: 320, background: 'white', padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 8 }}>Cumulative Investment vs. Revenue</div>
        <ComposedChart width={768} height={270} data={crossoverData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="name" tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} tickFormatter={formatCurrency} />
          <Legend wrapperStyle={LEGEND_STYLE} />
          <Line type="monotone" dataKey="Cumulative Cost" stroke={BUDGET_COLORS.cumCost} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="Cumulative Revenue" stroke={BUDGET_COLORS.cumRevenue} strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </div>

      {/* Cohorts: Contribution Chart (only if multiple cohorts) */}
      {cohortOutputs.length > 1 && (
        <div id="pdf-chart-cohorts-contribution" style={{ width: 800, height: 400, background: 'white', padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 8 }}>Closed-Won Contribution by Cohort</div>
          <BarChart width={768} height={350} data={contributionData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="name" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} tickFormatter={formatNum} />
            <Legend wrapperStyle={LEGEND_STYLE} />
            {cohortOutputs.map((co) => (
              <Bar key={co.cohortId} dataKey={co.cohortName} stackId="a" fill={CAMPAIGN_PROFILES[co.profileId].chartColor} isAnimationActive={false} />
            ))}
          </BarChart>
        </div>
      )}
    </div>
  );
}
