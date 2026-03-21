import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import { useCalculator } from '../state/context';
import { Tooltip } from '../shared/Tooltip';
import { TOOLTIPS, UNIT_ECONOMICS_THRESHOLDS } from '../engine/defaults';
import { formatCurrency } from '../shared/formatters';
import { CHART_TOOLTIP, AXIS_TICK, LEGEND_STYLE } from '../shared/chartConstants';
import type { TrafficLightStatus } from '../engine/types';

const COLORS = {
  frequency: '#3B82F6',  // blue
  cpl: '#06B6D4',        // cyan
  software: '#8B5CF6',   // purple
  agency: '#F59E0B',     // amber
  cumCost: '#DC2626',    // red line
  cumRevenue: '#10B981', // green line
};

function getUnitEconStatus(metric: string, value: number): TrafficLightStatus {
  const t = UNIT_ECONOMICS_THRESHOLDS;
  if (metric === 'ltvCac') return value >= t.ltvCac.green ? 'green' : value >= t.ltvCac.amber ? 'amber' : 'red';
  if (metric === 'cacPayback') return value <= t.cacPaybackMonths.green ? 'green' : value <= t.cacPaybackMonths.amber ? 'amber' : 'red';
  if (metric === 'newCacRatio') return value <= t.newCacRatio.green ? 'green' : value <= t.newCacRatio.amber ? 'amber' : 'red';
  return 'green';
}

/** State-specific tooltip messages per PRD 4.11.4 */
function getUnitEconTooltip(metric: string, status: TrafficLightStatus): string {
  if (status === 'green') return TOOLTIPS[metric === 'ltvCac' ? 'ltvCac' : metric === 'cacPayback' ? 'cacPayback' : 'newCacRatio'];
  if (status === 'amber') return 'Your acquisition efficiency is below the healthy threshold. This is sustainable only if growth rate exceeds 40% annually or if retention is exceptionally strong.';
  return 'Your unit economics indicate you are spending more to acquire customers than they will return. Review your ASP, conversion rates, or budget assumptions.';
}

const REVENUE_BENCHMARKS = [
  { label: 'First-year ARR per $1 S&M spend', desc: '1\u00D7\u20132\u00D7 common. Best-in-class: 2\u00D7+. Below 1\u00D7 indicates targeting issues or weak positioning.' },
  { label: 'Marketing-sourced pipeline multiple', desc: '3\u20135\u00D7 pipeline per marketing dollar. Marketing-sourced ARR typically 30\u201360% of total new ARR.' },
  { label: 'Marketing spend as % of revenue', desc: '10\u201325% typical. VC-backed: 47% of S&M. PE-backed: 33%. Bootstrapped optimizes lower.' },
  { label: 'Proportional scaling', desc: 'If spend +20%, revenue should grow at least proportionally. Declining efficiency signals model decay.' },
];

const STATUS_COLORS: Record<TrafficLightStatus, string> = {
  green: 'bg-green-900/20 border-green-700 text-green-400',
  amber: 'bg-amber-900/20 border-amber-700 text-amber-400',
  red: 'bg-red-900/20 border-red-700 text-red-400',
};

export function BudgetTab() {
  const { state } = useCalculator();

  const outputs = state.outputs;

  const { quarterly } = outputs;
  const { summary } = outputs;
  const { unitEconomics } = summary;

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

  return (
    <div className="space-y-4">
      {/* Quarterly Budget Breakdown */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">
          Quarterly Budget Breakdown
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgetData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} tickFormatter={formatCurrency} />
              <RTooltip
                contentStyle={CHART_TOOLTIP}
                formatter={(value: any) => [formatCurrency(Number(value))]}
              />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Bar dataKey="Frequency Targeting" stackId="a" fill={COLORS.frequency} />
              <Bar dataKey="CPL Lead Gen" stackId="a" fill={COLORS.cpl} />
              <Bar dataKey="Software" stackId="a" fill={COLORS.software} />
              <Bar dataKey="Agency" stackId="a" fill={COLORS.agency} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cumulative Spend vs Revenue */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Cumulative Investment vs. Revenue</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={crossoverData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} tickFormatter={formatCurrency} />
              <RTooltip
                contentStyle={CHART_TOOLTIP}
                formatter={(value: any) => [formatCurrency(Number(value))]}
              />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Line type="monotone" dataKey="Cumulative Cost" stroke={COLORS.cumCost} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Cumulative Revenue" stroke={COLORS.cumRevenue} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-gray-500">Total Investment</div>
            <div className="font-semibold text-white">{formatCurrency(summary.totalInvestment)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-gray-500">Total Pipeline</div>
            <div className="font-semibold text-white">{formatCurrency(summary.totalPipeline)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-gray-500">Total Revenue</div>
            <div className="font-semibold text-white">{formatCurrency(summary.totalRevenue)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-gray-500">Effective CAC</div>
            <div className="font-semibold text-white">{formatCurrency(summary.effectiveCAC)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-gray-500">Pipeline:Mktg</div>
            <div className="font-semibold text-white">{summary.pipelineToMarketingRatio.toFixed(1)}:1</div>
          </div>
        </div>
      </div>

      {/* Unit Economics Card (PRD C.3) */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">
          Unit Economics
          <span className="text-[10px] font-normal text-gray-500 ml-2">Can we afford to buy this revenue?</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* LTV:CAC */}
          <div className={`rounded-lg border p-3 ${STATUS_COLORS[getUnitEconStatus('ltvCac', unitEconomics.ltvCacRatio)]}`}>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">LTV:CAC</span>
              <Tooltip content={getUnitEconTooltip('ltvCac', getUnitEconStatus('ltvCac', unitEconomics.ltvCacRatio))}>
                <span className="text-[9px] opacity-50 cursor-help">?</span>
              </Tooltip>
            </div>
            <div className="text-xl font-light mt-1 text-white">
              {unitEconomics.ltvCacRatio > 0 ? `${unitEconomics.ltvCacRatio.toFixed(1)}:1` : '\u2014'}
            </div>
            <div className="text-[10px] opacity-70 mt-0.5">
              {getUnitEconStatus('ltvCac', unitEconomics.ltvCacRatio) === 'green' && 'Sustainable'}
              {getUnitEconStatus('ltvCac', unitEconomics.ltvCacRatio) === 'amber' && 'Stretched'}
              {getUnitEconStatus('ltvCac', unitEconomics.ltvCacRatio) === 'red' && 'Unsustainable'}
            </div>
          </div>

          {/* CAC Payback */}
          <div className={`rounded-lg border p-3 ${STATUS_COLORS[getUnitEconStatus('cacPayback', unitEconomics.cacPaybackMonths)]}`}>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">CAC Payback</span>
              <Tooltip content={getUnitEconTooltip('cacPayback', getUnitEconStatus('cacPayback', unitEconomics.cacPaybackMonths))}>
                <span className="text-[9px] opacity-50 cursor-help">?</span>
              </Tooltip>
            </div>
            <div className="text-xl font-light mt-1 text-white">
              {unitEconomics.cacPaybackMonths > 0 ? `${Math.round(unitEconomics.cacPaybackMonths)}mo` : '\u2014'}
            </div>
            <div className="text-[10px] opacity-70 mt-0.5">
              {getUnitEconStatus('cacPayback', unitEconomics.cacPaybackMonths) === 'green' && 'Strong'}
              {getUnitEconStatus('cacPayback', unitEconomics.cacPaybackMonths) === 'amber' && 'Moderate'}
              {getUnitEconStatus('cacPayback', unitEconomics.cacPaybackMonths) === 'red' && 'Too long'}
            </div>
          </div>

          {/* New CAC Ratio */}
          <div className={`rounded-lg border p-3 ${STATUS_COLORS[getUnitEconStatus('newCacRatio', unitEconomics.newCacRatio)]}`}>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">New CAC Ratio</span>
              <Tooltip content={getUnitEconTooltip('newCacRatio', getUnitEconStatus('newCacRatio', unitEconomics.newCacRatio))}>
                <span className="text-[9px] opacity-50 cursor-help">?</span>
              </Tooltip>
            </div>
            <div className="text-xl font-light mt-1 text-white">
              {unitEconomics.newCacRatio > 0 ? `$${unitEconomics.newCacRatio.toFixed(2)}` : '\u2014'}
            </div>
            <div className="text-[10px] opacity-70 mt-0.5">
              {getUnitEconStatus('newCacRatio', unitEconomics.newCacRatio) === 'green' && 'Efficient'}
              {getUnitEconStatus('newCacRatio', unitEconomics.newCacRatio) === 'amber' && 'Typical'}
              {getUnitEconStatus('newCacRatio', unitEconomics.newCacRatio) === 'red' && 'Inefficient'}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Return Expectations (PRD 4.11.5) */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-white mb-1">
          Revenue Return Benchmarks
          <span className="text-[10px] font-normal text-gray-500 ml-2">Growth-stage B2B SaaS</span>
        </h3>
        <div className="space-y-2 mt-3">
          {REVENUE_BENCHMARKS.map(b => (
            <div key={b.label} className="border-l-2 border-gray-700 pl-3">
              <div className="text-[11px] font-medium text-gray-200">{b.label}</div>
              <div className="text-[10px] text-gray-500">{b.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[9px] text-gray-600">
          Sources: Benchmarkit 2025, Pavilion/Ebsta 2024, HubSpot Sales Trends 2024
        </div>
      </div>
    </div>
  );
}
