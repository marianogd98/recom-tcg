/** One thing wrong in one file, phrased for the contributor who has to fix it. */
export interface Problem {
  /** Path relative to the repository root, with forward slashes. */
  file: string;
  message: string;
}
