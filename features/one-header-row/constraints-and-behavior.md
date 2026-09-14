# Constraints and Behavior: One Header Row

## Behavior

**The header is the same height on every page of the site.** Moving from the
personal site to the Lit Tracker, or back, shifts nothing vertically. That height
is a declared value, not a sum of padding and whatever the tallest item happens
to be.

Everything else about both headers is unchanged. The site header still shows the
bold site name, three nav links and the theme toggle, still sticks to the top of
a scrolling page. The tracker header still shows the app name, the open article,
the path, the account control and the toggle, still forms the fixed top edge of
an app shell that does not scroll.

## Constraints

### The row is shared; where it sits is not

The two headers have genuinely different positioning models and both are decided:
`position: sticky; top: 0; z-index: 1` on a page that scrolls as one unit, versus
a static first grid row in a shell that is exactly one viewport tall. **The
shared component must not position itself.** Each caller adds its own positioning
to the shared class — `composes:`, as the tracker's dialogs already do, since the
project has no class-merging helper.

`z-index: 1` on the site header must survive the move exactly. It is what keeps
the sticky row above page content, and it sits deliberately below the skip link
(10) and the toaster (100).

### The height is declared, and `min-height` rather than `height`

A fixed `height` would clip rather than grow if an item ever exceeds it; the
failure mode should be an ugly tall row, not a cropped control. Keep a small
`padding-block` as the floor for that case, so the row still breathes if it ever
has to grow past the declared value.

**The declared value is `3.5rem` (56px)**, with the 1px border inside it
(`box-sizing: border-box` is global). Why that number:

- It holds the tracker's 32px avatar with 11.5px of air on each side — marginally
  tighter than today's 12px, and the same rhythm the row already has.
- It is a round value on a scale that is otherwise all quarter-rems, where the
  numbers being replaced (58.59 and 57) are neither round nor intentional.
- It shortens the site header by 2.6px and the tracker's by 1px, which is
  vertical space back on a phone — relevant to the reported items about the site
  fitting a small screen, though not their fix.

This is the one number in the feature worth disagreeing about; changing it is a
one-line change and the tests assert *agreement*, not the specific value.

### Both headers keep their own identity

The merge is of the row, not of the contents. The personal site's header still
has **no auth UI** and **no active-page indication**
(`research/ui-ux/pages/site-wide/components/header.md`); the tracker's still has
no site nav links. A shared component that starts accumulating `if (site)`
branches for items has merged the wrong thing.

### The horizontal rhythm moves with the row

`--header-inline-space: clamp(0.5rem, 2.5vw, 1.5rem)` is currently declared
identically in both stylesheets, and both rely on it cascading to descendants
(`.nav`'s gap on the site; nothing yet in the tracker). It belongs to the shared
row now, declared once, and must still cascade.

### Single row at every width

Neither header may wrap or collapse into a hamburger at any width, down to
~320px: `flex-wrap: nowrap`, `white-space: nowrap`, and the font `clamp()` are
what hold that, and all three are shared row properties. The site header's
intrinsic width was already the binding constraint on very narrow screens once —
`--header-inline-space` exists because fixed `--space-lg` spacing forced
horizontal page scroll under ~374px.

### The tracker's ellipsis behaviour survives

The tracker's app name truncates and its article title shrinks, deliberately, so
that the theme toggle is never pushed off a narrow screen. Those rules belong to
the items and stay with them; the shared row must not impose a `min-width` or an
`overflow` that defeats them.

## Acceptance criteria

1. `/`, `/blog`, `/about`, `/projects` and `/lit-tracker` all report the **same**
   header height, at desktop and at phone width, in **both Chrome and Safari**.
2. The height comes from one declared value; neither header's stylesheet computes
   a height of its own.
3. The site header is still sticky with `z-index: 1`; the tracker header still
   positions nothing and is still the shell's first grid row.
4. Both headers render exactly the items they rendered before, in the same order,
   with the same destinations — the existing tests for both still pass unchanged.
5. A test fails if the two rows stop agreeing on height.
6. Neither header wraps at 320px, and the tracker's app name still truncates
   before the toggle is pushed off.
