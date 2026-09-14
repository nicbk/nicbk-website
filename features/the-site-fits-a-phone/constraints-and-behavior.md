# Constraints and Behavior: The Site Fits a Phone

## Behavior

**Tapping a text field on a phone puts a cursor in it and leaves the page where
it was.** No lurch, no pinch back out.

**A code block on a phone shows appreciably more of each line** — 40 characters
rather than 34 in the measured case — while a code block on a desktop looks
exactly as it does today.

Nothing else changes. The filter rail, the card menu and both note editors keep
their 14px on a pointer device.

## Constraints

### Pinch-zoom stays available

The other common remedy for the iOS behaviour is `maximum-scale=1` or
`user-scalable=no` in the viewport meta. **That is a WCAG 1.4.4 failure** — it
takes zoom away from every reader to stop the page moving for one — and this
project's viewport tag is deliberately clean. It is not to be touched.

### The bump is a capability query, not a width guess

`@media (pointer: coarse)`, not `@media (max-width: …)`. The thing being
responded to is *a touch input method*, which is what the platform keys its zoom
on; a width is a proxy that gets a touch laptop wrong in one direction and a
large phone wrong in the other. This is the same reasoning the project already
applies to `@media (hover: hover)` for hover affordances.

A touch laptop getting 16px fields is an acceptable outcome; a phone in landscape
missing them is not.

### 16px is a threshold, not a size that happens to work

The value cannot be "about 16" — 15.9px zooms. Any expression used must resolve
to **at least** 16px, which rules out an `em`-based value on a surface whose own
font-size is clamped, and rules out a `rem` value under 1 if the root ever moves.
`--font-size-md` is exactly 1rem and is the token to use.

### The four controls, and only those four

The five already at 16px are not to be "made consistent" as part of this. They
are correct, and touching them widens the diff for no behaviour.

### Code stays readable, and the block keeps scrolling

12px is the floor, and it is a floor rather than a target: below it a dense
listing stops being comfortable, and the gain is small — 11px buys four more
characters. Long lines still overflow, and `overflow-x: auto` on the block stays
exactly as it is. **The document must still not scroll sideways** — the block
contains its own overflow today and must keep doing so.

### Inline code follows the block, or is deliberately left

`.prose :not(pre) > code` is `0.9em` — relative to the prose around it, so it
already scales with body text rather than with the block. It is not part of this
change, and if it looks wrong beside a 12px block on a phone, that is a finding
for the browser pass, not an assumption to act on now.

## Acceptance criteria

1. On a touch device, all four named controls compute to **≥16px**; on a pointer
   device they still compute to 14px.
2. The viewport meta is unchanged and still permits zoom.
3. `.prose pre` resolves to 12px at 375px and 14px at desktop widths, fluidly.
4. At 375px a code block fits **40** characters where it fit 34, and the document
   still does not scroll sideways.
5. The five controls already at 16px are untouched.
6. Both themes and both engines unaffected — this is type sizing, not paint
   order, but the code block is on a page the user reads in Safari.
7. **The user confirms on a real iPhone** that focusing a field no longer zooms.
   That is the one criterion the agent cannot check, and it is the reason this
   feature was accepted with the user as verifier.
