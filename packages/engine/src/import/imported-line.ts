/** One card line as read from a list or a CSV row, before its name is resolved. */
export interface ImportedLine {
  /** 1-based line (text) or row (CSV, header = 1), so the report can point at it. */
  line: number;
  /** The line exactly as the user wrote it. */
  raw: string;
  /** The card name with quantity, set, collector number, foil marks and tags removed. */
  name: string;
  quantity: number;
  /** Set when the export carries it (Archidekt): the name no longer needs resolving. */
  oracleId?: string;
}
