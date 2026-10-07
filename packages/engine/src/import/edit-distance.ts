/**
 * Edit distance between two strings, counting insertions, deletions,
 * substitutions and swaps of two neighbouring letters ("Optimal String
 * Alignment"). Swaps matter for typed lists: "Lightinng" is one swap away
 * from "Lightning", not two edits.
 *
 * Bounded: it gives up as soon as the distance must exceed `max` and
 * returns max + 1. Only a narrow diagonal band of the table is filled, so
 * comparing one typo against ~80 000 names stays fast enough for the
 * browser.
 */
export function boundedEditDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const tooFar = max + 1;
  let twoBack: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => (j <= max ? j : tooFar));

  for (let i = 1; i <= a.length; i++) {
    const current = new Array<number>(b.length + 1).fill(tooFar);
    current[0] = i <= max ? i : tooFar;
    const from = Math.max(1, i - max);
    const to = Math.min(b.length, i + max);
    let rowMin = current[0]!;

    for (let j = from; j <= to; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, twoBack[j - 2]! + 1);
      current[j] = Math.min(value, tooFar);
      rowMin = Math.min(rowMin, current[j]!);
    }
    if (rowMin > max) return tooFar;
    twoBack = previous;
    previous = current;
  }
  return Math.min(previous[b.length]!, tooFar);
}
