import { FREQUENCY_BOOST_CONSTANTS } from './defaults';

/**
 * Compute a conversion rate multiplier based on monthly frequency.
 * - Below baseline: gentle penalty (linear ramp from 0.90 to 1.0)
 * - Baseline to peak: logarithmic climb to 1 + maxBoost (1.25x)
 * - Above peak: quadratic decay back toward 1.0
 */
export function frequencyConversionBoost(
  monthlyFrequency: number,
  baselineFrequency: number,
): number {
  const { peakFrequency, maxConversionBoost, belowBaselinePenalty } = FREQUENCY_BOOST_CONSTANTS;

  if (monthlyFrequency <= 0) return 1 - belowBaselinePenalty;

  // Below baseline: linear ramp from (1 - penalty) up to 1.0
  if (monthlyFrequency < baselineFrequency) {
    const t = monthlyFrequency / baselineFrequency;
    return 1 - belowBaselinePenalty * (1 - t);
  }

  // At baseline
  if (monthlyFrequency === baselineFrequency) return 1.0;

  // Baseline to peak: logarithmic climb
  if (monthlyFrequency <= peakFrequency) {
    const logRange = Math.log(peakFrequency / baselineFrequency);
    const logPos = Math.log(monthlyFrequency / baselineFrequency);
    const t = logRange > 0 ? logPos / logRange : 0;
    return 1 + maxConversionBoost * t;
  }

  // Above peak: quadratic decay back toward 1.0
  const overshoot = (monthlyFrequency - peakFrequency) / peakFrequency;
  const decayedBoost = maxConversionBoost * Math.max(0, 1 - overshoot * overshoot);
  return 1 + decayedBoost;
}

/**
 * Shift velocity weights toward a front-loaded distribution.
 * Higher frequency → leads appear earlier in the 4-quarter cycle.
 *
 * Interpolates between baseWeights and a front-loaded target:
 *   [0.55, 0.30, 0.10, 0.05]
 *
 * The interpolation factor is 0 at baseline, maxVelocityShift at peak,
 * then decays beyond peak.
 */
export function shiftVelocityWeights(
  baseWeights: [number, number, number, number],
  monthlyFrequency: number,
  baselineFrequency: number,
): [number, number, number, number] {
  const { peakFrequency, maxVelocityShift } = FREQUENCY_BOOST_CONSTANTS;
  const frontLoaded: [number, number, number, number] = [0.55, 0.30, 0.10, 0.05];

  if (monthlyFrequency <= baselineFrequency) return baseWeights;

  let t: number;
  if (monthlyFrequency <= peakFrequency) {
    t = maxVelocityShift * (monthlyFrequency - baselineFrequency)
        / (peakFrequency - baselineFrequency);
  } else {
    // Decay beyond peak
    const overshoot = (monthlyFrequency - peakFrequency) / peakFrequency;
    t = maxVelocityShift * Math.max(0, 1 - overshoot * overshoot);
  }

  // Interpolate: result = base * (1 - t) + frontLoaded * t
  const result = baseWeights.map((w, i) =>
    w * (1 - t) + frontLoaded[i] * t
  ) as [number, number, number, number];

  // Normalize to sum to 1.0
  const sum = result.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let i = 0; i < 4; i++) result[i] /= sum;
  }

  return result;
}
