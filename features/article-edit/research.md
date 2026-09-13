# Research: Article Edit

What was read, measured and decided before this feature was written, on
2026-09-12 against `main` at `ed65c9f`.

## The interface was decided six weeks before the code needed it

[article-edit.md](../../research/ui-ux/pages/lit-tracker/components/article-edit.md)
— **Decided 2026-07-02** — already specifies the whole surface: a centered modal
consistent with the upload flow and user settings; two entry points (the card's
three-dot menu, and a flagged row in the upload-status popup); title, authors,
publication year and "any other relevant extracted metadata (e.g. venue/journal,
DOI)", with **title and authors required**; the editing/non-editing reactive
pattern from [design-system.md](../../research/ui-ux/design-system.md); and
deletion behind the same exact-text-match confirmation as delete-account,
explicitly *not* a native `confirm()`.

Two of its sentences were deferred at the time and are answered now. "Exact field
list to be pinned down at data-schema-design time" — it was, in
[article-core-schema.md](../../research/data-modeling/article-core-schema.md),
which names `title`, `authors`, `publication_year`, `venue`, `doi`, `abstract`,
`notes` and marks everything but the first two optional. And references, which
are decided as editable here; see the deferral below.

## The hosts are built, and were built expecting this

`ArticleMenu`'s own doc comment names the feature: *"The decided entry point for
editing an article … which is why everything lands here — #11 adds 'edit…' and
'delete…' to **this** rather than building a second control beside it."* It is
already mounted in both places that need it — on the collection card, and beside
the title on #9's detail page — and it is a Base UI `Popover` rather than a
`Menu`, which matters: a popover's children have no `menuitem` contract, so
adding two buttons to it costs nothing in keyboard semantics.

The confirmation pattern exists as `confirmation-match.ts` (`matchesConfirmation`)
plus the phase machine in `delete-account.tsx` — idle → confirming → deleting,
with the confirm button inert via `aria-disabled` rather than `disabled` so a
screen-reader user can still find it and hear why it is unavailable. That is
reusable behaviour, not a pattern to re-derive.

## The failure path, read rather than assumed

`extract-stage.ts`'s `recordOutcome` is the whole story, and it is better than
expected:

- **A failed extraction still inserts the article.** `title` falls back to the
  uploaded filename, `authors` to `[]`, every optional field to `null`, and
  `extraction_status` to `'failed'`.
- **The `upload_jobs` row deliberately stays**, at `status: 'failed'` with a
  human-readable `failure_reason`, because — in the code's own words — "its row
  has to stay, because it is the only thing telling the user this upload needs
  them."
- **`upload_jobs.id` *is* the article's id**, pre-allocated so the PDF is never
  copied or moved, and `article_id` is a real FK with `ON DELETE CASCADE`.

Three consequences follow, and they shape the tasks:

1. **Delete already clears the warning, for free.** Removing the article cascades
   the job row away. Nothing extra is needed for that half.
2. **Edit does not.** Nothing in an `articles` update touches `upload_jobs`, so a
   reader could fix every field by hand and still be left with a warning icon
   over a perfectly good article. Something has to retire the failed row, and
   that is the third task.
3. **A failed article is reachable and editable like any other** — it is a normal
   row with a filename for a title. The status popup's entry point is therefore
   a convenience and a signpost, not a separate mechanism.

## What happens to `extraction_status` when a human fixes it

**Nothing — decided here.** The column is documented in
`article-core-schema.md` as remembering the *outcome* of extraction precisely
because `upload_jobs` forgets the *process*: "The job table tracks the process;
this column remembers the outcome." After a hand correction the outcome is still
that extraction failed, and that is a true fact worth keeping for the "not
enriched" hint the schema doc anticipates. What is no longer true is that the
upload *needs the user* — and that is the job row's job to say. So the job row
retires and the column stands.

Rejected: adding a `'manual'` value to the enum. It would make every existing
reader of the column ask a question it does not need answered, to record
something the `updated_at` column and the absence of a job row already imply.

## Deleting the PDF is not something a mutator can do

Checked rather than assumed, because the obvious implementation is wrong:

- Mutators in `mutators.ts` run **twice** — optimistically in the browser against
  the local replica, and authoritatively at `/api/zero/mutate` inside a Postgres
  transaction. Anything a mutator does, the browser does too. A blob delete
  belongs to neither half of that.
- `pdf-storage.ts` has **no delete at all** today. Uploading and reading are
  built; removing is not.
- Deleting the row cascades `annotations`, `article_tags`, `citation_edges` and
  the `upload_jobs` row — but a Postgres cascade has no reach into Garage. The
  object would be orphaned, holding user data the app had told the user it
  deleted.

**Decided with the user on 2026-09-12: a pg-boss cleanup job.** The row delete
stays a mutator, so the card leaves the grid at once; the server half enqueues a
job that deletes the object. This matches how the extraction pipeline already
hands work forward (`services.queue.send` beside the transaction that made the
work necessary), including its honest limitation — pg-boss sends on its own
connection, so a crash in the window between commit and enqueue leaves an orphan
rather than losing a row. That window is named in the task's constraints so
whoever implements it decides about it on purpose.

Rejected: deleting through a server route instead (loses the optimistic removal
and routes one write around the decided mutator boundary), and leaving the object
in place (the app would knowingly keep bytes it said it deleted).

## Authors are a list, so the editor is a list

`authors` is `jsonb` holding `{ name, given?, family? }[]` — a deliberate
rejection of a normalized authors table, with the reasoning recorded in
`article-core-schema.md`. `name` is always populated; `given`/`family` come from
GROBID's structured TEI output when it has them.

**Decided with the user: one row per author, not a comma-separated field.** The
common repair is *removing* an author GROBID invented or *fixing* one it
mis-split, both of which are a single row's problem in a list and a
string-surgery problem in a text field. A comma-separated field also mangles
"Smith, Jr." and throws away the given/family structure on every save, since it
has nowhere to put it — a hand edit sets `name` and leaves `given`/`family` as it
found them.

## References: deferred to #10, on purpose

The decided interface includes reference editing. It is not in this feature, and
this is where that is recorded.

`citation_edges` exists and is populated by #7's enrichment. What does not exist
is anywhere that *shows* a reference: #9 built three of the detail page's four
sidebar tabs and
[left the Citations tab to #10](../index.md) deliberately, and
[citation-graph-schema.md](../../research/data-modeling/citation-graph-schema.md)
assigns the "is this reference already in my collection" matching — including the
manual-add path through this very interface — to that feature too.

So building the editor here would mean building a list UI for data with no
display surface, against matching logic that belongs to the next feature, and
reworking it when the surface arrives. **Decided with the user on 2026-09-12:
#11 does metadata and deletion; #10 brings reference editing to where references
are shown.**

## Sources

- Project decisions: `research/ui-ux/pages/lit-tracker/components/article-edit.md`,
  `.../upload-status.md`, `research/ui-ux/design-system.md` (editing/non-editing
  state, inline form errors), `research/data-modeling/article-core-schema.md`,
  `.../citation-graph-schema.md`,
  `research/security-privacy/pdf-and-annotation-data-protection.md`.
- Code read: `src/lit-tracker/extraction/extract-stage.ts`,
  `src/db/schema/lit-tracker.ts`, `src/zero/mutators.ts`, `src/zero/ownership.ts`,
  `src/routes/api/zero/mutate.ts`, `src/zero/mutate-endpoint.ts`,
  `src/lit-tracker/jobs/queue.ts`, `src/storage/pdf-storage.ts`,
  `src/routes/lit-tracker/-components/article-menu/article-menu.tsx`,
  `src/routes/lit-tracker/-components/upload-status/*`,
  `src/routes/-shared/components/user-settings/delete-account.tsx`.
