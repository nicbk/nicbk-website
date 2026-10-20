# Status: A Deleted Account Leaves Nothing

**State:** In review ([#264](https://github.com/nicbk/nicbk-website/issues/264)).

## What shipped

- **`createAuth`'s `onUserDeleted`**, called from Better Auth's `afterDelete`
  with the deleted user's id. A failure is logged, never thrown: the account is
  already gone. `auth.ts` supplies the Literature Tracker's purge, and a future
  app with files adds its own there.
- **`lit-tracker.purge-account`**:
  - an `exclusive` pg-boss queue, keyed by the user, with the PDF cleanup's
    retry policy;
  - `pdf/purge-stage.ts` refuses to run for a user who exists;
  - it then lists the user's folder and deletes each key through the
    ownership-checked `deleteArticlePdf`.
- **A sweep at worker start** (`queueLeftoverAccountPurges`): it lists the user
  folders in the bucket and queues a purge for each whose user is gone. That
  covers a hook whose send failed, accounts deleted before this fix, and an
  upload that finished after its account was deleted.
- **Storage additions:**
  - `object-key.ts`: `userPdfPrefix`, `PDF_ROOT_PREFIX`, `ownerOfPrefix`;
  - `pdf-storage.ts`: `listUserPdfKeys` and `listPdfOwners`, both paged.

## Verification (2026-10-17)

- **In the browser, on the local stack** (real Better Auth, pg-boss, Garage):
  - signed in, uploaded two PDFs, and saw both under
    `lit-tracker/<userId>/`;
  - deleted the account from the profile;
  - the folder was empty **1.9 s** later, and the bucket went from 2 objects
    to 0.
- **Integration (Testcontainers Postgres and Garage):**
  - a real `delete-user` calls `onUserDeleted` once with the deleted id, and a
    refused deletion calls nothing;
  - a purge empties the deleted account's folder (2 objects) and leaves the
    other user's object;
  - a purge for a living user deletes nothing;
  - a second run is done;
  - the sweep queues exactly the deleted account's folder.
- **Unit:** the purge's decisions, the sweep, the handler binding, the paged
  listings, the prefix helpers, the hook's call and its swallowed failure, and
  the worker registering the queue and the sweep.
- **Checks:** `biome ci` and the typecheck pass, as do 2,277 unit tests. Line
  coverage is 95.39%.

## Log

- 2026-10-17: implemented and verified.
- 2026-10-17: spec'd.
