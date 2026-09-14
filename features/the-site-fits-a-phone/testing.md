# Testing: The Site Fits a Phone

## What each tier can answer

jsdom resolves neither media queries nor `clamp()`, so **no unit test can say
what size anything renders at**. Three tiers, three different questions:

- **Unit** — that the rules exist and name the right tokens. This is what
  regresses when someone edits one of five stylesheets.
- **A real 375px browser window** — the computed sizes and the character count.
  Reachable in Safari via AppleScript window bounds (see
  [research.md](./research.md)); Chrome cannot go that narrow.
- **The user's iPhone** — whether the page still zooms. Platform behaviour on
  hardware, and the only criterion the agent cannot reach.

## Unit

- **Each of the four controls has a coarse-pointer rule** raising it to
  `--font-size-md`, asserted from its stylesheet with comments stripped
  (`collection-toolbar.test.tsx`'s lesson). One test covering all four, because
  the property is "no typed control is left below the threshold" and that is a
  statement about the set.
- **The rule is `pointer: coarse`, not a width query.** A width proxy would pass
  a naive "is there a media query" assertion while getting the wrong devices.
- **The five controls already at 16px are unchanged** — their declarations still
  read `--font-size-md` with no coarse-pointer override added.
- **`.prose pre` uses a `clamp()` whose floor is at least 0.75rem** and whose
  ceiling is today's `--font-size-sm`, so the desktop appearance is pinned by the
  test rather than by memory.
- **The viewport meta still permits zoom** — no `maximum-scale`, no
  `user-scalable`. Cheap, and it guards the one "fix" that must never be made.

## Browser, at 375px

| Check | Expected |
|---|---|
| code font-size | **12px** (from 14) |
| characters fitting | **40** (from 34) |
| document scrolls sideways | still no |
| code font-size at desktop width | still 14px |
| the four controls, computed | ≥16px where the emulated pointer is coarse |
| both themes | unchanged apart from size |

The before-numbers are in [research.md](./research.md) and are what the
after-numbers are compared against.

## The user's phone

One check, on a real iPhone:

1. Open the collection and tap the **tag find field** in the filters.
2. The page should not zoom, and the cursor should land in the field.
3. Open a blog post with code and confirm the block reads comfortably.

Step 3 is a judgement, not a measurement — 12px was chosen from character counts,
and whether it is *pleasant* is what hardware answers.

## Not covered

**No e2e specs** — deferred project-wide until the tracker is built out.

**Whether `pointer: coarse` matches on every phone context.** It is the standard
signal and the same kind of query the project already uses for hover, but it is a
capability report rather than a guarantee. The user's phone check is what
confirms it matched.
