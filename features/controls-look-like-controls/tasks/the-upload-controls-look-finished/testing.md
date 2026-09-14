# Testing: The Upload Controls Look Finished

Inherits [the feature's testing notes](../../testing.md).

## Unit

- **The trigger declares a square.** Whether by equal width/height or
  `aspect-ratio: 1`, asserted from the stylesheet — so a later edit to the row's
  alignment cannot silently stretch it again. Comments stripped first.
- **`.controls` still declares `align-items: stretch`.** The squaring must not
  have been bought by removing the fix that keeps the row level.
- **The picker is still a multi-select file input** — `type="file"` and
  `multiple` on the rendered element. This is the test that stops "style it"
  becoming "replace it".
- **The icon box is integral.** Assert the declared value is one that resolves to
  whole pixels at the sizes it is used at, with the reasoning in the test's
  comment rather than only in the stylesheet.
- **The reduced-motion gate still wraps the animation.**
- Existing tests for `upload-modal`, `upload-status` and `collection-toolbar`
  pass **unedited**.

## Browser

| Check | How |
|---|---|
| the "+" is square | measured rect; `width === height` |
| the row still lines up | measure the "+", the indicator and the search field; heights agree |
| the picker | open the modal: dotted boundary visible, and the field reads as a target |
| the picker still works | it opens the platform dialog and accepts **more than one** file |
| keyboard | tab to the field and open it from the keyboard |
| the spinner's box | measured rect is a whole number |
| dark theme | all of the above |
| phone width | the modal and the toolbar hold up; the "+" stays square |

The upload status spinner only appears while a job is in flight. If exercising it
means uploading, **record the article ids at creation and delete by id
afterwards** — never by a `created_at` window, which has taken the user's own
rows before.

## What is deliberately not tested

**Whether the wobble is gone.** It is below what the agent can resolve; the
frozen-phase probe and why it was inconclusive are in
[the feature's research](../../research.md). The user judges, and the PR says so
rather than implying a fix.
