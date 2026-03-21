export interface WizardStep {
  id: string;
  title: string;
  description: string;
  tips: string[];
  sectionRef?: string;
  icon: 'funnel' | 'target' | 'percent' | 'dollar' | 'layers' | 'chart';
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'welcome',
    title: 'How This Calculator Works',
    description:
      'This is a B2B funnel velocity calculator powered by a constraint solver. You tell it what you know — your revenue goal, deal size, conversion rates, budget — and it computes everything else. The left panel contains your inputs. The right panel shows live results as charts and metrics.',
    tips: [
      'Lock the variables you know (teal lock icon). Unlock what you want the solver to compute.',
      'Three modes: Forward (set inputs, compute revenue), Reverse (set revenue goal, compute required inputs), or Analysis (unlock everything to explore freely).',
      'Every change recalculates instantly — no "run" button needed.',
    ],
    icon: 'funnel',
  },
  {
    id: 'goals',
    title: 'Set Your Revenue Target',
    description:
      'Start with your annual new-business revenue target (ARR Goal) and your average deal size (ASP). The time horizon sets how many quarters to model. When you change the ASP, the calculator automatically adjusts conversion rates and sales velocity based on deal-size benchmarks — larger deals have longer cycles and lower conversion rates.',
    tips: [
      'Use your real ARR target and historical average contract value (ACV).',
      'The model adjusts funnel rates automatically when you change deal size — you\'ll see a notification showing what was adjusted.',
      'Start with 8 quarters for a realistic view. Extend to 12–16 for longer enterprise cycles.',
    ],
    sectionRef: 'Revenue & Deal Size',
    icon: 'target',
  },
  {
    id: 'funnel',
    title: 'Your Funnel Conversion Rates',
    description:
      'The funnel has four conversion stages: Account-to-Lead (targeting engagement), Lead-to-MQL (qualification), MQL-to-Opportunity (sales acceptance), and Opportunity-to-Close (win rate). Defaults are based on mid-market ABM benchmarks. Each rate can be independently locked or unlocked.',
    tips: [
      'If you know your win rate but not your lead rates, lock the win rate and unlock the others — the solver will compute what you need.',
      'Rates compound: a 1% improvement in Account-to-Lead ripples through every downstream stage.',
      'The color-coded health indicators on the dashboard show how your rates compare to industry benchmarks.',
    ],
    sectionRef: 'Funnel Rates',
    icon: 'percent',
  },
  {
    id: 'budget',
    title: 'Budget and Costs',
    description:
      'The cost model has two layers: frequency targeting (keeping accounts warm with monthly touches) and CPL-based lead generation (the cost of converting an account into a lead). You also set software costs per quarter and whether you use an agency for creative production. True B2B CPL is much higher than single-channel CPL because it captures the full targeting investment.',
    tips: [
      'Blended CPL should reflect your fully-loaded cost per account-level lead, not just one channel.',
      'Monthly frequency (touches per account per month) drives both cost and conversion improvement — higher frequency accelerates the funnel but costs more.',
      'Lock your total budget to see what conversion rates you need, or unlock it to see what budget your targets require.',
    ],
    sectionRef: 'Cost Parameters',
    icon: 'dollar',
  },
  {
    id: 'cohorts',
    title: 'Campaign Cohorts',
    description:
      'Cohorts let you model multiple campaign types running simultaneously. Each cohort has its own campaign profile (ABM, Competitive, Inbound for cold accounts, or Partner Leads, Founder-Led, Existing Pipeline for warm sources), start quarter, account count, and optional conversion rate overrides. Warm profiles have higher conversion rates but smaller volumes.',
    tips: [
      'Start with a single cohort. Add more later to model multi-channel or phased campaigns.',
      'Cold profiles follow the full Account-to-Lead-to-Close funnel. Warm profiles like "Existing Pipeline" skip directly to the Opportunity stage.',
      'Expand "Customize conversion rates" on any cohort to override the profile defaults.',
    ],
    sectionRef: 'Cohort Builder',
    icon: 'layers',
  },
  {
    id: 'results',
    title: 'Understanding Your Results',
    description:
      'The dashboard shows your projected funnel performance across five tabs: Timeline (revenue trajectory and conversion rates), Budget (cost breakdown and ROI crossover), Cohorts (per-cohort performance comparison), Sensitivity (what-if analysis), and Data (raw quarterly numbers). The hero metrics at the top show first revenue timing, pipeline generated, total investment, and true CPL with color-coded health indicators.',
    tips: [
      'Use the Timeline tab to see when revenue starts flowing and how it compounds over time.',
      'The Sensitivity tab lets you stress-test assumptions — see how changes to any variable affect outcomes.',
      'Save scenarios to compare different strategies side by side. Export a branded PDF report to share with stakeholders.',
    ],
    icon: 'chart',
  },
];
