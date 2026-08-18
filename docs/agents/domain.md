# Domain Docs

How engineering skills should consume this repo's domain documentation.

## Before exploring, read these

- `CONTEXT.md` at the repo root, or `CONTEXT-MAP.md` if it exists.
- `docs/adr/` for decisions relevant to the area being changed.

If these files do not exist, proceed silently. Do not flag their absence or suggest creating them upfront. Create them lazily when domain terms or architectural decisions are resolved.

## Layout

This is a **single-context** repository:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Vocabulary and decisions

Use terminology defined in `CONTEXT.md` when it exists. If a proposed change conflicts with an ADR, surface the conflict explicitly rather than silently overriding it.
