import { motion } from 'motion/react';
import { useCalculator } from '../state/context';
import { Tooltip } from '../shared/Tooltip';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { TOOLTIPS, PIPELINE_BENCHMARKS } from '../engine/defaults';
import { formatCurrency } from '../shared/formatters';
import type { CompanyStage } from '../engine/types';

interface TrafficLightContext {
  roi: number;
  companyStage: CompanyStage;
}

function getTrafficLight(metric: string, value: number | null, ctx: TrafficLightContext): { color: string; label: string; badgeColor: string } {
  if (metric === 'firstRevenue') {
    if (value === null) return { color: 'border-red-700 bg-red-900/20', label: 'At Risk', badgeColor: 'text-red-400 bg-red-900/40' };
    if (value > 5) return { color: 'border-red-700 bg-red-900/20', label: 'At Risk', badgeColor: 'text-red-400 bg-red-900/40' };
    if (value > 3) return { color: 'border-amber-700 bg-amber-900/20', label: 'Watch', badgeColor: 'text-amber-400 bg-amber-900/40' };
    return { color: 'border-green-700 bg-green-900/20', label: 'On Track', badgeColor: 'text-green-400 bg-green-900/40' };
  }
  if (metric === 'revenue') {
    if (value !== null && value >= 1.0) return { color: 'border-green-700 bg-green-900/20', label: 'Goal Met', badgeColor: 'text-green-400 bg-green-900/40' };
    if (value !== null && value >= 0.5) return { color: 'border-amber-700 bg-amber-900/20', label: 'On Pace', badgeColor: 'text-amber-400 bg-amber-900/40' };
    return { color: 'border-red-700 bg-red-900/20', label: 'Behind', badgeColor: 'text-red-400 bg-red-900/40' };
  }
  if (metric === 'investment') {
    if (ctx.roi > 2) return { color: 'border-green-700 bg-green-900/20', label: 'Strong ROI', badgeColor: 'text-green-400 bg-green-900/40' };
    if (ctx.roi > 0) return { color: 'border-amber-700 bg-amber-900/20', label: 'Positive', badgeColor: 'text-amber-400 bg-amber-900/40' };
    return { color: 'border-red-700 bg-red-900/20', label: 'Investing', badgeColor: 'text-red-400 bg-red-900/40' };
  }
  if (metric === 'trueCPL') {
    if (value !== null && value < 5000) return { color: 'border-green-700 bg-green-900/20', label: 'Efficient', badgeColor: 'text-green-400 bg-green-900/40' };
    if (value !== null && value < 8000) return { color: 'border-amber-700 bg-amber-900/20', label: 'Typical', badgeColor: 'text-amber-400 bg-amber-900/40' };
    return { color: 'border-red-700 bg-red-900/20', label: 'High', badgeColor: 'text-red-400 bg-red-900/40' };
  }
  if (metric === 'pipeline') {
    const benchmark = ctx.companyStage
      ? PIPELINE_BENCHMARKS[ctx.companyStage].ratio
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
  const { solver } = state;

  const trafficCtx: TrafficLightContext = {
    roi: summary.roi,
    companyStage: state.inputs.goals.companyStage,
  };

  const investmentPeriodQ = summary.firstRevenueQuarter !== null
    ? summary.firstRevenueQuarter + 1
    : null;

  const metrics = [
    {
      id: 'firstRevenue',
      label: 'First Revenue',
      displayValue: summary.firstRevenueQuarterLabel,
      numericValue: null as number | null,
      format: null as ((n: number) => string) | null,
      sub: investmentPeriodQ !== null
        ? `${investmentPeriodQ}Q investment period \u00B7 ${formatCurrency(summary.firstRevenueAmount)}`
        : 'No revenue within model horizon',
      tooltip: TOOLTIPS.investmentPeriod,
      traffic: getTrafficLight('firstRevenue', summary.firstRevenueQuarter, trafficCtx),
    },
    {
      id: 'revenue',
      label: 'Revenue Generated',
      displayValue: null as string | null,
      numericValue: summary.totalRevenue,
      format: formatCurrency,
      sub: `${(summary.progressToGoal * 100).toFixed(0)}% of ARR goal`,
      tooltip: TOOLTIPS.progressToGoal,
      traffic: getTrafficLight('revenue', summary.progressToGoal, trafficCtx),
    },
    {
      id: 'pipeline',
      label: 'Pipeline Generated',
      displayValue: null as string | null,
      numericValue: summary.totalPipeline,
      format: formatCurrency,
      sub: `${summary.pipelineToMarketingRatio.toFixed(1)}:1 ratio`,
      tooltip: TOOLTIPS.pipelineRatio,
      traffic: getTrafficLight('pipeline', summary.pipelineToMarketingRatio, trafficCtx),
    },
    {
      id: 'investment',
      label: 'Total Investment',
      displayValue: null as string | null,
      numericValue: summary.totalInvestment,
      format: formatCurrency,
      sub: `ROI: ${(summary.roi * 100).toFixed(0)}%`,
      tooltip: TOOLTIPS.cumulativeRevenueVsSpend,
      traffic: getTrafficLight('investment', summary.totalInvestment, trafficCtx),
    },
    {
      id: 'trueCPL',
      label: 'True CPL',
      displayValue: null as string | null,
      numericValue: summary.trueCPL,
      format: formatCurrency,
      sub: `${summary.frequencyToCPLRatio.toFixed(1)}x freq:CPL ratio`,
      tooltip: TOOLTIPS.trueCPL,
      traffic: getTrafficLight('trueCPL', summary.trueCPL, trafficCtx),
    },
  ];

  return (
    <div className="mb-4">
      {/* Squeeze banner */}
      {solver.result.squeezeAnalysis && (
        <motion.div
          className="mb-3 p-3 rounded-xl bg-amber-900/20 border border-amber-700/30"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div className="flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
              <path d="M12 9v4m0 4h.01M3.27 17l7.73-13.4a1.15 1.15 0 012 0L20.73 17a1.15 1.15 0 01-1 1.73H4.27a1.15 1.15 0 01-1-1.73z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="text-xs font-medium text-amber-300">{solver.result.squeezeAnalysis.message}</p>
              <p className="text-[10px] text-amber-400/70 mt-1">{solver.result.squeezeAnalysis.suggestion}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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
              {m.numericValue !== null && m.format
                ? <AnimatedNumber value={m.numericValue} format={m.format} />
                : m.displayValue
              }
            </div>
            {m.sub && (
              <div className="text-xs text-gray-400 mt-0.5">{m.sub}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
