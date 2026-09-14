# Feature: Controls Look Like Controls

**#18** in [../index.md](../index.md). Four reported items with one thing in
common: a control that does not read as one.

## What it is

- **A label is indistinguishable from the things you can press.** In the
  collection's filter rail, the group headings "status" and "tags" render in
  exactly the same colour, size and weight as the toggles beneath them. Not
  similar — identical: `rgb(89, 89, 89)`, 14px, weight 400. "tags" and "read"
  even measure the same 33.6px wide.
- **The "+" is not square.** 28.4 × 39.5px, aspect 0.72. Its width is what it
  needs; its height is whatever the search field beside it happens to be.
- **The file picker is unstyled.** A bare native `<input type="file">` —
  `border: none`, transparent, no padding, no radius — in a modal whose every
  other surface is drawn.
- **The upload spinner wobbles.** Reported by the user; the cause is not the
  icon being off-centre, which was checked and ruled out.

## Why it is worth a feature

Because the first item is an **affordance** failure, not a cosmetic one. A reader
looking at the rail cannot tell which words do something, and the only difference
between a heading and a button there is the element name — which nobody can see.
The decided spec already asked for the opposite:

> A quiet heading over each group is what makes the difference visible without
> making them look like two different mechanisms.
> — `research/ui-ux/pages/lit-tracker/pages/collection-view.md`

So this feature **implements a decision rather than reversing one**. The
intent was hierarchy; the execution produced none, because the heading was made
quiet and the control was already equally quiet.

The other three are the upload cluster — the "+", the modal it opens, and the
status indicator beside it — and they are grouped because they are the same
surface and the same kind of unfinishedness, not because small jobs travel
together.

## What it delivers

- **Pressable things that look pressable.** The shared tag toggle's resting
  colour rises to full contrast; the group labels stay muted. The hierarchy then
  says what it means: the quiet thing is the label, the loud thing is the
  control.
- **A square "+"**, sized by itself rather than by its neighbour.
- **A file picker that reads as a drop target**, styled as far as a native file
  input portably can be.
- **A spinner with an integer box**, removing the one measured candidate for the
  wobble.

## What it does not do

- **It does not add a `#` to the tracker's tags.** The blog writes tags `#name`
  and the tracker writes them plainly; that is decided, and it is *why* the blog
  survives the same pairing while the tracker does not.
- **It does not restyle the native file input's button.** That part is a vendor
  pseudo-element and not portably reachable. The box around it is what gets
  drawn.
- **It does not promise the wobble is fixed.** The icon's art was proved centred
  and its box was measured fractional; the integer box removes that cause. The
  user confirms the result, because the artifact is below what the agent can
  resolve (user-decided 2026-09-13).

## Exit state

A reader opening the collection can see at a glance which words in the rail are
filters and which are labels. The "+" is a square button. The picker looks like
somewhere to put a file. And the spinner has one fewer reason to judder.
