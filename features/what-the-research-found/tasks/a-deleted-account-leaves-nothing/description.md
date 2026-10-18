# Task: A Deleted Account Leaves Nothing

Task 2 of 2 of [#31](../../description.md); F2. Sub-issue [#264](https://github.com/nicbk/nicbk-website/issues/264).

- `deleteUser.afterDelete` calls a new `onUserDeleted` option on
  `createAuth`. `auth.ts` supplies a callback that queues
  `lit-tracker.purge-account` for the user.
- `pdf-storage.ts` gains:
  - `listUserPdfKeys(userId)`;
  - `deleteUserPdf(key, userId)`, ownership-checked;
  - `listPdfOwners()`, the user prefixes present in the bucket.
- `pdf/purge-stage.ts`:
  - runs the job only if the user is gone;
  - registers the handler;
  - at worker start, queues a purge for every prefix whose user is gone.
