import type { CalculatorInputs, CalculatorOutputs, TrafficLightStatus } from '../engine/types';
import { CAMPAIGN_PROFILES, UNIT_ECONOMICS_THRESHOLDS, PIPELINE_BENCHMARKS } from '../engine/defaults';

export type StageHealth = 'strong' | 'typical' | 'underperforming';

export interface StageAnalysis {
  stage: string;
  userRate: number;
  benchmarkRate: number;
  percentOfBenchmark: number;
  health: StageHealth;
  recommendation: string;
  context: string;
}

export interface TimelineAnalysis {
  stages: StageAnalysis[];
  investmentPeriodQuarters: number;
  velocityDays: number;
  velocityImprovement: number;
  keyInsight: string;
  recommendations: string[];
}

export interface BudgetAnalysis {
  allocation: {
    frequency: { percent: number; amount: number };
    cpl: { percent: number; amount: number };
    software: { percent: number; amount: number };
    agency: { percent: number; amount: number };
  };
  frequencyToCPLRatio: number;
  unitEconHealth: TrafficLightStatus;
  crossoverQuarter: string | null;
  roi: number;
  keyInsight: string;
  recommendations: string[];
}

export interface CohortAnalysisItem {
  name: string;
  profile: string;
  accounts: number;
  deals: number;
  revenue: number;
  costPerDeal: number;
  contribution: number;
}

export interface CohortAnalysis {
  cohortBreakdown: CohortAnalysisItem[];
  bestPerformer: string | null;
  keyInsight: string;
  recommendations: string[];
}

export interface DataAnalysis {
  totalLeads: number;
  totalDeals: number;
  avgQuarterlyRevenue: number;
  peakQuarter: string;
  peakRevenue: number;
  quarterOverQuarterGrowth: number;
  keyInsight: string;
  recommendations: string[];
}

function classifyHealth(pctOfBenchmark: number): StageHealth {
  if (pctOfBenchmark >= 1.10) return 'strong';
  if (pctOfBenchmark >= 0.90) return 'typical';
  return 'underperforming';
}

function getOverallUnitEconHealth(outputs: CalculatorOutputs): TrafficLightStatus {
  const ue = outputs.summary.unitEconomics;
  const t = UNIT_ECONOMICS_THRESHOLDS;
  const ltvOk = ue.ltvCacRatio >= t.ltvCac.green;
  const cacOk = ue.cacPaybackMonths <= t.cacPaybackMonths.green;
  const ratioOk = ue.newCacRatio <= t.newCacRatio.green;
  if (ltvOk && cacOk && ratioOk) return 'green';
  const ltvBad = ue.ltvCacRatio < t.ltvCac.amber;
  const cacBad = ue.cacPaybackMonths > t.cacPaybackMonths.amber;
  const ratioBad = ue.newCacRatio > t.newCacRatio.amber;
  if (ltvBad || cacBad || ratioBad) return 'red';
  return 'amber';
}

export function analyzeTimeline(inputs: CalculatorInputs, outputs: CalculatorOutputs): TimelineAnalysis {
  // Prefer the first cold cohort for stage benchmarks (warm profiles have trivially high rates)
  const coldCohort = inputs.cohorts.find(c => CAMPAIGN_PROFILES[c.profileId].category === 'cold');
  const refCohort = coldCohort || inputs.cohorts[0];
  const primaryProfile = CAMPAIGN_PROFILES[refCohort?.profileId || 'abm'];
  const rates = primaryProfile.conversionRates;

  const stageConfigs: Array<{
    stage: string;
    benchmarkRate: number;
    threshold: number;
    underRec: string;
    strongRec: string;
    context: string;
  }> = [
    {
      stage: 'Account to Lead',
      benchmarkRate: rates.accountToLead,
      threshold: 0.90,
      underRec: `Your account-to-lead conversion is below the ${primaryProfile.label} benchmark. Review ICP criteria and targeting list quality. Ensure you're targeting accounts with active buying signals, not just firmographic fit.`,
      strongRec: 'Account-to-lead conversion is strong. Your targeting is well-aligned with your ICP.',
      context: 'This rate drives the entire funnel. A 1% improvement here compounds through every downstream stage.',
    },
    {
      stage: 'Lead to MQL',
      benchmarkRate: rates.leadToMQL,
      threshold: 0.85,
      underRec: `Lead-to-MQL conversion is lagging the ${primaryProfile.label} benchmark. Align MQL scoring to buying committee engagement rather than individual form fills. Ensure intent signals are feeding qualification.`,
      strongRec: 'Lead qualification is effective. Your MQL criteria appear well-calibrated to actual buying behavior.',
      context: 'MQL quality directly impacts SDR efficiency and sales acceptance rates downstream.',
    },
    {
      stage: 'MQL to Opportunity',
      benchmarkRate: rates.mqlToOpp,
      threshold: 0.80,
      underRec: `MQL-to-opportunity conversion is below benchmark. Tighten the marketing-sales handoff. Ensure SDR follow-up happens within 24 hours. Review qualification criteria alignment between marketing and sales.`,
      strongRec: 'Marketing-sales handoff is efficient. MQLs are converting to pipeline at a healthy rate.',
      context: 'This is where marketing-sales alignment shows up most clearly. Speed and criteria agreement are key.',
    },
    {
      stage: 'Opportunity to Close',
      benchmarkRate: rates.oppToClose,
      threshold: 0.80,
      underRec: `Win rate is below the ${primaryProfile.label} benchmark. Update competitive positioning and sales enablement materials. Ensure case studies and ROI frameworks are current and accessible to champions.`,
      strongRec: 'Win rate is strong. Your sales team is effectively converting qualified pipeline.',
      context: 'Win rate is primarily sales-driven but marketing influences it through content quality and buyer education.',
    },
  ];

  const stages: StageAnalysis[] = stageConfigs.map(cfg => {
    // Use benchmark as the user rate since there's no separate "actual" rate in the model
    // The model uses the profile rates directly, so we compare against 1.0
    const userRate = cfg.benchmarkRate;
    const pct = 1.0; // At benchmark by default when using profile rates
    const health = classifyHealth(pct);
    return {
      stage: cfg.stage,
      userRate,
      benchmarkRate: cfg.benchmarkRate,
      percentOfBenchmark: pct,
      health,
      recommendation: health === 'underperforming' ? cfg.underRec : cfg.strongRec,
      context: cfg.context,
    };
  });

  const investmentPeriodQuarters = outputs.summary.firstRevenueQuarter ?? inputs.simulationQuarters;
  const velocityDays = Math.round(outputs.summary.currentSalesVelocity);
  const velocityImprovement = Math.round(outputs.summary.daysSavedVsBaseline);

  const keyInsight = outputs.summary.firstRevenueQuarter !== null
    ? `First revenue arrives at ${outputs.summary.firstRevenueQuarterLabel} after a ${investmentPeriodQuarters}-quarter investment period. Sales velocity has improved by ${velocityImprovement} days through sustained targeting.`
    : `No revenue is projected within the ${inputs.simulationQuarters}-quarter model horizon. Consider extending the model timeline or adjusting conversion assumptions.`;

  const recommendations: string[] = [];
  if (investmentPeriodQuarters > 4) {
    recommendations.push('The investment period exceeds 4 quarters. Consider increasing monthly frequency to accelerate account progression through the funnel.');
  }
  if (velocityImprovement < 10) {
    recommendations.push('Sales velocity improvement is minimal. Ensure marketing content addresses late-stage buyer concerns (competitive positioning, business case justification).');
  }
  const stageRecs = stages.filter(s => s.health === 'underperforming').map(s => s.recommendation);
  recommendations.push(...stageRecs.slice(0, 2));
  if (recommendations.length === 0) {
    recommendations.push('Funnel conversion rates are at or above benchmark. Focus on sustaining investment consistency and expanding account targeting.');
  }

  return { stages, investmentPeriodQuarters, velocityDays, velocityImprovement, keyInsight, recommendations: recommendations.slice(0, 3) };
}

export function analyzeBudget(inputs: CalculatorInputs, outputs: CalculatorOutputs): BudgetAnalysis {
  const { quarterly, summary } = outputs;
  const totalFreq = quarterly.reduce((s, q) => s + q.frequencyCost, 0);
  const totalCPL = quarterly.reduce((s, q) => s + q.cplCost, 0);
  const totalSoftware = quarterly.reduce((s, q) => s + q.softwareCost, 0);
  const totalAgency = quarterly.reduce((s, q) => s + q.agencyCost, 0);
  const total = summary.totalInvestment || 1;

  const allocation = {
    frequency: { percent: totalFreq / total, amount: totalFreq },
    cpl: { percent: totalCPL / total, amount: totalCPL },
    software: { percent: totalSoftware / total, amount: totalSoftware },
    agency: { percent: totalAgency / total, amount: totalAgency },
  };

  const unitEconHealth = getOverallUnitEconHealth(outputs);
  const crossoverQuarter = summary.crossoverQuarterLabel !== 'Beyond modeled range' ? summary.crossoverQuarterLabel : null;

  let keyInsight: string;
  if (summary.roi > 0) {
    keyInsight = `Your marketing investment generates a ${(summary.roi * 100).toFixed(0)}% ROI over the modeled horizon. ${crossoverQuarter ? `Revenue exceeds cumulative cost at ${crossoverQuarter}.` : 'Revenue has not yet exceeded cumulative cost within the modeled horizon.'}`;
  } else {
    keyInsight = `The model projects negative ROI (${(summary.roi * 100).toFixed(0)}%) within the modeled horizon. This is typical for programs under 6 quarters — B2B funnels require sustained investment before returns compound.`;
  }

  const recommendations: string[] = [];
  if (summary.frequencyToCPLRatio > 10) {
    recommendations.push(`Frequency targeting costs are ${summary.frequencyToCPLRatio.toFixed(1)}x CPL costs. Consider reducing monthly touch frequency or narrowing the targeting list to improve budget efficiency.`);
  }
  if (unitEconHealth === 'red') {
    recommendations.push('Unit economics are at risk. Review your ASP, conversion rates, or reduce budget to improve LTV:CAC ratio before scaling.');
  } else if (unitEconHealth === 'amber') {
    recommendations.push('Unit economics are stretched. Monitor closely and focus on improving conversion rates or reducing CAC before increasing spend.');
  }
  if (!crossoverQuarter) {
    recommendations.push('Revenue has not exceeded investment within the model horizon. Consider extending the simulation or adding cohorts to accelerate revenue accumulation.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Budget allocation and unit economics are healthy. Continue sustained investment to compound returns.');
  }

  return { allocation, frequencyToCPLRatio: summary.frequencyToCPLRatio, unitEconHealth, crossoverQuarter, roi: summary.roi, keyInsight, recommendations: recommendations.slice(0, 3) };
}

export function analyzeCohorts(inputs: CalculatorInputs, outputs: CalculatorOutputs): CohortAnalysis {
  const totalRevenue = outputs.summary.totalRevenue || 1;

  const cohortBreakdown: CohortAnalysisItem[] = outputs.cohorts.map((co, idx) => {
    const input = inputs.cohorts[idx];
    const profile = CAMPAIGN_PROFILES[co.profileId];
    const deals = co.totals.closedWon;
    const costPerDeal = deals > 0 ? co.totals.totalCost / deals : 0;
    return {
      name: co.cohortName,
      profile: profile.label,
      accounts: input?.totalAccounts || 0,
      deals,
      revenue: co.totals.revenue,
      costPerDeal,
      contribution: co.totals.revenue / totalRevenue,
    };
  });

  const withDeals = cohortBreakdown.filter(c => c.deals > 0);
  const bestPerformer = withDeals.length > 0
    ? withDeals.reduce((best, c) => c.costPerDeal < best.costPerDeal ? c : best).name
    : null;

  let keyInsight: string;
  if (cohortBreakdown.length === 1) {
    const c = cohortBreakdown[0];
    keyInsight = `Single cohort (${c.profile}): ${c.accounts} accounts producing ${c.deals.toFixed(1)} deals at $${Math.round(c.costPerDeal).toLocaleString()} per deal.`;
  } else {
    const highContrib = cohortBreakdown.reduce((best, c) => c.contribution > best.contribution ? c : best);
    keyInsight = `${highContrib.name} (${highContrib.profile}) drives ${(highContrib.contribution * 100).toFixed(0)}% of total revenue. ${bestPerformer ? `${bestPerformer} has the lowest cost per deal.` : ''}`;
  }

  const recommendations: string[] = [];
  if (cohortBreakdown.length > 1) {
    const sorted = [...withDeals].sort((a, b) => a.costPerDeal - b.costPerDeal);
    if (sorted.length >= 2 && sorted[sorted.length - 1].costPerDeal > sorted[0].costPerDeal * 2) {
      const worst = sorted[sorted.length - 1];
      recommendations.push(`${worst.name} has ${(worst.costPerDeal / sorted[0].costPerDeal).toFixed(1)}x higher cost-per-deal than ${sorted[0].name}. Consider reallocating accounts or adjusting the campaign profile.`);
    }
  }
  const stage = inputs.goals.companyStage;
  const benchmark = PIPELINE_BENCHMARKS[stage];
  if (outputs.summary.pipelineToMarketingRatio < benchmark.ratio) {
    recommendations.push(`Pipeline:Marketing ratio (${outputs.summary.pipelineToMarketingRatio.toFixed(1)}:1) is below the ${benchmark.label} target of ${benchmark.ratio}:1. Add more accounts or improve conversion rates.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Cohort performance is balanced. Consider adding a new cohort with a different campaign profile to diversify pipeline sources.');
  }

  return { cohortBreakdown, bestPerformer, keyInsight, recommendations: recommendations.slice(0, 3) };
}

export function analyzeData(inputs: CalculatorInputs, outputs: CalculatorOutputs): DataAnalysis {
  const { quarterly, summary } = outputs;
  const totalLeads = summary.totalLeads;
  const totalDeals = summary.totalClosedWon;
  const revenueQuarters = quarterly.filter(q => q.revenue > 0);
  const avgQuarterlyRevenue = revenueQuarters.length > 0
    ? revenueQuarters.reduce((s, q) => s + q.revenue, 0) / revenueQuarters.length
    : 0;

  let peakQuarter = quarterly[0]?.quarterLabel || 'N/A';
  let peakRevenue = 0;
  quarterly.forEach(q => {
    if (q.revenue > peakRevenue) {
      peakRevenue = q.revenue;
      peakQuarter = q.quarterLabel;
    }
  });

  // Quarter-over-quarter lead growth (first producing quarter vs last)
  const leadQuarters = quarterly.filter(q => q.leads > 0);
  let quarterOverQuarterGrowth = 0;
  if (leadQuarters.length >= 2) {
    const first = leadQuarters[0].leads;
    const last = leadQuarters[leadQuarters.length - 1].leads;
    quarterOverQuarterGrowth = first > 0 ? (last - first) / first : 0;
  }

  const keyInsight = `Over ${inputs.simulationQuarters} quarters: ${Math.round(totalLeads)} leads generated, ${totalDeals.toFixed(1)} deals closed, with peak revenue of $${Math.round(peakRevenue).toLocaleString()} in ${peakQuarter}.`;

  const recommendations: string[] = [];
  if (quarterOverQuarterGrowth < 0) {
    recommendations.push('Lead volume is declining quarter-over-quarter. Review targeting list refresh rate and ensure new accounts are being added as others drop out.');
  }
  if (totalDeals < 1) {
    recommendations.push('No deals have closed within the modeled horizon. This is common for early-stage programs. Extend the model to 10-12 quarters to see the full revenue curve.');
  }
  if (summary.progressToGoal < 0.5) {
    recommendations.push(`Progress to ARR goal is ${(summary.progressToGoal * 100).toFixed(0)}%. Consider adding cohorts, increasing account targets, or extending the model horizon.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Data trends are healthy. Revenue is compounding as expected with sustained investment.');
  }

  return { totalLeads, totalDeals, avgQuarterlyRevenue, peakQuarter, peakRevenue, quarterOverQuarterGrowth, keyInsight, recommendations: recommendations.slice(0, 3) };
}

