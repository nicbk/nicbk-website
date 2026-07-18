# Design System Foundations

Status: all 7 topics researched and decided (2026-07-02).

Cross-cutting styling/framework decisions that apply across every page and
sub-application, evaluated against the minimalist, monospace/techy aesthetic
in [DESIGN.md](../../high-level-guidance/design/DESIGN.md). Page- and
component-level specifics live in [pages/index.md](./pages/index.md)
instead.

## Design philosophy

Above all, the UI/UX should optimize for **simplicity, intuition,
ease-of-use, and low-friction interaction**. When a topic below (or a page/
component spec in [pages/index.md](./pages/index.md)) has multiple viable
directions, prefer whichever one is simplest for the user to understand and
act on, and actively avoid overcomplicating — extra visual flourish,
configurability, or interaction steps are not worth it unless they clearly
serve this goal.

## Decisions

### CSS/styling approach — Decided 2026-07-02

**CSS Modules.**

Reasoning: Tailwind CSS was the initial front-runner (it has an official
first-party TanStack Start integration), but was ruled out against
[AGENTS.md](../../AGENTS.md)'s "Code readability and documentation"
guidance — large numbers of inline utility classes in JSX reduce
readability, and deduplicating repeated styling is harder in a
utility-class approach without extracting components/utility-combos anyway
(partially defeating the point). CSS Modules are plain, well-documented CSS
with automatic per-component scoping, zero extra runtime dependency, and
native Vite/TanStack Start support — styling logic stays separate from
markup and readable via standard CSS (custom properties for design tokens,
nesting, `composes:` for sharing declarations across modules).

Open item for later: since CSS Modules don't inherently prevent
duplication on their own, maintain a shared global stylesheet of CSS custom
properties (colors, spacing, typography scale — the eventual output of the
"Monospace font selection" and "Dark/light mode theming conventions"
topics below) that every module's CSS pulls from, and use `composes:` for
shared declaration sets where appropriate.

### Component library / design system foundation — Decided 2026-07-02

**Base UI** (headless/unstyled primitives, maintained by MUI).

Reasoning: unstyled primitives (className + data-state/data-* attribute
styling) pair naturally with the CSS Modules decision above — no
Tailwind-coupled copy-paste layer (shadcn/ui) needed, avoiding an
unnecessary dependency per the design philosophy's low-friction/
avoid-overcomplicating guidance. Chosen over Radix UI (the more
established alternative) because Radix was acquired by WorkOS in 2025 and
update velocity has slowed on some components; Base UI is the actively
developed option with full-time maintainers, a better long-term-maintenance
bet for a project without a large team to work around stalled upstream
issues. Ark UI (cross-framework, state-machine-based) was ruled out as
unneeded complexity for a React-only stack.

**Extend Base UI primitives; do not hand-roll equivalents beside them
(clarified 2026-07-17).** When a control needs behavior a Base UI primitive
provides — accessible labelling/validation (`Field` + `Input`), a two-state
pressed button (`Toggle`/`ToggleGroup`), an overlay, a listbox, and so on —
build on that primitive rather than assembling the same thing from native
elements plus hand-written ARIA. Both approaches "work," but mixing them
fragments the app into from-scratch and adopted-foundation halves that drift
apart (the reason Base UI was adopted in the first place), and the hand-rolled
half re-implements accessibility Base UI already gets right. Native HTML is the
correct choice only where **no relevant primitive exists and the native element
already provides the full semantics with no hand-rolled ARIA or state** — e.g.
a plain fire-and-forget action `<button>` such as the theme toggle
(`src/routes/-shared/components/theme-toggle`), which carries no pressed/selected
state and needs nothing Base UI would add. A labelled text field or a
selectable/toggle control does not meet that bar — `Field`/`Input` and `Toggle`
exist for exactly those.

**Shared, reusable primitives are colocated, not per-surface (2026-07-17).** A
control used by more than one surface (e.g. the search field, shared by the blog
index and the lit-tracker collection view) is built once under
`src/routes/-shared/components/` and imported by each, so every surface presents
the identical control instead of look-alike reimplementations. See the
search-input entry under
[pages/site-wide/components/index.md](./pages/site-wide/components/index.md).

### Monospace font selection — Decided 2026-07-02

**JetBrains Mono**, self-hosted (SIL Open Font License).

Reasoning: widely regarded as the best all-around free/open-source
monospace font — 5 weights, true italics, ligatures, strong legibility for
extended reading, satisfying the open-source-only constraint in
[DESIGN.md](../../high-level-guidance/design/DESIGN.md). Chosen over IBM
Plex Mono (more distinct/industrial character, also viable) as the safer,
more neutral default; Berkeley Mono was excluded outright as a paid font.
Self-hosting (rather than an external font CDN like Google Fonts) avoids a
third-party runtime request per page load and keeps font loading under the
project's own control/uptime — not a hard requirement from
[DESIGN.md](../../high-level-guidance/design/DESIGN.md) (which only
mandates open-source *components*, not delivery method), just the simpler
and more self-contained default.

### Dark/light mode theming conventions — Decided 2026-07-02

**Both dark and light themes**, defaulting to the user's OS preference via
`prefers-color-scheme`, with a persistent manual toggle to override (part
of the site-wide header/user-settings surface — see
[pages/index.md](./pages/index.md)).

Reasoning: this is standard 2026 practice — never force a single theme on
all users. Long-form content (MDX blog posts) reads faster/more accurately
in light mode for many readers under normal lighting, so a dark-only theme
(matching the sample mockups' look) would work against the blog's
readability. The extra cost is small: CSS custom properties are already
the design-token mechanism from the CSS Modules decision above, so a
light/dark pair is just a second set of token values switched by a
`data-theme` attribute (or similar), not a structural change.

### Reactive UI feedback patterns — Decided 2026-07-02

Zero (see [../technologies/sync-engine.md](../technologies/sync-engine.md))
already handles optimistic writes and serves reads instantly from local
cache, which eliminates most of the loading-state surface a non-reactive
app would need. What's left to spec is: (a) the general/default case, and
(b) the specific case of editable UI bound to reactive data, where naive
"just always show the live value" breaks down.

**(a) General/default, minimal-friction baseline:**
- Cold/first load (no local cache synced yet): a simple skeleton/
  placeholder, not a spinner.
- Empty collections: plain inline text, no illustration.
- Live updates to read-only/display UI (not currently being edited): apply
  silently, no badge/flash/"updated live" indicator.
- Errors **outside** a form context (e.g. a background action, a failed
  page-level operation): a dismissible toast notification.

**(b) Editable UI bound to reactive data — "editing" vs "non-editing"
state:**
- Errors **inside** a form context are shown inline in the form, not as a
  toast — a toast is only appropriate when there's no form to attach the
  error to.
- Any UI surface that both displays reactive data and lets the user edit
  it (forms, and more generally any inline-editable field) has two states:
  - **Non-editing** (default): passively reflects live reactive updates
    as they arrive, same as any other read-only UI — no visual indicator
    needed.
  - **Editing** (entered as soon as the user starts changing a field):
    incoming reactive updates to the data being edited are **not**
    surfaced/applied while in this state, so a concurrent external change
    can't clobber the user's in-progress edit. The `popup.png` sample
    mockup's "Changes are not saved." label is exactly this state's visual
    indicator (see [pages/index.md](./pages/index.md)).
  - Successful submission commits the edit and returns the surface to
    non-editing state (reactive updates resume from there, now reflecting
    the just-submitted value plus anything else that changed concurrently
    elsewhere).
  - This pattern is general, not form-specific — it applies to any UI
    (modal forms, inline-editable fields, etc.) that reads *and* writes
    reactive data.

Open items for later (per-page/per-component spec time, in
[pages/index.md](./pages/index.md)): exact cancel behavior (discard local
edits, revert to non-editing showing current live data, is the assumed
default), and how a submit-time conflict (edit rejected because the
underlying data changed in a way that invalidates it) is surfaced — likely
falls back to the inline-form-error pattern above, but worth confirming
per form as those are spec'd.

### Responsive/mobile layout conventions — Decided 2026-07-02

**Mobile-first**, with a small set of standard breakpoints (~768px,
~1024px) via media queries for page-level structural shifts (e.g. the
lit-tracker sidebar filters move below the main content, or become a
toggleable drawer, on mobile), plus **container queries** for reusable
components (e.g. article cards) so they adapt correctly regardless of
which container they're placed in, and fluid type sizing via `clamp()`.

Reasoning: this is the standard 2026 combination and fits naturally with
the CSS Modules decision above — both media and container queries live
directly in each component's own module. Container queries were kept
(over a media-queries-only simplification) because components like the
article card are genuinely meant to be reusable across differently-sized
containers (main grid vs. a narrower sidebar context), and container
support has been baseline-stable since 2023 — not a bleeding-edge risk.

### Icon set — Decided 2026-07-02

**Lucide** (MIT).

Reasoning: single refined outline style, smallest bundle size per icon,
and the simplest possible API (plain named imports, no icon registry or
wrapper component) — no weight/variant choice to make anywhere it's used,
consistent with the design philosophy's low-friction/avoid-overcomplicating
guidance. Phosphor Icons (6 weights) was also viable and MIT-licensed, but
the extra weight options are a per-usage styling decision Lucide avoids
entirely.
