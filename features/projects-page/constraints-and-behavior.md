# Constraints and Behavior: Projects Page

Acceptance criteria for the feature as a whole. The single task's own
`constraints-and-behavior.md` states which of these it satisfies (here: all of
them).

## Page content and layout

- `/projects` renders a **"projects"** heading — the page's single `<h1>`, and
  the target the shell's client-navigation focus handoff moves focus to.
- Below it, a **list of sub-application entries**. Each entry is a **name**
  followed by a **one-line description**, the description in the site's dimmer
  secondary text color (`--color-text-muted`) so it reads as subordinate to the
  name without any extra visual element.
- **Exactly one entry at launch:** the Academic Literature Tracker, described
  in one line drawn from its design document.
- **No card or grid layout, no extra metadata** — no tech-stack list, status
  badge, thumbnail, or date. Name and description only.
- Content is **entirely static** — no data fetching, no reactive subscription,
  no loading/empty state.
- The page renders inside the existing sticky header shell and inherits its
  theming; it is correct in both light and dark themes.
- The placeholder `/projects` route is **replaced**, not left beside the real
  page: no stub component survives this feature.

## Entry interactivity

- The entry is **plain text, not a link**, for as long as there is no
  Literature Tracker route to link to (see
  [description.md](./description.md) and [research.md](./research.md)). The
  page must not contain a link to a URL that does not resolve.
- Nothing about the markup or styling may make the entry *look* interactive
  while it is not: no underline, no pointer cursor, no hover affordance.

## Cross-cutting quality

- WCAG 2.2 AA, consistent with the site-wide target: 4.5:1 text contrast in
  both themes (the muted description included), valid heading structure, and a
  list exposed with correct semantics to assistive technology.
- No horizontal overflow at a narrow (mobile) viewport, and a readable line
  length at wide viewports — the entry wraps rather than forcing the page to
  scroll sideways.
- Runs identically via `npm run dev` and `docker compose up`.
- CI (Biome, typecheck, unit tests with ratchet coverage, Playwright e2e + axe,
  PR-title lint, GPG-artifact drift check) passes.

## Explicitly out of scope

- The Literature Tracker itself, its route, its URL, and its own header — all
  Phase 2/3 work.
- Turning the entry into a link (owed to the Phase 3 feature that creates the
  tracker route).
- Any second entry: this site hosts one sub-application today.
- Any data layer, authentication, or reactive data.
