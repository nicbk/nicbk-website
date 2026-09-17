# Testing: The Row Reserves What It Draws

Unit: the stylesheet still declares the square (`aspect-ratio: 1`) and the
stated height, and now also declares a width the layout can see — asserted the
way `upload-modal.test.tsx` already asserts the square, so the fix cannot be
undone silently.

Browser: the overrun measured as 0 at 320, 375, 500 and 1400 in Chrome; the
button square and row-height in Chrome **and** Safari, since the two engines
round it differently and Safari's rounding is what made the defect visible.
