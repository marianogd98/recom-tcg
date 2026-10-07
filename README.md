# ReCom TCG

**Find the commanders hiding in your own card pool.**

[Leer en español](README.es.md)

Most Commander tools start from a commander you already picked and suggest cards to buy. ReCom TCG goes the other way: you import the cards you **already own**, choose the color identities you want to play, and it ranks the legendary cards in your pool by how well they use the rest of your collection — and explains why.

> Status: **early development (M0)**. Nothing usable yet. The full business rules are in [`docs/especificacion.md`](docs/especificacion.md) (Spanish).

## Principles

- **Neutral.** No card gets special treatment for being popular. Only its rules text and your pool matter.
- **Explainable.** Every score comes with evidence: the actual cards from your pool behind it.
- **Private.** Your pool is processed in your browser and never leaves your device.
- **Open data.** Card data comes from [Scryfall](https://scryfall.com).
- **Community-driven.** Detection rules, thresholds and texts live in YAML files anyone can improve with a pull request, without touching code.

## How it works

1. **Build time (weekly, in CI):** download Scryfall's bulk data, run the YAML rules over every card's Oracle text, and publish tagged, versioned card data.
2. **In your browser:** import your pool, pick color identities, and the engine scores every commander candidate on three metrics — **synergy**, **deck skeleton** (ramp, draw, interaction, fixing) and **usable cards** — then explains the result.

## Repository layout

```
apps/web/               Next.js app (static export)
packages/engine/        Pure TypeScript scoring engine (no DOM, no network)
packages/pipeline/      Data build: Scryfall → normalized, tagged cards
packages/rules-schema/  JSON Schemas + validator for every YAML file
rules/                  Detection rules (themes, roles), vocabulary, overrides, formats
model.yaml              Every model threshold and weight
import-profiles/        CSV column mappings for collection apps
i18n/                   Explanation templates per language
docs/                   Specification (business rules RN-01 … RN-65)
```

## Getting started

Requirements: Node.js 22+ and pnpm 10 (`corepack enable` installs it).

```bash
pnpm install          # first run creates pnpm-lock.yaml — commit it
pnpm check            # validate YAML, typecheck, run tests
pnpm dev              # web app on http://localhost:3000

pnpm data:fetch       # download Scryfall data into data/raw/
pnpm data:build       # build tagged card data into data/out/
```

## Contributing

The easiest way to help is improving the **detection rules** in `rules/`: no programming needed, just YAML and some knowledge of Magic. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

- **M0** Repository skeleton ← *we are here*
- **M1** Data pipeline: full rule set, overrides, localized names, embeddings
- **M2** Engine: pool import, candidates and pairs, metrics, evidence, reference pools
- **M3** Web app: Import → Your pool → Search → Results → Commander page
- **M4** Public release: docs, deployment
- **v1.1** Proposed 99-card deck with mana base and export

## License

To be decided before the first public release (MIT or AGPL-3.0).

---

ReCom TCG is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. © Wizards of the Coast LLC. Card data provided by [Scryfall](https://scryfall.com).
