# Doc Formatting Conventions

Researched: 2026-07-05. Decided: 2026-07-05.

Every research category so far (`technologies/`, `ui-ux/`, `coding-conventions/`,
`project-management-conventions/`, `accessibility/`) has converged on the same
document structure by precedent, without it ever being written down as its
own decision. This formalizes that existing practice so future docs stay
consistent by reference rather than by copying the nearest example.

## Decision

- **Topic-file structure**, in order: `# Title Case Heading`, a
  `Researched: <date>. Decided: <date>.` line, an intro paragraph stating the
  question being decided (often cross-linking prerequisite decisions),
  `## Decision` (bulleted, lead word/phrase bolded), `## Reasoning` (why,
  tying back to project constraints or [AGENTS.md](../../AGENTS.md)
  principles), and `## Sources` (one bullet per real, linked URL, with a
  trailing description of what it supports).
- **Headings are Title Case** (e.g. "Formatting and Linting", "Motion &
  Reduced Motion"), never sentence case.
- **Category `index.md` structure:** `# Research: <Category>`, a `Status:`
  line, an intro paragraph, then `## Topics` — a bullet list of
  `[file.md](./file.md) — Decided. <one-line summary>.` entries. A category
  with cross-category dependencies notes a boundary explicitly (see e.g.
  [../accessibility/index.md](../accessibility/index.md)'s note toward
  `../testing-qa/index.md`) rather than editing the other category's file.
- **Cross-links are always relative markdown links** — `[label](./file.md)`
  within a category, `[label](../other-category/file.md)` across categories,
  `[label](../../path/FILE.md)` up to project-root docs like
  [AGENTS.md](../../AGENTS.md) or
  [DESIGN.md](../../high-level-guidance/design/DESIGN.md).
- **Prose wraps at ~80 characters.** Not a hard rule enforced by tooling,
  but consistent across every existing doc — kept for diff-friendliness and
  readability in plain-text viewers.
- **This pattern applies to `research/` decision docs specifically.** If the
  project later needs user-facing documentation of a different kind (a
  README, a contributor guide, onboarding docs) that is a distinct document
  type this pattern does not cover — the
  [Diátaxis](https://diataxis.fr/start-here/) framework
  (tutorials/how-to/reference/explanation) would be the more relevant
  reference at that point, not this one.

## Addendum (2026-07-06)

The user-facing README anticipated above now exists:
[README.md](../../README.md) (project overview + how-to setup steps, per
the Diátaxis distinction — not a decision record, so it does not use this
doc's ADR-style structure). It is linked from the documentation root
[index.md](../../index.md) under "Overview and Setup".

## Reasoning

- Formalizing precedent rather than introducing something new avoids
  duplicating an already-consistent convention under a slightly different
  name (see [AGENTS.md](../../AGENTS.md) "Avoid duplication") — every
  existing category already follows this structure; the gap was that it was
  implicit, not that it was wrong.
- The `Researched:`/`Decided:` line, intro paragraph, and `## Reasoning`
  section are a lightweight variant of the classic **Architecture Decision
  Record (ADR)** format (Title/Status/Context/Decision/Consequences) — this
  project's status line plays the role of ADR's `Status` field, the intro
  paragraph plays `Context`, and `## Reasoning` plays `Consequences`. Reusing
  a well-established pattern rather than inventing a bespoke one keeps the
  convention recognizable to anyone familiar with ADRs.
- The mandatory `## Sources` section is a deliberate addition beyond classic
  ADR (which doesn't require external citations). It exists specifically to
  make [AGENTS.md](../../AGENTS.md)'s "Research over recall" rule
  structurally checkable — a topic file without real linked sources is
  immediately identifiable as not having done the research, rather than
  relying on trust that it was done.
- Diátaxis is a good fit for user-facing documentation, but it answers a
  different question (how should content serve a *reader trying to
  accomplish something* — tutorial vs. reference vs. explanation) than what
  this project's `research/` docs are for (recording *why a decision was
  made*, for future agents/maintainers, not end users). Naming it as
  out-of-scope now avoids it being silently conflated with this convention
  later, while keeping it discoverable if the project's documentation needs
  grow.

## Sources

- [adr.github.io — ADR templates](https://adr.github.io/adr-templates/) —
  overview of the ADR format family this project's pattern is a lightweight
  variant of.
- [joelparkerhenderson/architecture-decision-record — Nygard template](https://github.com/joelparkerhenderson/architecture-decision-record/blob/main/locales/en/templates/decision-record-template-by-michael-nygard/index.md) —
  the original Michael Nygard ADR template (Title/Status/Context/Decision/
  Consequences).
- [Cognitect — Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) —
  the original rationale for why lightweight decision records work.
- [Diátaxis](https://diataxis.fr/start-here/) — the
  tutorials/how-to/reference/explanation framework, noted as the relevant
  reference for user-facing docs if that need arises later, not for this
  category's decision-record convention.
