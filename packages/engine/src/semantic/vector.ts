/**
 * Vector math for the semantic signal (RN-26).
 *
 * Embeddings travel to the browser as int8 to keep downloads small
 * (one byte per dimension instead of four). The same functions run in the
 * data build and in the browser, so both sides always agree on the numbers.
 */

/** int8 range used for quantization: a unit-length component in [-1, 1] maps to [-127, 127]. */
export const INT8_SCALE = 127;

/** Returns a copy of `vector` scaled to length 1 (all zeros stays all zeros). */
export function normalize(vector: ArrayLike<number>): Float32Array {
  const out = Float32Array.from(vector);
  const length = Math.hypot(...out);
  if (length === 0) return out;
  for (let i = 0; i < out.length; i++) out[i] = out[i]! / length;
  return out;
}

/** Quantizes a unit-length vector to int8. Components are rounded and clamped. */
export function quantize(unitVector: ArrayLike<number>): Int8Array {
  const out = new Int8Array(unitVector.length);
  for (let i = 0; i < unitVector.length; i++) {
    const scaled = Math.round(unitVector[i]! * INT8_SCALE);
    out[i] = Math.max(-INT8_SCALE, Math.min(INT8_SCALE, scaled));
  }
  return out;
}

/**
 * Cosine similarity between two int8 vectors, in [-1, 1].
 * Quantization scales both vectors equally, so the cosine survives it
 * with a small rounding error.
 */
export function cosineInt8(a: Int8Array, b: Int8Array): number {
  if (a.length !== b.length) throw new Error(`Vector sizes differ: ${a.length} vs ${b.length}`);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / Math.sqrt(normA * normB);
}

/**
 * All embeddings as one flat int8 buffer plus the card order, which is how
 * they are stored and downloaded. Rows are views into the buffer, not copies.
 */
export class EmbeddingTable {
  private readonly rowByOracleId: Map<string, number>;

  constructor(
    readonly oracleIds: readonly string[],
    readonly dimensions: number,
    private readonly data: Int8Array
  ) {
    if (data.length !== oracleIds.length * dimensions) {
      throw new Error(`Embedding buffer has ${data.length} values, expected ${oracleIds.length} × ${dimensions}`);
    }
    this.rowByOracleId = new Map(oracleIds.map((id, row) => [id, row]));
  }

  vectorOf(oracleId: string): Int8Array | undefined {
    const row = this.rowByOracleId.get(oracleId);
    if (row === undefined) return undefined;
    return this.data.subarray(row * this.dimensions, (row + 1) * this.dimensions);
  }

  similarity(oracleIdA: string, oracleIdB: string): number | undefined {
    const a = this.vectorOf(oracleIdA);
    const b = this.vectorOf(oracleIdB);
    return a && b ? cosineInt8(a, b) : undefined;
  }
}
