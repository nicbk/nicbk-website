# Research: The Site Fits a Phone

Traceability into `research/*.md`, and the measurements taken before this was
spec'd.

## Decided documents this builds on

- [styling-conventions.md](../../research/coding-conventions/styling-conventions.md)
  — CSS Modules, tokens from `src/styles/`, hover affordances gated on
  `@media (hover: hover)`. The `pointer: coarse` query below is the same *kind*
  of rule as that hover gate: a capability query rather than a width guess.
- [typography.css](../../src/styles/typography.css) — `--font-size-sm`
  (0.875rem), `--font-size-md` (1rem), and the fluid `clamp()` pattern the larger
  tokens already use.
- The site's viewport tag, `__root.tsx`: `width=device-width, initial-scale=1`.
  **Deliberately no `maximum-scale`** — which is what makes the iOS item a real
  problem to solve rather than one to suppress.

## Item 12 — which controls zoom, and why

WebKit zooms the page when a focused text control's computed `font-size` is below
16px. Enumerated from the markup rather than the stylesheets, so nothing was
missed:

| Control | File | Size | Zooms? |
|---|---|---|---|
| tag find field | `filter-groups.module.css` `.find` | `--font-size-sm` = **14px** | **yes** |
| card-menu tag input | `article-tag-controls.module.css` `.filter` | **14px** | **yes** |
| notes textarea | `notes-panel.module.css` | **14px** | **yes** |
| annotation note textarea | `annotation-note-editor.module.css` | **14px** | **yes** |
| collection search | `search-input.module.css` | `--font-size-md` = 16px | no |
| article-edit inputs | `article-edit-dialog.module.css` | 16px | no |
| authors editor | `authors-editor.module.css` | 16px | no |
| delete-account confirm | `delete-account.module.css` | 16px | no |
| reader page number | `page-navigation.module.css` | `font: inherit` → 16px | no |

None of the four are width-dependent — `--font-size-sm` is a flat 0.875rem with
no `clamp()` — so they zoom at every viewport, not only at some.

**The remedy's shape was decided, not assumed** (user, 2026-09-14): raise those
four to 16px **only under `@media (pointer: coarse)`**, leaving the desktop
appearance untouched. The alternative — 16px everywhere — was offered and
declined, because the quiet 14px is what those surfaces were designed with.

## Item 1 — code blocks, measured at a real phone width

`.prose pre` is `font-size: var(--font-size-sm)` — a fixed 14px at every width.

Measured on `/blog/building-this-site` in a **375px** window:

| | |
|---|---|
| viewport | 375px |
| code font-size | 14px |
| block width / inner width | 327px / 293px |
| character advance | **8.43px** |
| characters that fit | **34** |
| longest line in the post | **62** |
| horizontal overflow | **214px** |
| document scrolls sideways | no — the block contains it |

So a reader sees a little over half of each line. Body text on the same page is
16px, so **the code is already smaller than the prose**: "too large" is relative
to the *column*, not to the surrounding text, which is why the remedy is about
fitting characters rather than about matching body copy.

What the sizes buy, at that column width:

| size | characters |
|---|---|
| 14px (today) | 34 |
| 12px | 40 |
| 11px | 44 |
| ~8px | 62 — and unreadable |

**Decided (user, 2026-09-14): fluid from 12px to today's 14px.** The conservative
end, chosen knowing that long lines still scroll — fitting them all is not
available at a readable size.

## A method note worth keeping: how a phone viewport was reached

Every browser pass in this project has been driven through Chrome, and **Chrome
refuses to resize its window below roughly 500px** — which is why several earlier
tasks recorded "320px not verified" and why this feature was initially flagged as
one the agent might not be able to check at all.

**Safari accepts arbitrary window bounds via AppleScript.** `set bounds of window
to {100, 100, 475, 800}` produced a genuine 375px viewport, and every figure in
the item 1 table was measured there.

This unblocks narrow-width verification generally, not just here — the earlier
"could not reach 320px" notes in #17 and #18 were a limitation of the tool being
used, not of what is possible. It does not replace the user's phone: it gives a
real viewport, not a real device, so platform behaviour like the iOS zoom itself
still needs hardware.

**What did not work:** `screencapture -R` against the window's screen
coordinates, which captured the desktop instead. Not pursued — screen captures of
the user's display risk catching whatever else is on it, and the geometry is what
the project's own guidance says to trust anyway.
