/**
 * Principal Component Analysis, to shrink 384-dimension embeddings to ~128
 * before they travel to the browser.
 *
 * Why PCA and not just cutting dimensions? PCA keeps the directions where
 * cards differ the most, so similarities change very little after the cut.
 *
 * Method: covariance matrix + orthogonal iteration (repeatedly multiply a
 * set of vectors by the covariance and re-orthonormalize them). It is
 * deterministic: a seeded start and a fixed number of iterations, so the
 * same input always produces the same output (reproducible builds, RN-21).
 */

export interface PcaModel {
  /** Mean of the training vectors, subtracted before projecting. */
  mean: Float32Array;
  /** k unit vectors of length d, strongest direction first. */
  components: Float32Array[];
}

export interface PcaOptions {
  iterations?: number;
  seed?: number;
  /** Fit on at most this many vectors (evenly spaced) to bound build time. */
  maxSamples?: number;
}

export function fitPca(vectors: readonly Float32Array[], k: number, options: PcaOptions = {}): PcaModel {
  const { iterations = 60, seed = 42, maxSamples = 10_000 } = options;
  if (vectors.length === 0) throw new Error("PCA needs at least one vector");
  const d = vectors[0]!.length;
  if (k > d) throw new Error(`Cannot keep ${k} components of ${d}-dimension vectors`);

  const sample = evenlySpaced(vectors, maxSamples);
  const mean = meanOf(sample, d);
  const covariance = covarianceOf(sample, mean, d);

  let basis = randomBasis(d, k, seed);
  for (let i = 0; i < iterations; i++) basis = orthonormalize(multiply(covariance, basis, d));

  const ordered = basis
    .map((component) => ({ component, variance: rayleigh(covariance, component, d) }))
    .sort((a, b) => b.variance - a.variance)
    .map(({ component }) => Float32Array.from(withStableSign(component)));

  return { mean, components: ordered };
}

/** Coordinates of `vector` along each component. */
export function project(model: PcaModel, vector: ArrayLike<number>): Float32Array {
  const out = new Float32Array(model.components.length);
  model.components.forEach((component, c) => {
    let sum = 0;
    for (let j = 0; j < component.length; j++) sum += (vector[j]! - model.mean[j]!) * component[j]!;
    out[c] = sum;
  });
  return out;
}

// ── helpers ──────────────────────────────────────────────────────────────

function evenlySpaced<T>(items: readonly T[], max: number): T[] {
  if (items.length <= max) return [...items];
  const step = items.length / max;
  return Array.from({ length: max }, (_, i) => items[Math.floor(i * step)]!);
}

function meanOf(vectors: readonly Float32Array[], d: number): Float32Array {
  const mean = new Float64Array(d);
  for (const v of vectors) for (let j = 0; j < d; j++) mean[j]! += v[j]!;
  return Float32Array.from(mean, (x) => x / vectors.length);
}

/** d×d covariance, row-major. Only the upper triangle is accumulated, then mirrored. */
function covarianceOf(vectors: readonly Float32Array[], mean: Float32Array, d: number): Float64Array {
  const cov = new Float64Array(d * d);
  const centered = new Float64Array(d);
  for (const v of vectors) {
    for (let j = 0; j < d; j++) centered[j] = v[j]! - mean[j]!;
    for (let r = 0; r < d; r++) {
      const x = centered[r]!;
      if (x === 0) continue;
      const row = r * d;
      for (let c = r; c < d; c++) cov[row + c]! += x * centered[c]!;
    }
  }
  for (let r = 0; r < d; r++) {
    for (let c = r; c < d; c++) {
      const value = cov[r * d + c]! / vectors.length;
      cov[r * d + c] = value;
      cov[c * d + r] = value;
    }
  }
  return cov;
}

/** Deterministic pseudo-random start (mulberry32). */
function randomBasis(d: number, k: number, seed: number): Float64Array[] {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5;
  };
  return orthonormalize(Array.from({ length: k }, () => Float64Array.from({ length: d }, next)));
}

function multiply(matrix: Float64Array, vectors: Float64Array[], d: number): Float64Array[] {
  return vectors.map((v) => {
    const out = new Float64Array(d);
    for (let r = 0; r < d; r++) {
      let sum = 0;
      const row = r * d;
      for (let c = 0; c < d; c++) sum += matrix[row + c]! * v[c]!;
      out[r] = sum;
    }
    return out;
  });
}

/** Modified Gram–Schmidt: each vector loses its projection on the previous ones, then becomes unit length. */
function orthonormalize(vectors: Float64Array[]): Float64Array[] {
  const basis: Float64Array[] = [];
  for (const original of vectors) {
    const v = Float64Array.from(original);
    for (const b of basis) {
      const projection = dot(v, b);
      for (let j = 0; j < v.length; j++) v[j]! -= projection * b[j]!;
    }
    const length = Math.sqrt(dot(v, v));
    basis.push(length > 1e-12 ? v.map((x) => x / length) : v);
  }
  return basis;
}

/** Variance captured along a unit vector: vᵀ C v. */
function rayleigh(matrix: Float64Array, v: Float64Array, d: number): number {
  const [mv] = multiply(matrix, [v], d);
  return dot(v, mv!);
}

/** A component and its negative describe the same axis; fix the sign so builds are identical. */
function withStableSign(v: Float64Array): Float64Array {
  let largest = 0;
  for (let j = 1; j < v.length; j++) if (Math.abs(v[j]!) > Math.abs(v[largest]!)) largest = j;
  return v[largest]! < 0 ? v.map((x) => -x) : v;
}

function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0;
  for (let j = 0; j < a.length; j++) sum += a[j]! * b[j]!;
  return sum;
}
