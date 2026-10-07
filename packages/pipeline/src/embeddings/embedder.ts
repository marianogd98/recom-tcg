/**
 * Anything that turns texts into vectors.
 *
 * The build depends on this interface, not on a specific library
 * (Dependency Inversion): production uses a local open model through
 * transformers.js, tests use a tiny deterministic fake, and swapping the
 * model later touches one adapter and model.yaml, nothing else.
 */
export interface Embedder {
  /** Identifies the model; stored with the artifacts so results are traceable (RN-21). */
  readonly modelId: string;
  /** One vector per text, in the same order. */
  embed(texts: string[]): Promise<Float32Array[]>;
}
