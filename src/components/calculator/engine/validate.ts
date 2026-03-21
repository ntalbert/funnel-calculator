import type { CalculatorInputs, ValidationResult } from './types';
import { CAMPAIGN_PROFILES } from './defaults';

/** Validate all inputs, returning tiered warnings per PRD Section 7 */
export function validate(inputs: CalculatorInputs): ValidationResult[] {
  const results: ValidationResult[] = [];
  const { goals, cohorts, budget, advanced } = inputs;

  // --- Individual field validation (PRD 7.1) ---

  for (const cohort of cohorts) {
    const prefix = cohorts.length > 1 ? `${cohort.name}: ` : '';
    const profile = CAMPAIGN_PROFILES[cohort.profileId];
    const isWarm = profile.category === 'warm';
    const range = profile.accountRange;

    // Total accounts — profile-aware bounds
    const minAccounts = range?.min ?? 25;
    const maxAccounts = range?.max ?? 5000;
    const warnMax = range?.warnMax ?? 2000;
    const accountLabel = profile.accountLabel ?? 'accounts';

    if (cohort.totalAccounts < minAccounts) {
      results.push({ field: `${cohort.id}.totalAccounts`, severity: 'error', message: `${prefix}Minimum ${minAccounts} ${accountLabel} required.` });
    } else if (cohort.totalAccounts > maxAccounts) {
      results.push({ field: `${cohort.id}.totalAccounts`, severity: 'error', message: `${prefix}Maximum ${maxAccounts.toLocaleString()} ${accountLabel} for ${profile.label} cohorts.` });
    } else if (cohort.totalAccounts > warnMax) {
      results.push({ field: `${cohort.id}.totalAccounts`, severity: 'warning', message: `${prefix}Large cohort for ${profile.label}. Typical range is ${minAccounts}–${warnMax}.` });
    }

    // Conversion rate overrides — skip bypassed stages for opportunity-entry profiles
    if (cohort.conversionOverrides) {
      const o = cohort.conversionOverrides;

      if (profile.funnelEntry === 'account') {
        // Account→Lead
        if (o.accountToLead !== undefined) {
          const a2lMin = isWarm ? 0.10 : 0.03;
          const a2lMax = isWarm ? 1.00 : 0.35;
          if (o.accountToLead < a2lMin || o.accountToLead > a2lMax) {
            results.push({ field: `${cohort.id}.accountToLead`, severity: 'error', message: `${prefix}Account→Lead rate must be ${(a2lMin * 100).toFixed(0)}–${(a2lMax * 100).toFixed(0)}%.` });
          } else if (!isWarm && o.accountToLead > 0.25) {
            results.push({ field: `${cohort.id}.accountToLead`, severity: 'warning', message: `${prefix}Account→Lead rate above 25% is unusually high for named account targeting.` });
          }
        }

        // Lead→MQL
        if (o.leadToMQL !== undefined) {
          const l2mMin = isWarm ? 0.50 : 0.20;
          const l2mMax = isWarm ? 1.00 : 0.85;
          if (o.leadToMQL < l2mMin || o.leadToMQL > l2mMax) {
            results.push({ field: `${cohort.id}.leadToMQL`, severity: 'error', message: `${prefix}Lead→MQL rate must be ${(l2mMin * 100).toFixed(0)}–${(l2mMax * 100).toFixed(0)}%.` });
          } else if (!isWarm && o.leadToMQL > 0.75) {
            results.push({ field: `${cohort.id}.leadToMQL`, severity: 'warning', message: `${prefix}Lead→MQL above 75% suggests qualification criteria may not be filtering effectively.` });
          }
        }

        // MQL→Opp
        if (o.mqlToOpp !== undefined) {
          const m2oMin = isWarm ? 0.50 : 0.08;
          const m2oMax = isWarm ? 1.00 : 0.50;
          if (o.mqlToOpp < m2oMin || o.mqlToOpp > m2oMax) {
            results.push({ field: `${cohort.id}.mqlToOpp`, severity: 'error', message: `${prefix}MQL→Opp rate must be ${(m2oMin * 100).toFixed(0)}–${(m2oMax * 100).toFixed(0)}%.` });
          } else if (!isWarm && o.mqlToOpp > 0.40) {
            results.push({ field: `${cohort.id}.mqlToOpp`, severity: 'warning', message: `${prefix}MQL→Opp above 40% is exceptionally rare in B2B.` });
          }
        }
      }

      // Opp→Close — validated for all profiles
      if (o.oppToClose !== undefined) {
        const o2cMax = isWarm ? 0.60 : 0.35;
        if (o.oppToClose < 0.05 || o.oppToClose > o2cMax) {
          results.push({ field: `${cohort.id}.oppToClose`, severity: 'error', message: `${prefix}Opp→Close rate must be 5–${(o2cMax * 100).toFixed(0)}%.` });
        } else if (!isWarm && o.oppToClose > 0.28) {
          results.push({ field: `${cohort.id}.oppToClose`, severity: 'warning', message: `${prefix}Win rate above 28% is not typical for B2B SaaS at deal sizes over $50K.` });
        }
      }
    }
  }

  // Blended CPL — only validate if any cohort uses a lead-gen funnel
  const hasLeadFunnelCohorts = cohorts.some(c => CAMPAIGN_PROFILES[c.profileId].funnelEntry === 'account');
  if (hasLeadFunnelCohorts) {
    if (budget.blendedCPL < 250) {
      results.push({ field: 'blendedCPL', severity: 'error', message: 'B2B blended CPL below $250 is not realistic for account-level leads.' });
    } else if (budget.blendedCPL > 2000) {
      results.push({ field: 'blendedCPL', severity: 'error', message: 'CPL above $2,000 exceeds typical ranges. Check your assumptions.' });
    } else if (budget.blendedCPL > 1200) {
      results.push({ field: 'blendedCPL', severity: 'warning', message: 'CPL above $1,200 is high. Typical mid-market B2B runs $300–$800.' });
    }
  }

  // ASP
  if (goals.averageSellingPrice < 10000) {
    results.push({ field: 'asp', severity: 'error', message: 'This calculator is designed for B2B SaaS deal sizes of $10K+ ACV.' });
  } else if (goals.averageSellingPrice > 1000000) {
    results.push({ field: 'asp', severity: 'error', message: 'Deal sizes above $1M may not match the velocity curves and conversion assumptions.' });
  } else if (goals.averageSellingPrice > 500000) {
    results.push({ field: 'asp', severity: 'warning', message: 'ASP above $500K — enterprise cycles may differ from this model\'s assumptions.' });
  }

  // Dropout rate
  if (advanced.quarterlyDropoutRate < 0.05 || advanced.quarterlyDropoutRate > 0.40) {
    results.push({ field: 'dropoutRate', severity: 'error', message: 'Dropout rate must be 5–40%.' });
  } else if (advanced.quarterlyDropoutRate > 0.30) {
    results.push({ field: 'dropoutRate', severity: 'warning', message: 'Dropout above 30% means your targeting list is burning through accounts fast.' });
  }

  // Frequency
  if (budget.frequencyConfig.monthlyFrequency < 1 || budget.frequencyConfig.monthlyFrequency > 30) {
    results.push({ field: 'frequency', severity: 'error', message: 'Frequency must be 1–30 touches/month.' });
  } else if (budget.frequencyConfig.monthlyFrequency > 20) {
    results.push({ field: 'frequency', severity: 'warning', message: 'Frequency above 20 hits diminishing returns \u2014 conversion boost begins declining.' });
  } else if (budget.frequencyConfig.monthlyFrequency > 15) {
    results.push({ field: 'frequency', severity: 'warning', message: 'Approaching the frequency ceiling (20/mo). Returns are flattening.' });
  }

  // Cost per touch
  if (budget.frequencyConfig.costPerTouch < 0.50 || budget.frequencyConfig.costPerTouch > 25) {
    results.push({ field: 'costPerTouch', severity: 'error', message: 'Cost per touch must be $0.50–$25.00.' });
  } else if (budget.frequencyConfig.costPerTouch > 15) {
    results.push({ field: 'costPerTouch', severity: 'warning', message: 'Cost per touch above $15 suggests a single-channel cost, not blended average.' });
  }

  // Sales velocity
  if (advanced.salesVelocityDays < 45 || advanced.salesVelocityDays > 365) {
    results.push({ field: 'salesVelocity', severity: 'error', message: 'Sales velocity must be 45–365 days.' });
  } else if (advanced.salesVelocityDays > 270) {
    results.push({ field: 'salesVelocity', severity: 'warning', message: 'Cycles above 270 days may reduce the model\'s quarterly accuracy.' });
  }

  // Velocity improvement
  if (advanced.maxVelocityImprovement < 0 || advanced.maxVelocityImprovement > 0.50) {
    results.push({ field: 'velocityImprovement', severity: 'error', message: 'Velocity improvement must be 0–50%.' });
  } else if (advanced.maxVelocityImprovement > 0.40) {
    results.push({ field: 'velocityImprovement', severity: 'warning', message: 'Improvement above 40% implies cutting the sales cycle by nearly half.' });
  }

  // --- Contextual guardrails (PRD 7.3) ---

  // Check blended conversion rate — only for cold profiles
  const coldCohorts = cohorts.filter(c => CAMPAIGN_PROFILES[c.profileId].category === 'cold');
  if (coldCohorts.length > 0) {
    const firstCold = coldCohorts[0];
    const coldProfile = CAMPAIGN_PROFILES[firstCold.profileId];
    const a2l = firstCold.conversionOverrides?.accountToLead ?? coldProfile.conversionRates.accountToLead;
    const l2m = firstCold.conversionOverrides?.leadToMQL ?? coldProfile.conversionRates.leadToMQL;
    const m2o = firstCold.conversionOverrides?.mqlToOpp ?? coldProfile.conversionRates.mqlToOpp;
    const o2c = firstCold.conversionOverrides?.oppToClose ?? coldProfile.conversionRates.oppToClose;
    const blended = a2l * l2m * m2o * o2c;
    if (blended > 0.015) {
      results.push({
        field: 'contextual',
        severity: 'warning',
        message: 'Your end-to-end conversion rate is unusually high. In most B2B scenarios, fewer than 1 in 100 targeted accounts become customers.',
      });
    }
  }

  return results;
}

/** Get validation for a specific field */
export function getFieldValidation(results: ValidationResult[], fieldId: string): ValidationResult | undefined {
  return results.find(r => r.field === fieldId || r.field.endsWith(`.${fieldId}`));
}
