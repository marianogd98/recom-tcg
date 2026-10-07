/**
 * Core domain types shared by the data pipeline, the engine and the web app.
 * Rule references (RN-xx) point to docs/especificacion.md.
 */

/** One of the five Magic colors. */
export type Color = "W" | "U" | "B" | "R" | "G";

/** Direction of a theme tag (gramática YAML §3.4). */
export type Provides = "asks" | "gives";

/** A theme tag produced by a YAML rule at build time. Rules never produce scores. */
export interface ThemeTag {
  /** Theme id from rules/vocabulary.yaml, or a captured one such as "tribal:elf". */
  theme: string;
  provides: Provides;
  /** 0.1–1.0, strength of the signal. */
  weight: number;
  /** Ids of the rules that produced this tag (RN-58, "ver cálculo"). */
  ruleIds: string[];
}

/** A functional role tag (ramp, draw, removal_creature…). */
export interface RoleTag {
  role: string;
  weight: number;
  ruleIds: string[];
}

/**
 * A card as the browser receives it after the build step.
 * One entry per oracle_id: printings are irrelevant (RN-10).
 */
export interface Card {
  oracleId: string;
  /** English Oracle name. Localized names live in a separate index (RN-11). */
  name: string;
  manaValue: number;
  colorIdentity: Color[];
  typeLine: string;
  keywords: string[];
  /** Commander legality (RN-19). */
  legality: "legal" | "banned" | "not_legal" | "restricted";
  /**
   * Could lead a deck if the banlist allowed it: Scryfall's is:commander,
   * plus the banned cards it leaves out (so RN-02 can name them). Candidates
   * also need legality "legal" (RN-01).
   */
  canBeCommander: boolean;
  /**
   * Copies a deck may hold (RN-16): 1 for almost every card, a number for
   * cards like Seven Dwarves, "any" for Relentless Rats and basic lands.
   */
  copyLimit: CopyLimit;
  /** 0.5 for modal double-faced cards with a land back face (RN-47). */
  landValue: number;
  themes: ThemeTag[];
  roles: RoleTag[];
  /** How this card can share command with another (RN-04). Absent for most cards. */
  pairing?: PairingTag[];
}

/**
 * One side of a pair variant from pairing.yaml that this card fulfils.
 * Two cards pair when one has side "a" and the other side "b" of the same
 * variant with the same key: "Partner with Krav" is { id: "partner-with",
 * side: "a", key: "krav, the unredeemed" }, and Krav carries side "b" with
 * that key.
 */
export interface PairingTag {
  id: string;
  side: "a" | "b";
  /** Normalized; "" when the variant needs no key (plain Partner, Backgrounds). */
  key: string;
  /** false: this card can only be a commander inside such a pair (Backgrounds). */
  solo?: false;
}

/** How many copies of a card a deck may hold. "any" cannot be a number: JSON has no Infinity. */
export type CopyLimit = number | "any";

/** A line of the user's pool after normalization (bloque 2). */
export interface PoolEntry {
  oracleId: string;
  /** Informational only: singleton applies (RN-15). */
  quantity: number;
}

/**
 * Result of resolving one imported line (RN-13). "ignored" is a token,
 * emblem or other object that is not a deck card (RN-18).
 */
export type ImportLineStatus = "recognized" | "corrected" | "ambiguous" | "unrecognized" | "ignored";

export interface ImportLineResult {
  line: number;
  raw: string;
  /** The name as read from the line, before resolving. */
  name: string;
  quantity: number;
  status: ImportLineStatus;
  /** The card, for recognized and corrected lines, and ambiguous ones the user already chose. */
  oracleId?: string;
  /** Candidate oracle_ids for an ambiguous line. */
  suggestions?: string[];
  /** For ignored lines: "token", "emblem"… */
  ignoredKind?: string;
  /** A resolved card that stays out of the pool (RN-19). */
  excluded?: "banned" | "not_legal";
}

/** Priority profiles (RN-36). */
export type ProfileId = "default" | "max_synergy" | "ready_to_play";

export type Confidence = "high" | "medium" | "low";

/**
 * Structured evidence for one candidate (RN-53). The engine never writes prose:
 * the UI turns `key` + params into text through i18n templates.
 */
export interface EvidenceItem {
  key: string;
  [param: string]: string | number | string[] | undefined;
}

export interface CandidateResult {
  /** One id, or two for a pair (RN-04). */
  commanderIds: string[];
  pairingId?: string;
  colorIdentity: Color[];
  score: number; // 0–100 (RN-37)
  metrics: { synergy: number | null; skeleton: number; utility: number };
  themeMultiplier: number; // RN-33
  confidence: Confidence; // RN-34
  missingNonlands: number; // RN-32
  estimatedLands: number; // RN-44
  strengths: EvidenceItem[];
  weaknesses: EvidenceItem[];
  warnings: EvidenceItem[];
}

/** Stamped on every result (RN-21). */
export interface DataVersion {
  dataDate: string; // ISO date of the Scryfall bulk file
  rulesVersion: string;
  modelVersion: string;
}
