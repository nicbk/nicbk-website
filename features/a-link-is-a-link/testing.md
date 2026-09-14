# Testing: A Link Is a Link

## Unit

- **Plugin config** (task 1): the link tool has its own category, the lock names
  only it, and no markup tool carries that category.
- **Link click** (task 1): URI → clipboard write + confirmation; `mailto:` →
  address alone; destination → no clipboard write; no target → nothing.
- **Resolver** (task 2): every shape in constraints criterion 4, on synthetic
  runs. Also: label must *start* a run (`see [13]` in body text does not snap);
  the nearest page wins when a label appears on two; the fallback height is
  clamped to the page.
- **Popover** (task 3): renders the region it is given; "go to" calls scroll with
  the region's page and top; dismisses on Escape and outside click.

## Browser

Local stack. Hit-test before every click.

| Check | Task |
|---|---|
| click `[13]`: no selection, no menu | 1 |
| click a URL: clipboard holds it, toast shown | 1 |
| highlight a sentence containing a citation, drag starting on it and ending on it | 1 |
| select, note and delete a mark created for the check, by its id | 1 |
| citation preview in Attention, BERT, NeurIPS and PLOS shows its own entry | 3 |
| a table link previews the table; "go to" jumps | 3 |
| a link inside a mark — record which wins, then raise | 3 |
| 375px viewport; touch; keyboard | 3 |

Chrome and Safari. Marks created for a check are deleted by the id recorded at
creation.

## Not covered

No e2e specs — deferred project-wide.
