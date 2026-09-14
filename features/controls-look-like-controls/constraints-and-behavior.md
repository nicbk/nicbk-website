# Constraints and Behavior: Controls Look Like Controls

## Behavior

**In the filter rail and on the blog's tag filter, the things you can press are
darker than the words that label them.** A reader can tell at a glance which
words are filters. Selecting one still turns it accent-coloured and bold, as now.

**The "+" on the collection toolbar is square.** The picker it opens shows a
drawn file field rather than a bare native input. The upload spinner's box is a
whole number of pixels.

## Constraints

### The heading cannot recede, so the control must advance

`--color-text-muted` is the quietest colour that still clears 4.5:1 against the
page, and `src/styles/contrast.test.ts` holds that line. `.groupLabel`'s own
comment records that fading it further was tried and failed the light-theme axe
scan (WCAG 1.4.3). **So the difference cannot be made by making the label
quieter** — the only direction left is up, on the control.

**Decided with the user (2026-09-13): raise the toggles everywhere.** The shared
`TagToggle`'s resting colour becomes `--color-text`; the group labels stay muted.
The blog's tags get darker too, which the user chose knowingly: the blog has the
same latent defect and is only saved by the `#` its tags carry.

### The selected state must stay distinguishable from the new resting state

Today a pressed toggle is `--color-accent` **and** bold, deliberately — colour
alone would fail WCAG 1.4.1. Raising the resting colour narrows the gap between
resting and pressed, so that pairing is now load-bearing rather than belt-and-
braces. The bold must stay, and the accent must remain visibly distinct from
`--color-text` in **both themes**.

### One toggle, two surfaces, no variant

`TagToggle` exists because the blog and the tracker needed the same control and
must not drift. The remedy is a change to that one component, not a prop that
makes it behave differently per caller. If a caller needs an exception, that is
evidence the remedy is wrong.

### The "+" must not re-break what `stretch` fixed

`.controls { align-items: stretch }` exists because three separately-sized
controls looked ragged side by side. Making the "+" square must not return the
row to that state: the other controls' heights still have to agree with each
other and with the search field. Squareness is about the "+" sizing *itself*, not
about opting out of the row's alignment and landing wherever.

### The file input stays native

The picker is a real `<input type="file">` on purpose — multi-select, keyboard
operation and the platform dialog all come free and would have to be rebuilt
otherwise. Only the box around it is styleable portably; the button part is a
vendor pseudo-element. **Do not replace the control**, and do not hide it behind
a fake one that drops keyboard access.

### The spinner change is a candidate, not a cure

The box becomes an integer number of pixels because that is the one measured
candidate for the wobble. **Do not claim the wobble is fixed** — the artifact is
below what the agent can resolve, and the user confirms. If it persists, the next
step is a different method, not a second guess.

## Acceptance criteria

1. In the rail and on the blog's tag filter, a group heading and a resting toggle
   differ measurably in colour; the heading is `--color-text-muted` and the
   toggle `--color-text`.
2. A pressed toggle is still accent-coloured **and** bold, and is still visually
   distinct from a resting one in both themes.
3. Contrast tests and the axe scans still pass.
4. The "+" is square — equal width and height — and the toolbar's controls still
   line up with each other and with the search field.
5. The file field is drawn: a dotted boundary marking it as a drop target, and it
   is still the native input, still multi-select, still keyboard-operable.
6. The spinner's box measures a whole number of CSS pixels at the toolbar's font
   size.
7. Nothing above regresses at phone width or in dark theme.
