# Search Input

Status: Decided 2026-07-17.

The site's single, shared search field, used wherever a surface offers
free-text search — the blog index today, the lit-tracker collection view next.
Built once at `src/routes/-shared/components/search-input/` and imported by each
surface so they present the identical control, not look-alike reimplementations
(see the shared-primitive note in [../../../design-system.md](../../../design-system.md)).

**Appearance**: a rounded, filled pill with a leading magnifier icon
(Lucide `Search`) and placeholder text, matching
[../../../sample-mockups/literature-tracker-sample.png](../../../sample-mockups/literature-tracker-sample.png).
The fill is the `--color-bg-surface` token (the same surface used for the header
band and cards) with a `--color-border` outline and `--radius-md` corners; the
keyboard focus ring is drawn on the whole pill (not the inner input), mirroring
the global `:focus-visible` indicator. It fills its container by default; a
consumer caps the measure via a class (the blog constrains it to its readable
column width).

**Implementation**: Base UI `Field` + `Input`, not a hand-rolled
`<label>`/`<input>` — `Field` associates the visually-hidden label (the
accessible name; the placeholder carries the visible cue) with the control, per
the "extend Base UI primitives" policy in
[../../../design-system.md](../../../design-system.md). `Input` renders a native
`<input>`, so `type="search"` still yields the `searchbox` role and the native
clear affordance.

**Behavior**: fully controlled and reports every keystroke immediately — the
component holds no state and does no debouncing. Debouncing and any URL syncing
are the caller's concern, so the field stays instantly reactive regardless of
how its state is persisted. For the blog that wiring (local-state mirror →
debounced URL) lives in `use-blog-filters.ts`; see the continuously-edited-state
pattern in
[../../../../coding-conventions/state-management-conventions.md](../../../../coding-conventions/state-management-conventions.md).
