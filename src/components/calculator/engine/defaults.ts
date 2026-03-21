import type {
  CampaignProfile,
  CampaignProfileId,
  CalculatorInputs,
  BudgetConfig,
  AdvancedConfig,
  GoalsConfig,
  FrequencyConfig,
  VelocityDistribution,
} from './types';
import type { SolverValues, LockState, LockPreset } from './solver-types';

// --- Frequency Boost Constants ---

export const FREQUENCY_BOOST_CONSTANTS = {
  peakFrequency: 20,         // touches/month where boost maxes out
  maxConversionBoost: 0.25,  // +25% to Lead→MQL and MQL→Opp at peak
  maxVelocityShift: 0.30,    // 30% interpolation toward front-loaded at peak
  belowBaselinePenalty: 0.10, // -10% conversion rate floor when frequency is near zero
};

// --- Campaign Profiles (PRD Section 5) ---

// Cold profile IDs for filtering
export const COLD_PROFILE_IDS: CampaignProfileId[] = ['abm', 'competitive', 'inbound'];
export const WARM_PROFILE_IDS: CampaignProfileId[] = ['partner', 'founder', 'existing_pipeline'];

export const CAMPAIGN_PROFILES: Record<CampaignProfileId, CampaignProfile> = {
  // --- Cold Profiles (full funnel: Account → Lead → MQL → Opp → Close) ---
  abm: {
    id: 'abm',
    label: 'ABM',
    description: 'Named account targeting, 1:1 or 1:few campaigns',
    category: 'cold',
    funnelEntry: 'account',
    chartColor: '#3B82F6',
    conversionRates: {
      accountToLead: 0.15,
      leadToMQL: 0.60,
      mqlToOpp: 0.27,
      oppToClose: 0.20,
    },
    velocityDistribution: {
      new:         [0.25, 0.35, 0.15, 0.25],
      maturing:    [0,    0.30, 0.40, 0.30],
      established: [0,    0,    0.35, 0.65],
      mature:      [0,    0,    0,    1.00],
    },
    defaultCPL: 450,
    defaultFrequency: 4,
    defaultCostPerTouch: 1.50,
    defaultASP: 100000,
    defaultSalesVelocity: 167,
    maxVelocityImprovement: 0.30,
    contentCostMultiplier: 1.0,
    typicalUseCase: 'Named account targeting, 1:1 or 1:few campaigns',
    defaultOnboardingCap: 750,
  },
  competitive: {
    id: 'competitive',
    label: 'Competitive / Technographic',
    description: 'Targeting competitor install base via technographic signals',
    category: 'cold',
    funnelEntry: 'account',
    chartColor: '#06B6D4',
    conversionRates: {
      accountToLead: 0.12,
      leadToMQL: 0.55,
      mqlToOpp: 0.25,
      oppToClose: 0.18,
    },
    velocityDistribution: {
      new:         [0.15, 0.25, 0.25, 0.35],
      maturing:    [0,    0.20, 0.35, 0.45],
      established: [0,    0,    0.30, 0.70],
      mature:      [0,    0,    0,    1.00],
    },
    defaultCPL: 500,
    defaultFrequency: 3,
    defaultCostPerTouch: 1.75,
    defaultASP: 100000,
    defaultSalesVelocity: 195,
    maxVelocityImprovement: 0.25,
    contentCostMultiplier: 1.0,
    typicalUseCase: 'Targeting competitor install base via technographic signals',
    defaultOnboardingCap: 1000,
  },
  inbound: {
    id: 'inbound',
    label: 'Inbound / Content',
    description: 'Content marketing, SEO, webinars, paid search',
    category: 'cold',
    funnelEntry: 'account',
    chartColor: '#10B981',
    conversionRates: {
      accountToLead: 0.20,
      leadToMQL: 0.50,
      mqlToOpp: 0.20,
      oppToClose: 0.22,
    },
    velocityDistribution: {
      new:         [0.35, 0.30, 0.20, 0.15],
      maturing:    [0,    0.40, 0.35, 0.25],
      established: [0,    0,    0.45, 0.55],
      mature:      [0,    0,    0,    1.00],
    },
    defaultCPL: 300,
    defaultFrequency: 5,
    defaultCostPerTouch: 1.00,
    defaultASP: 75000,
    defaultSalesVelocity: 120,
    maxVelocityImprovement: 0.20,
    contentCostMultiplier: 1.18,
    typicalUseCase: 'Content marketing, SEO, webinars, paid search',
    defaultOnboardingCap: 1500,
  },

  // --- Warm Profiles (high-conversion or pipeline-entry) ---
  partner: {
    id: 'partner',
    label: 'Partner Leads',
    description: 'Partner-referred warm leads with high middle-funnel conversion',
    category: 'warm',
    funnelEntry: 'account',
    chartColor: '#F59E0B',
    conversionRates: {
      accountToLead: 0.75,
      leadToMQL: 1.00,
      mqlToOpp: 1.00,
      oppToClose: 0.50,
    },
    velocityDistribution: {
      new:         [0.50, 0.30, 0.15, 0.05],
      maturing:    [0,    0.50, 0.35, 0.15],
      established: [0,    0,    0.60, 0.40],
      mature:      [0,    0,    0,    1.00],
    },
    defaultCPL: 200,
    defaultFrequency: 2,
    defaultCostPerTouch: 1.00,
    defaultASP: 100000,
    defaultSalesVelocity: 90,
    maxVelocityImprovement: 0.15,
    contentCostMultiplier: 0.5,
    typicalUseCase: 'Partner-referred leads with pre-existing vendor relationship',
    defaultOnboardingCap: 100,
    accountRange: { min: 5, max: 200, warnMax: 100 },
  },
  founder: {
    id: 'founder',
    label: 'Founder-Led',
    description: 'Founder-sourced deals through personal network and outreach',
    category: 'warm',
    funnelEntry: 'account',
    chartColor: '#F97316',
    conversionRates: {
      accountToLead: 0.90,
      leadToMQL: 1.00,
      mqlToOpp: 1.00,
      oppToClose: 0.40,
    },
    velocityDistribution: {
      new:         [0.60, 0.25, 0.10, 0.05],
      maturing:    [0,    0.60, 0.30, 0.10],
      established: [0,    0,    0.70, 0.30],
      mature:      [0,    0,    0,    1.00],
    },
    defaultCPL: 100,
    defaultFrequency: 1,
    defaultCostPerTouch: 0.50,
    defaultASP: 100000,
    defaultSalesVelocity: 60,
    maxVelocityImprovement: 0.10,
    contentCostMultiplier: 0.3,
    typicalUseCase: 'Founder-sourced deals through personal network and direct outreach',
    defaultOnboardingCap: 50,
    accountRange: { min: 3, max: 100, warnMax: 50 },
  },
  existing_pipeline: {
    id: 'existing_pipeline',
    label: 'Existing Pipeline',
    description: 'Opportunities already in your pipeline, entering at the Opp stage',
    category: 'warm',
    funnelEntry: 'opportunity',
    chartColor: '#EF4444',
    conversionRates: {
      accountToLead: 1.00,   // placeholder — bypassed
      leadToMQL: 1.00,       // placeholder — bypassed
      mqlToOpp: 1.00,        // placeholder — bypassed
      oppToClose: 0.35,
    },
    velocityDistribution: {
      new:         [0.40, 0.35, 0.15, 0.10],
      maturing:    [0,    0.45, 0.35, 0.20],
      established: [0,    0,    0.50, 0.50],
      mature:      [0,    0,    0,    1.00],
    },
    defaultCPL: 0,
    defaultFrequency: 0,
    defaultCostPerTouch: 0,
    defaultASP: 100000,
    defaultSalesVelocity: 120,
    maxVelocityImprovement: 0.10,
    contentCostMultiplier: 0,
    typicalUseCase: 'Existing qualified opportunities already in your sales pipeline',
    defaultOnboardingCap: 500,
    accountLabel: 'Existing Opportunities',
    accountRange: { min: 1, max: 500, warnMax: 200 },
  },
};

// --- Default Configurations ---

export const DEFAULT_FREQUENCY_CONFIG: FrequencyConfig = {
  monthlyFrequency: 2,
  costPerTouch: 15,
  tierMultipliers: {
    new: 1.0,
    inProgress: 1.5,
    pastLead: 2.0,
  },
};

export const DEFAULT_BUDGET: BudgetConfig = {
  blendedCPL: 500,
  softwareCostPerQuarter: 10000,
  agencyPercent: 0.40,
  inHouseCreative: false,
  frequencyConfig: { ...DEFAULT_FREQUENCY_CONFIG },
};

export const DEFAULT_ADVANCED: AdvancedConfig = {
  quarterlyDropoutRate: 0.15,
  salesVelocityDays: 75,
  maxVelocityImprovement: 0.20,
  quarterlyOnboardingCap: 750,
};

export const DEFAULT_GOALS: GoalsConfig = {
  arrGoal: 6000000,
  averageSellingPrice: 100000,
  companyStage: 'series-a',
};

// --- Unit Economics Constants (PRD 4.11.4) ---

export const UNIT_ECONOMICS_CONSTANTS = {
  grossMargin: 0.80,
  annualChurnRate: 0.12,
};

export const UNIT_ECONOMICS_THRESHOLDS = {
  ltvCac: { green: 3.0, amber: 1.5 },
  cacPaybackMonths: { green: 18, amber: 30 },
  newCacRatio: { green: 1.50, amber: 2.50 },
};

export const TRAP_THRESHOLDS = {
  tooGoodCAC: 0.5,
  salesCapacityOppsPerQ: 15,
  overestimatingLTV: 5.0,
};

export const PIPELINE_BENCHMARKS = {
  'series-a': { ratio: 5.0, label: 'Series A / Seed', description: 'Early-stage companies need 5:1 pipeline-to-marketing ratio to compensate for lower close rates and longer sales cycles while building repeatable motion.' },
  'growth': { ratio: 4.0, label: 'Growth Stage', description: 'Growth-stage companies with proven product-market fit target 4:1. More efficient conversion offsets lower required pipeline multiple.' },
  'high-growth': { ratio: 3.0, label: 'High Growth / Scale', description: 'At scale, higher close rates and larger deal sizes mean 3:1 pipeline coverage is sufficient. Below 3:1 signals pipeline risk.' },
} as const;

// --- Solver Defaults ---

export const DEFAULT_SOLVER_VALUES: SolverValues = {
  revenueGoal: 6_000_000,
  asp: 100_000,
  accounts: 0, // computed by solver on init
  totalBudget: 0, // computed by solver on init
  accountToLead: 0.15,
  leadToMQL: 0.60,
  mqlToOpp: 0.27,
  oppToClose: 0.20,
  blendedCPL: 500,
  timeHorizonQuarters: 8,
  monthlyFrequency: 2,
  costPerTouch: 15,
  softwareCostPerQuarter: 10_000,
};

export const DEFAULT_LOCK_STATE: LockState = {
  revenueGoal: true,
  asp: true,
  accounts: false,       // computed
  totalBudget: false,    // computed
  accountToLead: true,
  leadToMQL: true,
  mqlToOpp: true,
  oppToClose: true,
  blendedCPL: true,
  timeHorizonQuarters: true,
  monthlyFrequency: true,
  costPerTouch: true,
  softwareCostPerQuarter: true,
};

export const LOCK_PRESETS: LockPreset[] = [
  {
    id: 'forward',
    label: 'Forward Default',
    locks: { ...DEFAULT_LOCK_STATE },
  },
  {
    id: 'reverse',
    label: 'Reverse Default',
    locks: {
      revenueGoal: true,
      asp: true,
      accounts: false,
      totalBudget: true,
      accountToLead: false,
      leadToMQL: false,
      mqlToOpp: false,
      oppToClose: false,
      blendedCPL: true,
      timeHorizonQuarters: true,
      monthlyFrequency: true,
      costPerTouch: true,
      softwareCostPerQuarter: true,
    },
  },
  {
    id: 'minimal',
    label: 'All Unlocked',
    locks: {
      revenueGoal: true,
      asp: true,
      accounts: false,
      totalBudget: false,
      accountToLead: false,
      leadToMQL: false,
      mqlToOpp: false,
      oppToClose: false,
      blendedCPL: false,
      timeHorizonQuarters: true,
      monthlyFrequency: false,
      costPerTouch: false,
      softwareCostPerQuarter: false,
    },
  },
];

// --- Default Scenario Inputs ---

export function createDefaultInputs(): CalculatorInputs {
  // Backward-solve initial accounts from default ARR goal
  const abmRates = CAMPAIGN_PROFILES.abm.conversionRates;
  const fullConversion = abmRates.accountToLead * abmRates.leadToMQL * abmRates.mqlToOpp * abmRates.oppToClose;
  const dealsNeeded = DEFAULT_GOALS.arrGoal / DEFAULT_GOALS.averageSellingPrice;
  const initialAccounts = Math.round(dealsNeeded / fullConversion);

  return {
    goals: { ...DEFAULT_GOALS },
    cohorts: [
      {
        id: 'cohort-1',
        name: 'Cohort 1',
        profileId: 'abm',
        totalAccounts: initialAccounts,
        startQuarter: 0,
      },
    ],
    budget: {
      ...DEFAULT_BUDGET,
      frequencyConfig: { ...DEFAULT_FREQUENCY_CONFIG, tierMultipliers: { ...DEFAULT_FREQUENCY_CONFIG.tierMultipliers } },
    },
    advanced: { ...DEFAULT_ADVANCED },
    simulationQuarters: 8,
    startYear: 2026,
    startQ: 2,
    userOverrides: {},
  };
}

// --- Quarter Label Helper ---

export function getQuarterLabel(quarterIndex: number, startYear: number, startQ: number): string {
  const totalQ = startQ - 1 + quarterIndex;
  const year = startYear + Math.floor(totalQ / 4);
  const q = (totalQ % 4) + 1;
  return `Q${q} ${year}`;
}

// --- Tooltip Content (PRD Section 6.2) ---

export const TOOLTIPS: Record<string, string> = {
  // Input field tooltips (Section 6.2.1)
  totalAccounts: "The number of named accounts in your active targeting list for this cohort. This is not your TAM\u2014it's the subset you're actively running campaigns against in a given quarter. Typical ABM programs target 200\u20131,000 accounts per cohort depending on team size and budget.",
  accountToLead: "The percentage of targeted accounts that become qualified account-level leads over the full cohort lifecycle (spread across 4 quarters). An account qualifies as a \u2018lead\u2019 when multiple stakeholders within the buying committee have been engaged\u2014not when one person fills out a form. 15% is typical for mid-market ABM; enterprise-only motions often run 8\u201312%, while broader technographic targeting can reach 20\u201325%.",
  leadToMQL: "The percentage of account-level leads that meet your qualification criteria (BANT, MEDDIC, or custom scoring applied at the account level, not per-individual). 60% assumes a well-defined ICP and intent signals feeding the top of funnel. If you're casting a wide net, expect 40\u201350%. If your targeting is tight and enrichment data is strong, 65\u201375% is achievable.",
  mqlToOpp: "The percentage of MQLs that sales accepts and converts to a qualified pipeline opportunity. This is where marketing-sales alignment shows up in the numbers. 27% reflects a mature handoff process. Misaligned teams see 15\u201320%; highly aligned orgs with SDR follow-up within 24 hours reach 35\u201340%.",
  oppToClose: "Win rate on qualified pipeline. 20% is the B2B SaaS median for deals over $50K ACV. Below $50K, close rates often run 25\u201330%. Enterprise deals ($250K+) typically close at 12\u201318%. This rate applies to the final stage and is the hardest to influence from marketing alone.",
  blendedCPL: "Your average cost to generate one qualified account-level lead across all channels (ABM platforms, paid social, content syndication, SEM, events). Because each \u2018lead\u2019 represents an account with multiple stakeholders engaged\u2014not a single person\u2014the floor is $250 even for inbound motions. $450 is typical mid-market B2B. Niche ICPs with small addressable audiences can run $800\u2013$2,000.",
  averageSellingPrice: "Annual contract value per closed deal. This drives the revenue projection. If you sell multiple products or tiers, use the weighted average of your last 4 quarters of closed deals, not your list price.",
  arrGoal: "Your annual new-business revenue target. The calculator uses this to show progress-to-goal and compute how many accounts and how much budget you need. This should be net-new ARR only\u2014exclude expansion and renewal revenue.",
  softwareBudget: "Quarterly investment in marketing technology: MAP, CRM, enrichment/intent data platforms, and content tools. This is a fixed cost regardless of lead volume. The default assumes a mid-market stack (e.g., HubSpot/Marketo + Salesforce + ZoomInfo/6sense + Canva/TechValidate).",
  agencyPercent: "Content production costs as a percentage of media spend. At 40%, you're outsourcing most content (white papers, case studies, video, webinar production) to agencies or freelancers. Toggle to \u2018In-House\u2019 (10\u201315%) if you have a dedicated content/creative team.",
  dropoutRate: "Percentage of in-progress accounts removed from the targeting list each quarter. Accounts drop out when they're discovered to be ineligible, the ICP criteria change, or they show zero engagement after sustained targeting. 15% is conservative\u2014aggressive ICP refinement programs may see 20\u201325%.",
  monthlyFrequency: "The number of blended touches per account per month across all channels: display ads, email nurture, social, content syndication, and SDR outreach. 4 is a reasonable baseline for programs targeting 1,000+ accounts using primarily programmatic channels. Smaller, high-touch ABM programs (200\u2013500 accounts) may run 8\u201312. This drives the frequency targeting cost layer, which is separate from CPL-based lead gen costs.",
  costPerTouch: "Blended average cost of one account-level touch across your channel mix. At $1.50, the model reflects a mix weighted toward programmatic display ($0.03\u2013$0.10), paid social ($0.50\u2013$2.00), and email ($0.10\u2013$0.50). For programs with heavy direct engagement (SDR outreach at $15\u201325, direct mail at $10\u201315), increase to $3\u2013$5.",
  tierMultipliers: "Targeting intensity increases as accounts mature: new accounts get baseline frequency (1x), in-progress accounts in Q2+ get 1.5x, and accounts past the lead stage get 2x. This reflects how ABM programs actually work\u2014you increase pressure on accounts showing engagement to accelerate conversion, while newer accounts get lighter awareness-level targeting.",
  tierMultiplierSummary: "Frequency tier multipliers control how targeting intensity scales as accounts progress through your funnel. New accounts receive baseline frequency, while engaged accounts get progressively more touches. These multiply the monthly frequency when calculating targeting costs per account tier.",
  tierMultiplierNew: "Targeting intensity for accounts in their first quarter. At 1.0x, they receive the base monthly frequency. Lower (0.7x) for lighter initial awareness; higher (1.2x+) for high-intent accounts you want to engage immediately.",
  tierMultiplierInProgress: "Targeting intensity for accounts active 2+ quarters that haven\u2019t converted to leads. At 1.5x, they receive 50% more touches than new accounts. These accounts have absorbed initial messaging, so increased frequency helps push toward conversion.",
  tierMultiplierPastLead: "Targeting intensity for accounts that have converted to leads. At 2.0x, they receive double baseline frequency. The investment is justified because these accounts have demonstrated intent\u2014additional touches accelerate MQL qualification and keep your brand top-of-mind during evaluation.",
  inHouseCreative: "Controls the agency/production cost ratio. \u2018Outsourced\u2019 (40% of media) assumes agencies or freelancers produce most campaign assets. \u2018In-House\u2019 (10\u201315%) assumes a dedicated content/creative team handles production and only specialized work is outsourced.",
  salesVelocity: "The median number of days from qualified opportunity creation to signed contract. 167 days is typical for mid-market B2B SaaS deals in the $75K\u2013$150K ACV range involving 3\u20136 stakeholders. This determines the delay between opportunity creation and when closed revenue is recognized. Enterprise deals ($250K+) often run 200\u2013300 days; SMB deals ($25K\u2013$50K) run 90\u2013120 days.",
  velocityImprovement: "The maximum reduction in sales cycle length that focused targeting is expected to produce over time. Phases in at 10% per quarter, reaching full improvement by Q4. The improvement reflects better-qualified opportunities arriving with more buyer education and stakeholder alignment. 30% is the practical ceiling\u2014procurement timelines and legal review can't be eliminated by marketing alone.",

  // Velocity distribution tooltips (Section 6.2.2)
  velocityDistribution: "Leads don't arrive all at once. When you start targeting a new cohort, early quarters produce fewer conversions because the campaign is still accumulating data\u2014ad platforms need click signals to optimize, sales teams need engagement patterns to prioritize, and prospects need multiple touches before they respond. The distribution weights control how the total conversion spreads across quarters.",
  velocityQ1: "First-quarter output is always the weakest. Campaigns are still in learning mode\u2014ad algorithms haven't optimized, ABM signals are thin, and outbound cadences haven't completed their first full cycle. The 25% you see here isn't failure; it's the system warming up.",
  velocityQ2: "Peak conversion quarter for new cohorts. Campaign algorithms have enough data to optimize targeting. Prospects who were touched in Q+1 are now responding. Sales has engagement signals to prioritize outreach. This is where you start to see what the cohort is made of.",
  velocityQ3: "The dip. Most responsive accounts already converted in Q+1 and Q+2. The remaining 15% are longer-cycle prospects who need more nurture, or accounts where timing wasn't right initially but intent signals are now emerging.",
  velocityQ4: "The long tail. These are accounts that required the full nurture cycle\u2014multiple touchpoints across channels, internal champion development, and budget cycle alignment. In ABM, this quarter often produces the highest-value deals because these buyers were thorough in their evaluation.",

  // Output metric tooltips (Section 6.2.3)
  effectiveConversionRate: "The actual conversion rate observed in a given quarter, versus the total rate across the full cohort lifecycle. Early quarters always show lower effective rates because the velocity distribution is still ramping. This is the number your CEO sees and worries about\u2014the tooltip exists to explain why it's lower than the rate you promised.",
  firstRevenueQuarter: "The earliest quarter where at least one deal closes from the modeled cohorts. In a typical 4-stage B2B funnel with quarterly velocity distribution, this is usually Q+3 or Q+4 from the first cohort's start date. The lag is not a problem\u2014it's the physics of B2B sales cycles.",
  cumulativeRevenueVsSpend: "The crossover point where total closed revenue exceeds total marketing investment. For most B2B programs, this takes 4\u20136 quarters. Before this point, marketing is in \u2018investment mode.\u2019 After it, the engine is paying for itself and generating returns.",
  progressToGoal: "Cumulative closed-won revenue as a percentage of the annual new-business target. This is the headline metric for board reporting. Remember: the goal is annual, but the funnel is perpetual\u2014cohorts started late in the year will produce revenue that falls into next year's number.",
  trueCPL: "The fully-loaded cost to generate one account-level lead, including both the frequency targeting layer (cost of keeping all accounts under active targeting) and the CPL-based lead gen layer (marginal conversion cost). For typical mid-market ABM, this runs $3,000\u2013$10,000 per account-level lead. If this number surprises you, it's because most CPL metrics only capture the conversion event, not the targeting machine required to produce it.",
  frequencyVsCPL: "The ratio of pre-lead targeting spend to lead-generation spend. In a typical ABM program, frequency targeting costs 5\u201310x more than CPL-based costs because you're paying to keep the entire targeting list warm, not just the accounts that convert. This ratio is the clearest illustration of why marketing ROI takes quarters to materialize\u2014the investment is front-loaded and continuous, while conversions trickle in.",
  currentSalesVelocity: "The effective sales cycle length for the current program quarter, accounting for the velocity improvement curve. At program start this equals your baseline (default 167 days). By Q4 it reaches the improved rate (default 117 days). Displayed alongside \u2018Days Saved\u2019 to show the compounding benefit of focused targeting on deal cycle compression.",
  daysSaved: "The cumulative reduction in sales cycle days since program launch. At full improvement (30% of 167 days), this equals 50 days faster. Frame this as ROI of focused targeting: \u201cDeals now close 50 days faster than when we started, because buyers arrive better educated and more aligned.\u201d",

  // Unit Economics & ASP Scaling tooltips (PRD 4.11, Section C.5)
  investmentPeriod: "The quarters between first marketing spend and first closed revenue. During this period, triggers are firing but prospects are still traversing the information-seeking cycle. Length driven by velocity distribution and sales velocity.",
  ltvCac: "Lifetime customer value divided by fully-loaded acquisition cost. 3:1 is the minimum for sustainable B2B SaaS. Below 1.5:1 means you\u2019re spending more to acquire customers than they will return. Calculated using your ASP, an assumed 80% gross margin, and 12% annual churn.",
  cacPayback: "Months to recover your customer acquisition cost from gross profit. The 2025 median for private SaaS is 23 months. Under 18 months is strong. Over 30 months means you\u2019re carrying unprofitable customers for 2+ years before breaking even.",
  newCacRatio: "Total sales and marketing spend divided by new ARR acquired. The 2024 industry median is $2.00 per $1 of new ARR. Top-quartile companies achieve $1.00. If you\u2019re above $2.50, your acquisition engine is inefficient relative to peers.",
  aspAdjustment: "Conversion rates and sales velocity are automatically scaled based on your Average Selling Price. Smaller deals close faster and at higher rates; larger deals take longer and close less frequently. This reflects empirical data across 847+ B2B SaaS companies. You can override any adjusted value in the Advanced panel.",
  companyStage: "Your company stage determines the recommended pipeline-to-marketing ratio. Series A companies need 5:1 because close rates are still being proven. Growth companies target 4:1 with more efficient conversion. High-growth/scale companies can operate at 3:1 with proven sales engines.",
  pipeline: "Total pipeline value = opportunities created \u00D7 average selling price. This is the dollar value of all qualified opportunities generated by your marketing investment, regardless of whether they close. Pipeline is the leading indicator of future revenue.",
  onboardingCap: "Maximum new accounts activated per quarter. ABM teams can typically onboard 500\u20131,500 accounts per quarter depending on team size and campaign complexity (ITSMA/Forrester benchmarks). Accounts beyond this cap are queued for activation in subsequent quarters, each batch starting its own lead velocity curve from its activation date. Set higher for programmatic campaigns, lower for high-touch ABM.",
  pipelineRatio: "Pipeline generated per dollar of marketing investment. This ratio indicates whether your marketing engine is generating enough pipeline to sustain growth. The benchmark depends on company stage: Series A needs 5:1, Growth needs 4:1, High Growth needs 3:1.",
  frequencyBoost: "Higher monthly frequency improves Lead\u2192MQL and MQL\u2192Opp conversion rates (up to +25% at 20 touches/month) and pulls leads forward in the timeline. Beyond 20 touches/month, returns diminish due to audience fatigue. The boost is relative to each campaign profile\u2019s default frequency.",
};
