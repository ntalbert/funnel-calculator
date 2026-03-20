import type { ASPScalingBand, ASPScalingResult } from './types';

// PRD Section 4.11.3 — ASP Scaling Bands
// Reference point: $100K ASP (v1.7 default)
export const ASP_SCALING_BANDS: ASPScalingBand[] = [
  { minASP: 10000,  maxASP: 25000,  oppToCloseAdj: 1.50, salesVelocityDays: 45,  mqlToOppAdj: 0.85, leadToMQLAdj: 1.10, defaultCPL: 250, label: 'SMB ($10K–$25K)' },
  { minASP: 25000,  maxASP: 50000,  oppToCloseAdj: 1.30, salesVelocityDays: 75,  mqlToOppAdj: 0.90, leadToMQLAdj: 1.05, defaultCPL: 350, label: 'Lower Mid-Market ($25K–$50K)' },
  { minASP: 50000,  maxASP: 100000, oppToCloseAdj: 1.10, salesVelocityDays: 120, mqlToOppAdj: 0.95, leadToMQLAdj: 1.00, defaultCPL: 400, label: 'Mid-Market ($50K–$100K)' },
  { minASP: 100000, maxASP: 250000, oppToCloseAdj: 1.00, salesVelocityDays: 167, mqlToOppAdj: 1.00, leadToMQLAdj: 1.00, defaultCPL: 450, label: 'Mid-Market ($100K)' },
  { minASP: 250000, maxASP: 1000001, oppToCloseAdj: 0.65, salesVelocityDays: 270, mqlToOppAdj: 1.10, leadToMQLAdj: 0.85, defaultCPL: 800, label: 'Enterprise ($250K+)' },
];

// Separate entry for the $100K–$250K interpolation target
const BAND_100K_250K = {
  oppToCloseAdj: 0.80, salesVelocityDays: 200, mqlToOppAdj: 1.05, leadToMQLAdj: 0.92, defaultCPL: 600,
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate ASP scaling factors for any ASP value.
 * Uses linear interpolation between band boundaries per PRD 4.11.7.
 */
export function interpolateASPScaling(asp: number): ASPScalingResult {
  const clamped = Math.max(10000, Math.min(1000000, asp));

  // Band 0: $10K–$25K
  if (clamped < 25000) {
    const band = ASP_SCALING_BANDS[0];
    // No interpolation below $10K (clamped), interpolate within band
    if (clamped <= 10000) {
      return { oppToCloseAdj: band.oppToCloseAdj, salesVelocityDays: band.salesVelocityDays, mqlToOppAdj: band.mqlToOppAdj, leadToMQLAdj: band.leadToMQLAdj, suggestedCPL: band.defaultCPL, bandLabel: band.label };
    }
    const next = ASP_SCALING_BANDS[1];
    const t = (clamped - 10000) / (25000 - 10000);
    return {
      oppToCloseAdj: lerp(band.oppToCloseAdj, next.oppToCloseAdj, t),
      salesVelocityDays: Math.round(lerp(band.salesVelocityDays, next.salesVelocityDays, t)),
      mqlToOppAdj: lerp(band.mqlToOppAdj, next.mqlToOppAdj, t),
      leadToMQLAdj: lerp(band.leadToMQLAdj, next.leadToMQLAdj, t),
      suggestedCPL: Math.round(lerp(band.defaultCPL, next.defaultCPL, t)),
      bandLabel: band.label,
    };
  }

  // Band 1: $25K–$50K
  if (clamped < 50000) {
    const band = ASP_SCALING_BANDS[1];
    const next = ASP_SCALING_BANDS[2];
    const t = (clamped - 25000) / (50000 - 25000);
    return {
      oppToCloseAdj: lerp(band.oppToCloseAdj, next.oppToCloseAdj, t),
      salesVelocityDays: Math.round(lerp(band.salesVelocityDays, next.salesVelocityDays, t)),
      mqlToOppAdj: lerp(band.mqlToOppAdj, next.mqlToOppAdj, t),
      leadToMQLAdj: lerp(band.leadToMQLAdj, next.leadToMQLAdj, t),
      suggestedCPL: Math.round(lerp(band.defaultCPL, next.defaultCPL, t)),
      bandLabel: band.label,
    };
  }

  // Band 2: $50K–$100K
  if (clamped < 100000) {
    const band = ASP_SCALING_BANDS[2];
    const ref = ASP_SCALING_BANDS[3]; // $100K reference
    const t = (clamped - 50000) / (100000 - 50000);
    return {
      oppToCloseAdj: lerp(band.oppToCloseAdj, ref.oppToCloseAdj, t),
      salesVelocityDays: Math.round(lerp(band.salesVelocityDays, ref.salesVelocityDays, t)),
      mqlToOppAdj: lerp(band.mqlToOppAdj, ref.mqlToOppAdj, t),
      leadToMQLAdj: lerp(band.leadToMQLAdj, ref.leadToMQLAdj, t),
      suggestedCPL: Math.round(lerp(band.defaultCPL, ref.defaultCPL, t)),
      bandLabel: band.label,
    };
  }

  // Reference: $100K
  if (clamped === 100000) {
    const ref = ASP_SCALING_BANDS[3];
    return {
      oppToCloseAdj: ref.oppToCloseAdj,
      salesVelocityDays: ref.salesVelocityDays,
      mqlToOppAdj: ref.mqlToOppAdj,
      leadToMQLAdj: ref.leadToMQLAdj,
      suggestedCPL: ref.defaultCPL,
      bandLabel: ref.label,
    };
  }

  // Band 3: $100K–$250K (interpolate between $100K ref and $100K–$250K target)
  if (clamped < 250000) {
    const ref = ASP_SCALING_BANDS[3];
    const t = (clamped - 100000) / (250000 - 100000);
    return {
      oppToCloseAdj: lerp(ref.oppToCloseAdj, BAND_100K_250K.oppToCloseAdj, t),
      salesVelocityDays: Math.round(lerp(ref.salesVelocityDays, BAND_100K_250K.salesVelocityDays, t)),
      mqlToOppAdj: lerp(ref.mqlToOppAdj, BAND_100K_250K.mqlToOppAdj, t),
      leadToMQLAdj: lerp(ref.leadToMQLAdj, BAND_100K_250K.leadToMQLAdj, t),
      suggestedCPL: Math.round(lerp(ref.defaultCPL, BAND_100K_250K.defaultCPL, t)),
      bandLabel: 'Upper Mid-Market ($100K–$250K)',
    };
  }

  // Band 4: $250K+ (flat, no interpolation beyond $250K)
  const enterprise = ASP_SCALING_BANDS[4];
  return {
    oppToCloseAdj: enterprise.oppToCloseAdj,
    salesVelocityDays: enterprise.salesVelocityDays,
    mqlToOppAdj: enterprise.mqlToOppAdj,
    leadToMQLAdj: enterprise.leadToMQLAdj,
    suggestedCPL: enterprise.defaultCPL,
    bandLabel: enterprise.label,
  };
}

/**
 * Returns human-readable ASP band label for notifications.
 */
export function getASPBandLabel(asp: number): string {
  return interpolateASPScaling(asp).bandLabel;
}
