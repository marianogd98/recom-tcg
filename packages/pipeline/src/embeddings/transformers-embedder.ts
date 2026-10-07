import type { Embedder } from "./embedder.ts";

/** The part of a transformers.js feature-extraction pipeline this adapter uses. */
type FeatureExtractor = (texts: string[], options: { pooling: "mean"; normalize: boolean }) => Promise<{ tolist(): number[][] }>;

export interface TransformersEmbedderOptions {
  /** Hugging Face model id, e.g. "Xenova/all-MiniLM-L6-v2" (from model.yaml). */
  modelId: string;
  /** Where downloaded model files are cached between runs. */
  cacheDir: string;
}

/**
 * Embeds texts with an open model running locally through transformers.js
 * (ONNX, CPU). No API keys and no paid service: the model is downloaded
 * once from Hugging Face and cached.
 *
 * The library is imported lazily so the rest of the pipeline, and its
 * tests, never need it.
 */
export class TransformersEmbedder implements Embedder {
  readonly modelId: string;
  private readonly cacheDir: string;
  private extractor: FeatureExtractor | undefined;

  constructor({ modelId, cacheDir }: TransformersEmbedderOptions) {
    this.modelId = modelId;
    this.cacheDir = cacheDir;
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    const extractor = await this.loadExtractor();
    // Mean pooling + normalization: one unit-length vector per text,
    // the standard recipe for sentence-similarity models.
    const output = await extractor(texts, { pooling: "mean", normalize: true });
    return output.tolist().map((vector) => Float32Array.from(vector));
  }

  private async loadExtractor(): Promise<FeatureExtractor> {
    if (!this.extractor) {
      const { env, pipeline } = await import("@huggingface/transformers");
      env.cacheDir = this.cacheDir;
      this.extractor = (await pipeline("feature-extraction", this.modelId)) as unknown as FeatureExtractor;
    }
    return this.extractor;
  }
}
