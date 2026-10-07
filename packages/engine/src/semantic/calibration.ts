/**
 * Percentile calibration of semantic similarity (RN-26).
 *
 * A raw cosine of 0.42 means nothing on its own: some commanders' texts
 * score high against almost everything, others low. So, at build time, each
 * commander gets the distribution of its similarity against cards of its
 * color identity, summarized as a few quantiles. In the browser a raw cosine
 * becomes "better than 95% of the cards this commander could play".
 */

/** Quantile levels stored per commander: every 5% plus the 99th, where the best cards live. */
export const QUANTILE_LEVELS: readonly number[] = [
  0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.99, 1
];

/** Quantiles of `values` at `levels` (0–1), with linear interpolation between ranks. */
export function quantiles(values: readonly number[], levels: readonly number[] = QUANTILE_LEVELS): number[] {
  if (values.length === 0) throw new Error("Cannot compute quantiles of an empty sample");
  const sorted = [...values].sort((a, b) => a - b);
  return levels.map((level) => {
    const position = level * (sorted.length - 1);
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const fraction = position - lower;
    return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * fraction;
  });
}

/**
 * Inverse of quantiles(): where `value` falls in the distribution, from 0 to 1.
 * Below the minimum is 0, above the maximum is 1, and values in between are
 * interpolated between the two closest stored quantiles.
 */
export function percentileOf(
  value: number,
  storedQuantiles: readonly number[],
  levels: readonly number[] = QUANTILE_LEVELS
): number {
  if (storedQuantiles.length !== levels.length) {
    throw new Error(`Expected ${levels.length} quantiles, got ${storedQuantiles.length}`);
  }
  const last = storedQuantiles.length - 1;
  if (value <= storedQuantiles[0]!) return 0;
  if (value >= storedQuantiles[last]!) return 1;

  // Last stored quantile that is <= value.
  let i = 0;
  while (i < last && storedQuantiles[i + 1]! <= value) i++;

  const low = storedQuantiles[i]!;
  const high = storedQuantiles[i + 1]!;
  if (high === low) return levels[i]!;
  const fraction = (value - low) / (high - low);
  return levels[i]! + (levels[i + 1]! - levels[i]!) * fraction;
}
