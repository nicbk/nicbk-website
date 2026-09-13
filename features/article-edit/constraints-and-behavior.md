# Constraints and Behavior: Article Edit

Acceptance criteria for **#11**. What must be true when it is done, what must not
have changed, and the constraints the implementation works under.

## Satisfied here

- **An article's details can be corrected by hand**, from the three-dot menu that
  already carries reading status and tags — on the collection card and on the
  detail page, the same menu in both places.
- **Title, authors, publication year, venue and DOI are editable.** Title and
  authors are required and the form refuses to save without them; year, venue and
  DOI may be left blank, and blanking one stores an absent value rather than an
  empty string.
- **Authors edit as a list**, one row per author, with add and remove. Removing
  the author the extractor invented is one control, not string surgery.
- **A correction lands everywhere at once** — card, detail page, search — because
  it is one row written through Zero, not a copy.
- **An article can be deleted**, behind a typed exact-text confirmation, and
  takes its annotations, its tag links, its citation edges, its upload-job row
  and **its PDF object** with it.
- **A failed upload has an exit.** Its row in the status popup opens this modal
  on the fields that are missing, and resolving the article — by editing or by
  deleting — clears the warning from the header.
- **The editing/non-editing rule holds**: while the modal is open the fields hold
  what the reader is typing, not what arrives from sync; a successful save
  returns to reflecting live data.

## Must not regress

- **What extraction wrote, except where the reader changed it.** An edit touches
  the named columns and nothing else — not `status`, not `notes`, not
  `extraction_status`, not `pdf_object_key`.
- **The three-dot menu's existing contents.** Reading status and tags keep
  working exactly as they do, in the same popover, with the same keyboard
  behaviour; #11 adds to it rather than rebuilding it.
- **Ownership.** Every new mutator checks the row belongs to the session's user
  through `ownership.ts`, like every other write on this site. A valid session
  for user A still says nothing about an id in the arguments.
- **The upload-status popup's decided lifecycle**: it lists jobs still needing
  attention and never a history of resolved ones.
- **`requireOwnedArticle` and the existing `articles` mutators** (`setStatus`,
  `setNotes`), which are #8's and #9's and stay as they are.

## Constraints particular to this feature

- **A deleted article's PDF is deleted too.** Not optional and not deferred: the
  app tells the reader the article is gone, and
  [pdf-and-annotation-data-protection.md](../../research/security-privacy/pdf-and-annotation-data-protection.md)
  is why leaving the bytes in Garage would be a promise broken rather than a
  tidiness problem. The cleanup runs **server-side** — a mutator's client copy
  must never reach storage — and the window in which a crash can orphan an object
  is named in the task rather than hidden.
- **Required means required on the server.** Title and authors are validated in
  the mutator's schema, not only in the form. The form's job is to say so early
  and kindly; the mutator's job is to make it true.
- **Errors inside the form stay inside the form.** Per
  [design-system.md](../../research/ui-ux/design-system.md), a validation or save
  failure is shown inline next to what caused it — the toast is for writes with
  no form to attach to, which is what `useArticleMutations` already does for the
  menu's other controls.
- **Deletion is not a click.** The exact-text-match confirmation from
  delete-account is reused rather than re-derived, including its inert-but-
  reachable confirm button. An article is lower stakes than an account and still
  high enough to deserve the friction the decided doc asks for.
- **No reference editing.** Deferred to #10 with the Citations tab and the
  matching logic that belongs to it — see [research.md](./research.md). This
  feature must leave `citation_edges` alone entirely, including on delete, where
  the cascade already does the right thing.
- **`extraction_status` is not rewritten by a hand edit.** It records what
  extraction achieved, which a human correction does not change. What changes is
  the job row, which is what says the upload still needs the user.

## Cross-cutting

- **WCAG 2.2 AA.** The modal is named by its heading, traps focus while open and
  returns it to the trigger; the authors list's add and remove controls are
  reachable and named individually; every field has a real label; validation
  messages are associated with their field and announced; the confirm control is
  `aria-disabled` rather than `disabled` so it stays findable. Touch targets meet
  the 44px floor the reader's controls already hold themselves to.
- **Responsive.** The modal holds at narrow widths with a realistic author list —
  a paper with twelve authors is the case to design for, not a paper with two.
- No new route. New mutators and one new storage operation; no schema change.
- CI green: Biome, typecheck, unit + integration with ratchet coverage, PR-title
  lint.
