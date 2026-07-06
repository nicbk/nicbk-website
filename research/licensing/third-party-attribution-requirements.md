# Third-Party Attribution Requirements

Decision: one user-facing attribution obligation exists — a Semantic
Scholar credit in the Lit Tracker UI. Everything else in scope (GROBID,
fonts, icons) is satisfied by normal dependency-license hygiene already
covered by
[dependency-license-audit.md](./dependency-license-audit.md), with no
additional action needed.

## Semantic Scholar API — attribution required

Per Semantic Scholar's API license agreement (Section 4): "Licensee will
include an attribution to 'Semantic Scholar' on its website or in any
published materials for contributions from S2 through Licensee's use of
the API and/or S2 Data." No specific mandated wording, logo, or placement
— a visible text credit/link is sufficient. Their branding rules govern
logo/trademark use separately, so the simplest compliant approach is a
plain text credit/link rather than using their logo.

This needs to surface wherever Semantic Scholar-sourced bibliography data
is displayed in the Academic Literature Tracker — most likely the
article-detail and citation-graph views (see
`research/ui-ux/pages/lit-tracker/pages/article-detail.md` and
`.../components/citation-graph.md`), since those are where enriched
metadata from Semantic Scholar (per
[../technologies/pdf-metadata-extraction.md](../technologies/pdf-metadata-extraction.md))
actually appears to the user. Exact placement/wording is a UI implementation
detail, not a licensing decision — the requirement is just that a credit
must exist somewhere in that view.

## GROBID — no end-user-facing attribution needed

GROBID is Apache 2.0 and self-hosted as an unmodified processing service,
the same pattern as Garage in `dependency-license-audit.md` — its source
isn't being redistributed, so there's no NOTICE-file obligation, and no
NOTICE file exists in its own repo to propagate. GROBID's README suggests
an academic citation (BibTeX) for papers published about using it, which
doesn't apply here and is optional, not a requirement.

## Fonts/icons — already decided, no-obligation

Both already chosen in `research/ui-ux/design-system.md`:

- **JetBrains Mono** (SIL OFL 1.1) — the OFL explicitly requires no UI
  acknowledgment. The only obligation is bundling the license text
  (`OFL.txt`) alongside the font files when self-hosting them — a
  repo-file detail, not a UI requirement.
- **Lucide** (MIT) — standard copyright-notice retention, satisfied by
  keeping the package's LICENSE file in place as normal (already covered
  by ordinary dependency hygiene) — no UI-facing requirement.
