import { useCalculator } from '../state/context';
import { Tooltip } from '../shared/Tooltip';
import { TOOLTIPS, PIPELINE_BENCHMARKS } from '../engine/defaults';

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function getTrafficLight(metric: string, value: number | null, state: any): { color: string; label: string; badgeColor: string } {
  if (metric === 'firstRevenue') {
    if (value === null) return { color: 'border-red-700 bg-red-900/20', label: 'At Risk', badgeColor: 'text-red-400 bg-red-900/40' };
    if (value > 5) return { color: 'border-red-700 bg-red-900/20', label: 'At Risk', badgeColor: 'text-red-400 bg-red-900/40' };
    if (value > 3) return { color: 'border-amber-700 bg-amber-900/20', label: 'Watch', badgeColor: 'text-amber-400 bg-amber-900/40' };
    return { color: 'border-green-700 bg-green-900/20', label: 'On Track', badgeColor: 'text-green-400 bg-green-900/40' };
  }
  if (metric === 'investment') {
    const roi = state.outputs.summary.roi;
    if (roi > 2) return { color: 'border-green-700 bg-green-900/20', label: 'Strong ROI', badgeColor: 'text-green-400 bg-green-900/40' };
    if (roi > 0) return { color: 'border-amber-700 bg-amber-900/20', label: 'Positive', badgeColor: 'text-amber-400 bg-amber-900/40' };
    return { color: 'border-red-700 bg-red-900/20', label: 'Investing', badgeColor: 'text-red-400 bg-red-900/40' };
  }
  if (metric === 'trueCPL') {
    if (value !== null && value < 5000) return { color: 'border-green-700 bg-green-900/20', label: 'Efficient', badgeColor: 'text-green-400 bg-green-900/40' };
    if (value !== null && value < 8000) return { color: 'border-amber-700 bg-amber-900/20', label: 'Typical', badgeColor: 'text-amber-400 bg-amber-900/40' };
    return { color: 'border-red-700 bg-red-900/20', label: 'High', badgeColor: 'text-red-400 bg-red-900/40' };
  }
  if (metric === 'pipeline') {
    const benchmark = state?.inputs?.goals?.companyStage
      ? PIPELINE_BENCHMARKS[state.inputs.goals.companyStage].ratio
      : 5.0;
    if (value !== null && value >= benchmark) return { color: 'border-green-700 bg-green-900/20', label: 'On Target', badgeColor: 'text-green-400 bg-green-900/40' };
    if (value !== null && value >= benchmark * 0.7) return { color: 'border-amber-700 bg-amber-900/20', label: 'Below Target', badgeColor: 'text-amber-400 bg-amber-900/40' };
    return { color: 'border-red-700 bg-red-900/20', label: 'Pipeline Gap', badgeColor: 'text-red-400 bg-red-900/40' };
  }
  return { color: 'border-gray-700 bg-gray-900/20', label: '', badgeColor: 'text-gray-400 bg-gray-800' };
}

export function HeroMetrics() {
  const { state } = useCalculator();
  const { summary } = state.outputs;
  const stageBenchmark = PIPELINE_BENCHMARKS[state.inputs.goals.companyStage];

  // Investment period: quarters from first spend to first revenue (PRD C.1)
  const investmentPeriodQ = summary.firstRevenueQuarter !== null
    ? summary.firstRevenueQuarter + 1
    : null;

  const metrics = [
    {
      id: 'firstRevenue',
      label: 'First Revenue',
      value: summary.firstRevenueQuarterLabel,
      sub: investmentPeriodQ !== null
        ? `${investmentPeriodQ}Q investment period \u00B7 ${formatCurrency(summary.firstRevenueAmount)}`
        : 'No revenue within model horizon',
      tooltip: TOOLTIPS.investmentPeriod,
      traffic: getTrafficLight('firstRevenue', summary.firstRevenueQuarter, state),
    },
    {
      id: 'pipeline',
      label: 'Pipeline Generated',
      value: formatCurrency(summary.totalPipeline),
      sub: `${summary.pipelineToMarketingRatio.toFixed(1)}:1 ratio \u00B7 ${stageBenchmark.ratio}:1 target`,
      tooltip: TOOLTIPS.pipelineRatio,
      traffic: getTrafficLight('pipeline', summary.pipelineToMarketingRatio, state),
    },
    {
      id: 'investment',
      label: 'Total Investment',
      value: formatCurrency(summary.totalInvestment),
      sub: `ROI: ${(summary.roi * 100).toFixed(0)}%`,
      tooltip: TOOLTIPS.cumulativeRevenueVsSpend,
      traffic: getTrafficLight('investment', summary.totalInvestment, state),
    },
    {
      id: 'trueCPL',
      label: 'True CPL',
      value: formatCurrency(summary.trueCPL),
      sub: `${summary.frequencyToCPLRatio.toFixed(1)}x freq:CPL ratio`,
      tooltip: TOOLTIPS.trueCPL,
      traffic: getTrafficLight('trueCPL', summary.trueCPL, state),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {metrics.map((m) => (
        <div key={m.id} className={`rounded-xl border p-4 ${m.traffic.color}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
              {m.label}
            </span>
            <Tooltip content={m.tooltip}>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${m.traffic.badgeColor}`}>
                {m.traffic.label}
              </span>
            </Tooltip>
          </div>
          <div className="text-2xl font-light tracking-tight text-white">
            {m.value}
          </div>
          {m.sub && (
            <div className="text-xs text-gray-400 mt-0.5">{m.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
