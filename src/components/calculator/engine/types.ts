// Campaign profile identifiers
export type CampaignProfileId = 'abm' | 'competitive' | 'inbound' | 'partner' | 'founder' | 'existing_pipeline';

// Campaign profile category
export type ProfileCategory = 'cold' | 'warm';

// Where in the funnel a profile enters
export type FunnelEntry = 'account' | 'opportunity';

// Velocity distribution across Q+1 through Q+4 for each cohort age
export interface VelocityDistribution {
  new: [number, number, number, number];       // Q+1, Q+2, Q+3, Q+4
  maturing: [number, number, number, number];   // —, Q+2, Q+3, Q+4
  established: [number, number, number, number]; // —, —, Q+3, Q+4
  mature: [number, number, number, number];      // —, —, —, Q+4
}

// Conversion rates through the funnel
export interface ConversionRates {
  accountToLead: number;   // e.g., 0.15 for 15%
  leadToMQL: number;
  mqlToOpp: number;
  oppToClose: number;
}

// A single cohort of target accounts
export interface CohortDefinition {
  id: string;
  name: string;
  profileId: CampaignProfileId;
  totalAccounts: number;
  startQuarter: number; // 0-indexed offset from simulation start
  accountsOverridden?: boolean; // true if user manually set totalAccounts
  conversionOverrides?: Partial<ConversionRates>;
  velocityOverrides?: Partial<VelocityDistribution>;
}

// Frequency targeting configuration
export interface FrequencyConfig {
  monthlyFrequency: number;       // touches per account per month
  costPerTouch: number;           // $ per touch
  tierMultipliers: {
    new: number;           // 1.0x
    inProgress: number;    // 1.5x
    pastLead: number;      // 2.0x
  };
}

// Budget configuration
export interface BudgetConfig {
  blendedCPL: number;                    // default $450
  softwareCostPerQuarter: number;        // default $32,287.50
  agencyPercent: number;                 // default 0.40
  inHouseCreative: boolean;              // toggle: false=outsourced(40%), true=in-house(12%)
  frequencyConfig: FrequencyConfig;
}

// Advanced settings
export interface AdvancedConfig {
  quarterlyDropoutRate: number;   // default 0.15
  salesVelocityDays: number;     // default 167
  maxVelocityImprovement: number; // default 0.30
  quarterlyOnboardingCap: number; // max new accounts activated per quarter (default 750)
}

// Company stage for pipeline benchmarks
export type CompanyStage = 'series-a' | 'growth' | 'high-growth';

// Goals
export interface GoalsConfig {
  arrGoal: number;           // default $6,000,000
  averageSellingPrice: number; // default $100,000
  companyStage: CompanyStage;  // default 'series-a'
}

// Complete calculator inputs
export interface CalculatorInputs {
  goals: GoalsConfig;
  cohorts: CohortDefinition[];
  budget: BudgetConfig;
  advanced: AdvancedConfig;
  simulationQuarters: number; // default 8
  startYear: number;          // e.g., 2025
  startQ: number;             // 1-4, e.g., 2 for Q2
  userOverrides: UserOverrides;
}

// --- Output types ---

// Account state tracking per cohort per quarter
export interface AccountState {
  newAccounts: number;
  inProgressAccounts: number;
  pastLeadAccounts: number;
  droppedOut: number;
  convertedToLead: number;
  totalActive: number;
}

// Quarterly metrics per cohort
export interface CohortQuarterlyData {
  quarter: number;
  quarterLabel: string;
  accountState: AccountState;
  leads: number;
  mqls: number;
  opportunities: number;
  closedWon: number;
  revenue: number;
  frequencyCost: number;
  cplCost: number;
  softwareCost: number;
  agencyCost: number;
  totalCost: number;
}

// Aggregated quarterly output across all cohorts
export interface QuarterlyOutput {
  quarter: number;
  quarterLabel: string;
  leads: number;
  mqls: number;
  opportunities: number;
  closedWon: number;
  pipeline: number;             // opportunities × ASP
  revenue: number;
  cumulativeRevenue: number;
  frequencyCost: number;
  cplCost: number;
  softwareCost: number;
  agencyCost: number;
  totalCost: number;
  cumulativeCost: number;
}

// Per-cohort output
export interface CohortOutput {
  cohortId: string;
  cohortName: string;
  profileId: CampaignProfileId;
  quarterlyData: CohortQuarterlyData[];
  totals: {
    leads: number;
    mqls: number;
    opportunities: number;
    closedWon: number;
    revenue: number;
    totalCost: number;
  };
}

// Summary metrics
export interface SummaryMetrics {
  firstRevenueQuarter: number | null;
  firstRevenueQuarterLabel: string;
  firstRevenueAmount: number;
  totalInvestment: number;
  totalRevenue: number;
  trueCPL: number;                 // (frequency + CPL cost) / total leads
  totalLeads: number;
  totalClosedWon: number;
  roi: number;                     // (revenue - investment) / investment
  progressToGoal: number;          // cumulative revenue / ARR goal
  crossoverQuarter: number | null; // quarter where cum revenue > cum cost
  crossoverQuarterLabel: string;
  currentSalesVelocity: number;    // effective days at last quarter
  daysSavedVsBaseline: number;
  frequencyToCPLRatio: number;     // total frequency cost / total CPL cost
  effectiveCAC: number;            // total investment / closed won
  totalPipeline: number;           // total opportunities × ASP
  pipelineToMarketingRatio: number; // total pipeline / total investment
  unitEconomics: UnitEconomicsMetrics;
  trapWarnings: TrapWarning[];
}

// Complete calculator outputs
export interface CalculatorOutputs {
  quarterly: QuarterlyOutput[];
  cohorts: CohortOutput[];
  summary: SummaryMetrics;
}

// Validation
export type ValidationSeverity = 'valid' | 'warning' | 'error';

export interface ValidationResult {
  field: string;
  severity: ValidationSeverity;
  message: string;
}

// Scenario
export interface Scenario {
  id: string;
  name: string;
  inputs: CalculatorInputs;
  solverValues?: import('./solver-types').SolverValues;
  solverLocks?: import('./solver-types').LockState;
  createdAt: number;
  updatedAt: number;
}

// --- ASP Scaling (PRD 4.11) ---

export interface ASPScalingBand {
  minASP: number;
  maxASP: number;
  oppToCloseAdj: number;
  salesVelocityDays: number;
  mqlToOppAdj: number;
  leadToMQLAdj: number;
  defaultCPL: number;
  label: string;
}

export interface ASPScalingResult {
  oppToCloseAdj: number;
  salesVelocityDays: number;
  mqlToOppAdj: number;
  leadToMQLAdj: number;
  suggestedCPL: number;
  bandLabel: string;
}

// Tracks which fields the user has manually overridden
export interface UserOverrides {
  salesVelocityDays?: boolean;
  blendedCPL?: boolean;
}

// --- Unit Economics (PRD 4.11.4) ---

export interface UnitEconomicsMetrics {
  ltvCacRatio: number;
  cacPaybackMonths: number;
  newCacRatio: number;
  ltv: number;
  cac: number;
  grossMargin: number;
  annualChurnRate: number;
}

export type TrafficLightStatus = 'green' | 'amber' | 'red';

export interface TrapWarning {
  id: 'too-good-cac' | 'sales-capacity' | 'overestimating-ltv';
  message: string;
  severity: 'warning';
}

// Campaign profile definition
export interface CampaignProfile {
  id: CampaignProfileId;
  label: string;
  description: string;
  category: ProfileCategory;        // 'cold' = full funnel, 'warm' = high-conversion or pipeline
  funnelEntry: FunnelEntry;          // 'account' = full funnel, 'opportunity' = skips lead stages
  chartColor: string;                // profile-specific color for charts
  conversionRates: ConversionRates;
  velocityDistribution: VelocityDistribution;
  defaultCPL: number;
  defaultFrequency: number;
  defaultCostPerTouch: number;
  defaultASP: number;
  defaultSalesVelocity: number;
  maxVelocityImprovement: number;
  contentCostMultiplier: number;     // 1.0 = baseline, 1.18 = 18% premium for inbound
  typicalUseCase: string;
  defaultOnboardingCap: number;      // max accounts activatable per quarter for this profile
  accountLabel?: string;             // custom label (e.g., "Existing Opportunities")
  accountRange?: { min: number; max: number; warnMax: number };
}
