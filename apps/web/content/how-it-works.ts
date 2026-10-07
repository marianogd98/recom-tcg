/**
 * Page copy lives apart from components: changing a sentence never means
 * touching JSX, and the i18n step (M3) will replace this file with
 * translated messages without changing any component.
 */
export interface Step {
  number: number;
  title: string;
  description: string;
}

export const HOW_IT_WORKS: readonly Step[] = [
  { number: 1, title: "Import", description: "Paste your list or upload a CSV. Your pool never leaves your browser." },
  { number: 2, title: "Your pool", description: "See which themes your collection supports in each color identity." },
  { number: 3, title: "Search", description: "Pick the identities you want to play and what matters most to you." },
  { number: 4, title: "Results", description: "Your commanders, ranked by how well they use your pool, and why." }
];
