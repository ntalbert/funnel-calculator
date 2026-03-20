import type { CalculatorInputs, ValidationResult } from './types';

/** Validate all inputs, returning tiered warnings per PRD Section 7 */
export function validate(inputs: CalculatorInputs): ValidationResult[] {
  const results: ValidationResult[] = [];
  const { goals, cohorts, budget, advanced } = inputs;

  // --- Individual field validation (PRD 7.1) ---

  for (const cohort of cohorts) {
    const prefix = cohorts.length > 1 ? `${cohort.name}: ` : '';

    // Total accounts
    if (cohort.totalAccounts < 25) {
      results.push({ field: `${cohort.id}.totalAccounts`, severity: 'error', message: `${prefix}Minimum 25 accounts required.` });
    } else if (cohort.totalAccounts > 5000) {
      results.push({ field: `${cohort.id}.totalAccounts`, severity: 'error', message: `${prefix}Cohorts above 5,000 accounts are better served by demand gen models than ABM/account-based calculators.` });
    } else if (cohort.totalAccounts > 2000) {
      results.push({ field: `${cohort.id}.totalAccounts`, severity: 'warning', message: `${prefix}Large cohort. ABM programs typically target 200–1,000 accounts per cohort.` });
    }

    // Conversion rate overrides
    if (cohort.conversionOverrides) {
      const o = cohort.conversionOverrides;
      if (o.accountToLead !== undefined) {
        if (o.accountToLead < 0.03 || o.accountToLead > 0.35) {
          results.push({ field: `${cohort.id}.accountToLead`, severity: 'error', message: `${prefix}Account→Lead rate must be 3–35%. B2B account-to-lead rates above 35% are not consistent with named account targeting.` });
        } else if (o.accountToLead > 0.25) {
          results.push({ field: `${cohort.id}.accountToLead`, severity: 'warning', message: `${prefix}Account→Lead rate above 25% is unusually high for named account targeting.` });
        }
      }
      if (o.leadToMQL !== undefined) {
        if (o.leadToMQL < 0.20 || o.leadToMQL > 0.85) {
          results.push({ field: `${cohort.id}.leadToMQL`, severity: 'error', message: `${prefix}Lead→MQL rate must be 20–85%.` });
        } else if (o.leadToMQL > 0.75) {
          results.push({ field: `${cohort.id}.leadToMQL`, severity: 'warning', message: `${prefix}Lead→MQL above 75% suggests qualification criteria may not be filtering effectively.` });
        }
      }
      if (o.mqlToOpp !== undefined) {
        if (o.mqlToOpp < 0.08 || o.mqlToOpp > 0.50) {
          results.push({ field: `${cohort.id}.mqlToOpp`, severity: 'error', message: `${prefix}MQL→Opp rate must be 8–50%.` });
        } else if (o.mqlToOpp > 0.40) {
          results.push({ field: `${cohort.id}.mqlToOpp`, severity: 'warning', message: `${prefix}MQL→Opp above 40% is exceptionally rare in B2B.` });
        }
      }
      if (o.oppToClose !== undefined) {
        if (o.oppToClose < 0.05 || o.oppToClose > 0.35) {
          results.push({ field: `${cohort.id}.oppToClose`, severity: 'error', message: `${prefix}Opp→Close rate must be 5–35%.` });
        } else if (o.oppToClose > 0.28) {
          results.push({ field: `${cohort.id}.oppToClose`, severity: 'warning', message: `${prefix}Win rate above 28% is not typical for B2B SaaS at deal sizes over $50K.` });
        }
      }
    }
  }

  // Blended CPL
  if (budget.blendedCPL < 250) {
    results.push({ field: 'blendedCPL', severity: 'error', message: 'B2B blended CPL below $250 is not realistic for account-level leads.' });
  } else if (budget.blendedCPL > 2000) {
    results.push({ field: 'blendedCPL', severity: 'error', message: 'CPL above $2,000 exceeds typical ranges. Check your assumptions.' });
  } else if (budget.blendedCPL > 1200) {
    results.push({ field: 'blendedCPL', severity: 'warning', message: 'CPL above $1,200 is high. Typical mid-market B2B runs $300–$800.' });
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
  if (budget.frequencyConfig.monthlyFrequency < 3 || budget.frequencyConfig.monthlyFrequency > 25) {
    results.push({ field: 'frequency', severity: 'error', message: 'Frequency must be 3–25 touches/month.' });
  } else if (budget.frequencyConfig.monthlyFrequency > 18) {
    results.push({ field: 'frequency', severity: 'warning', message: 'Frequency above 18 risks audience fatigue.' });
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

  // Check blended conversion rate
  if (cohorts.length > 0) {
    // Use first cohort's rates for a rough check (or we could check all)
    const profile = cohorts[0];
    const a2l = profile.conversionOverrides?.accountToLead ?? 0.15;
    const l2m = profile.conversionOverrides?.leadToMQL ?? 0.60;
    const m2o = profile.conversionOverrides?.mqlToOpp ?? 0.27;
    const o2c = profile.conversionOverrides?.oppToClose ?? 0.20;
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
