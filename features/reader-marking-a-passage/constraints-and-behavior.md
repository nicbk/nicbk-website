# Constraints and Behavior: Reader Marking a Passage

Acceptance criteria for **#15**. What must be true when it is done, what must
not have changed, and the constraints the implementation works under.

## Satisfied here

**A selection finishes, once, however it was made.**

- A drag released over a page other than the one it started on ends the
  selection, exactly as one released over its own page does.
- A selection applied programmatically — every touch selection, since #12's task
  4 — counts as finished the moment it is applied.
- Finishing happens **once per selection**, not once per page it covers and not
  again on the next unrelated pointer event.

**The copy control appears for every selection.**

- Including one that spans a page break, which is where it is most wanted and
  where it is missing today.
- ⌘C keeps working exactly as it does now, independently.

**A passage can be marked from the selection itself.**

- The floating control offers the four text tools beside `copy`: highlight,
  underline, strikeout, squiggly.
- Marking a selection that spans pages produces **one mark per page**, each
  covering that page's part of the passage — the shape EmbedPDF's own text
  markup produces for a multi-page selection.
- A mark made this way is indistinguishable afterwards from one made with the
  toolbar tool: same stored row, same sidebar entry, same menu, same quoted
  text.
- The action a reader takes is available to the keyboard, and reachable by touch
  at a target no smaller than the copy control's.

**A live markup tool still marks what a drag selects**, including across a page
break, which is the half of the defect that belongs to the mouse.

## Must not regress

- **Everything #12 delivered**: the hold, the handles, the magnifier,
  cross-page extension, auto-scroll, pinch, touch scrolling, click-away.
- **The twelve tools and the sticky-tool flow** from #9 — picking a draw tool
  and dragging still makes a mark, and the tool stays live afterwards.
- **The mark's own floating menu** — delete, and the comment editor — which is a
  different control over a different thing and must not be confused with this
  one.
- **`annotation-sync/`'s loop guard.** Marks made here travel the same path as
  every other mark: committed events only, fingerprint-checked. A second write
  path would be a second way to desynchronise the paper and the rows.
- **The copy path**, control and shortcut, including a PDF that withholds
  permission to extract its text.
- **Escape still puts everything down**, and clicking the bare paper still
  deselects a mark without drawing another (#12's task 6).

## Constraints particular to this feature

- **Built on EmbedPDF's public API; the dependency is not patched.** Decided
  with the user on 2026-09-11 — see [research.md](./research.md) for what was
  weighed. Anything this reader has to do for itself is written where a reader
  of the code can see *why*, with the library behaviour it compensates for named
  and cited.
- **"The library did not finish this selection" is asked, not assumed.**
  `getState(documentId).selecting` is the public flag; the reader acts on what
  it says rather than on a guess about which gesture just happened.
- **No second definition of what a markup tool is.** The marks this feature
  creates take their shape from the live tool's own `defaults`, read from the
  annotation capability — not from constants copied out of the library.
- **Nothing new may be drawn per page.** The floating control is one element for
  the document, as it is today; the reader already pays for a dozen mounted
  pages (#14).
- **The control must hold at realistic content.** It is one item wider than
  double today, it floats over the paper near the selection, and it has to fit a
  500px-wide panel without covering the passage it acts on.

## Cross-cutting

- WCAG 2.2 AA: every action reachable by keyboard and named for assistive
  technology; touch targets at least 24×24 (the reader's handles already set
  44×44 as the house size); the control's contrast holds in both themes.
- Both themes; narrow, mid and wide.
- No schema change, no new mutator, no new route — marks are the rows #9 built.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
