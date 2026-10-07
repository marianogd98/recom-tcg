# Contributing to ReCom TCG

Thanks for helping! Contributions in **English or Spanish** are welcome.

## The golden rule: neutrality

No card may get special treatment for being who it is. Rules describe **mechanics in text**, never specific cards, and nothing in a YAML file can change a score directly. Overrides exist for the cases rules get wrong, and they can only add or remove tags.

## Improving detection rules (no code needed)

Rules live in `rules/themes/` and `rules/roles/`. Each rule matches patterns in a card's normalized Oracle text:

- text is lower case,
- the card's own name is replaced by `~`,
- reminder text in parentheses is removed.

```yaml
- id: sacrifice.outlet            # unique: theme.name
  theme: sacrifice                # from rules/vocabulary.yaml
  provides: gives                 # gives = enables the theme, asks = rewards it
  weight: 1.0                     # 0.1–1.0
  match:
    text_any: ["sacrifice (?:a|another) creature:"]
    text_none: ["sacrifice ~:"]
  examples:                       # mandatory: CI checks them
    match: [Viscera Seer]
    no_match: [Sakura-Tribe Elder]
```

Every card named in `examples` must exist in `packages/pipeline/fixtures/cards.json` with its exact Oracle text. You don't copy it by hand: after `pnpm data:fetch`, run `pnpm fixtures:sync` and the fixture file is regenerated from the downloaded Scryfall data. Open VS Code with the recommended YAML extension and you get autocompletion and errors as you type.

Examples prove that a rule catches the cards you thought of; they don't show what else it catches. Before and after editing a rule, run `pnpm rules:report <id-prefix>` (for example `pnpm rules:report removal.`): it prints how many cards of the real Commander pool each rule tags, with sample names spread across the alphabet. A count that jumps by thousands, or a sample that makes you frown, means the pattern is too loose. A few patterns that kept biting us:

- A regex can start matching in the middle of a word. Put `\b` before a capture so `sorcery spells` doesn't become the creature type `orcery`.
- Scryfall's `produced_mana` includes the colors of tokens a card creates, so a Treasure maker "produces" all five colors. Pair `produces_colors_min` with a text or type condition.
- Reminder text is removed, so a shock land's `({t}: add {g} or {u}.)` is not in its text. Use `type_any` / `produces_mana` for lands.
- Real Oracle text often says "this creature" instead of the name; both become `~`.

New themes go into `rules/vocabulary.yaml` first, in their own pull request.

### When one card is wrong: overrides

If a rule misreads a single card and there's no way to fix the rule without breaking others, add an override to `rules/overrides.yaml`:

```yaml
- card: "Some Card Name"           # English Oracle name, exactly as on Scryfall
  remove: [counters]               # or "counters/gives", "tribal", "tribal:elf", a role id
  add:
    - { theme: sacrifice, provides: gives, weight: 0.8 }
  reason: "The counters rule matches a poison counter, not +1/+1"
```

`reason` is mandatory and reviewed like code. Prefer fixing the rule whenever the mistake affects a family of cards (we fixed "target opponent may draw a card" in the draw rules instead of overriding Phelddagrif). `pnpm validate:rules` prints how many overrides each tag has collected, and `pnpm data:build` fails if an override names a card that doesn't exist.

## Changing model thresholds

Every number lives in `model.yaml` (RN-23). A pull request that changes it must show how the reference-pool rankings move (RN-24). That check arrives in M2.

## Code conventions

Code follows the Clean Code and SOLID conventions described in [`docs/arquitectura.md`](docs/arquitectura.md): pure functions where possible, I/O only at the edges (`cli/`, `storage/`, `scryfall/`), one responsibility per module, and one commit per change with the *why* in its message.

## Before opening a pull request

```bash
pnpm check  # validate YAML + typecheck + tests
```

Mention the business rules your change touches (`RN-xx`, see `docs/especificacion.md`).
