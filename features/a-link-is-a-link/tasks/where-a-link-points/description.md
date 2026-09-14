# Task: Where a Link Points

Task 2 of 3 of [#22](../../description.md). Sub-issue
[#187](https://github.com/nicbk/nicbk-website/issues/187).

A pure function: given a link (its rect and text), its target, the text runs of
the target page and its neighbours, and every link target on the target page,
return the region worth previewing — `{ pageIndex, rect }` — or `null`.

The rules and their order are in the feature's
[constraints](../../constraints-and-behavior.md#where-a-link-points-is-a-pure-function).

## Does not

Render, extract text for display, or touch the DOM.
