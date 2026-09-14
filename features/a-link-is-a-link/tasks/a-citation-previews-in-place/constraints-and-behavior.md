# Constraints and Behavior: A Citation Previews in Place

- **Measure a link inside a mark first**, and raise which should win with the
  user before building either behaviour.
- **Same popover conventions as the reader's other popovers** — portal, layering
  from #16, dismissal, and the portal click rule from #20.
- **Rendered at device pixel ratio**, sized to the region, capped to the
  viewport, and legible at 375px.
- **Text runs are read on demand** for the clicked link's pages only, not for the
  whole document on open.
- **A region that resolves badly still previews** — the wrong crop with a correct
  "go to" is the degraded case, never an error.

## Acceptance

Feature criteria 5–6.
