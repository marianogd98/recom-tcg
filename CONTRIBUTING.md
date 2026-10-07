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

Every card named in `examples` must exist in `packages/pipeline/fixtures/cards.json` with its exact Oracle text (copy it from Scryfall). Open VS Code with the recommended YAML extension and you get autocompletion and errors as you type.

New themes go into `rules/vocabulary.yaml` first, in their own pull request.

## Changing model thresholds

Every number lives in `model.yaml` (RN-23). A pull request that changes it must show how the reference-pool rankings move (RN-24). That check arrives in M2.

## Code conventions

Code follows the Clean Code and SOLID conventions described in [`docs/arquitectura.md`](docs/arquitectura.md): pure functions where possible, I/O only at the edges (`cli/`, `storage/`, `scryfall/`), one responsibility per module, and one commit per change with the *why* in its message.

## Before opening a pull request

```bash
pnpm check  # validate YAML + typecheck + tests
```

Mention the business rules your change touches (`RN-xx`, see `docs/especificacion.md`).
