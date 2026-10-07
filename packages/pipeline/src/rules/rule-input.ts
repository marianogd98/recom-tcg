/**
 * Everything a rule is allowed to look at. Rules never see the raw Scryfall
 * object, only this normalized view (gramática YAML §3.2).
 */
export interface RuleInput {
  /** Normalized Oracle text, one entry per face. */
  faces: string[];
  typeLine: string;
  keywords: string[];
  producesMana: boolean;
}
