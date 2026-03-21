import type { FrequencyConfig, BudgetConfig, CampaignProfileId } from './types';
import { CAMPAIGN_PROFILES } from './defaults';
import { shiftVelocityWeights } from './frequency-boost';

/**
 * Calculate frequency targeting cost for one quarter given account counts.
 * Extracted from calculate.ts for reuse by the solver engine.
 */
export function calcFrequencyCost(
  newAccounts: number,
  inProgressAccounts: number,
  pastLeadAccounts: number,
  freq: FrequencyConfig,
): number {
  const { monthlyFrequency, costPerTouch, tierMultipliers } = freq;
  const m = 3; // months per quarter
  return (
    newAccounts * tierMultipliers.new * monthlyFrequency * costPerTouch * m +
    inProgressAccounts * tierMultipliers.inProgress * monthlyFrequency * costPerTouch * m +
    pastLeadAccounts * tierMultipliers.pastLead * monthlyFrequency * costPerTouch * m
  );
}

/**
 * Build a per-quarter schedule of how many NEW accounts activate.
 * Returns an array of length `totalQuarters` where schedule[q] is
 * the number of new accounts that begin targeting in quarter q.
 *
 * If cap >= totalAccounts, all accounts load at startQuarter (legacy behavior).
 */
export function buildOnboardingSchedule(
  totalAccounts: number,
  startQuarter: number,
  totalQuarters: number,
  cap: number,
): number[] {
  const schedule = new Array(totalQuarters).fill(0);
  if (cap >= totalAccounts) {
    if (startQuarter < totalQuarters) schedule[startQuarter] = totalAccounts;
    return schedule;
  }
  let remaining = totalAccounts;
  for (let q = startQuarter; q < totalQuarters && remaining > 0; q++) {
    const batch = Math.min(cap, remaining);
    schedule[q] = batch;
    remaining -= batch;
  }
  return schedule;
}

/**
 * Estimate total budget required to target a given number of accounts
 * over a given number of quarters with a specific campaign profile.
 *
 * This is a simplified steady-state estimate used by the solver engine
 * to check budget feasibility without running a full simulation.
 */
export function estimateBudgetForAccounts(
  totalAccounts: number,
  profileId: CampaignProfileId,
  budget: BudgetConfig,
  quarters: number,
  dropoutRate: number,
  onboardingCap: number = totalAccounts,
): number {
  const profile = CAMPAIGN_PROFILES[profileId];

  // Opportunity-entry profiles have no lead gen costs (only software)
  if (profile.funnelEntry === 'opportunity') {
    return budget.softwareCostPerQuarter * quarters;
  }

  const accountToLead = profile.conversionRates.accountToLead;
  const agencyRate = budget.inHouseCreative ? 0.12 : budget.agencyPercent;
  const velocityWeights = shiftVelocityWeights(
    profile.velocityDistribution.new,
    budget.frequencyConfig.monthlyFrequency,
    profile.defaultFrequency,
  );

  const schedule = buildOnboardingSchedule(totalAccounts, 0, quarters, onboardingCap);

  let totalCost = 0;
  let inProgressAccounts = 0;
  let pastLeadAccounts = 0;

  for (let q = 0; q < quarters; q++) {
    const newAccts = schedule[q];

    // Leads this quarter: sum velocity contributions from all prior batches
    let leadsThisQ = 0;
    for (let batchQ = 0; batchQ <= q; batchQ++) {
      if (schedule[batchQ] <= 0) continue;
      const offset = q - batchQ;
      if (offset < 4) {
        leadsThisQ += schedule[batchQ] * accountToLead * velocityWeights[offset];
      }
    }

    // Frequency cost
    const freqCost = calcFrequencyCost(
      newAccts,
      inProgressAccounts,
      pastLeadAccounts,
      budget.frequencyConfig,
    );

    // CPL cost
    const cplCost = leadsThisQ * budget.blendedCPL;

    // Agency cost
    const agencyCost = cplCost * agencyRate * profile.contentCostMultiplier;

    // Software (flat per quarter)
    const softwareCost = budget.softwareCostPerQuarter;

    totalCost += freqCost + cplCost + agencyCost + softwareCost;

    // Update account lifecycle for next quarter
    const afterConversion = Math.max(0, inProgressAccounts - leadsThisQ);
    const dropped = afterConversion * dropoutRate;
    inProgressAccounts = Math.max(0, afterConversion - dropped) + newAccts;
    pastLeadAccounts += leadsThisQ;
  }

  return totalCost;
}
