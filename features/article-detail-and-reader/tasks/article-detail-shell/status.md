# Status: Article Detail Shell

**State:** Not started. First of five.

- Branch: `article-detail-and-reader/article-detail-shell`, from `main`.
- Sub-issue: filed with the feature's parent issue at spec review.
- PR: opened once the unit and integration tiers and the browser pass are all
  clean.

## Open items to settle before writing

- **Where the tab components live.** The sidebar's tabs are a detail-page
  concern, so `src/routes/lit-tracker/-article-detail/` is the natural home,
  matching `-collection-page/` and `-collection-filters/`. Confirm rather than
  assume, since task 5 adds a tab and #10 adds another — the folder should be
  shaped for four tabs, not two.
- **Whether the drawer generalizes cleanly.** #8's `FiltersDrawer` is named and
  written for filters. Reusing it here may mean extracting a generic drawer with
  the filters content passed in. That is a refactor of shipped code, so it is a
  decision to raise before making it, not during.
- **What the notes debounce interval is**, and whether it matches the 250ms
  search mirror #8 settled on. A notes field is not a search box and may want
  longer.

## Log

- (not started)
