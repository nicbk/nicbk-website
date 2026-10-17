# Testing: What the Research Found

## Unit

- `create-auth.test.ts`:
  - IP tracking is disabled;
  - `afterDelete` calls `onUserDeleted` with the user's id;
  - a throwing `onUserDeleted` does not make `afterDelete` throw.
- The purge stage:
  - deletes nothing while the user exists;
  - deletes every listed key when the user is gone;
  - refuses a key outside the prefix.
- The sweep queues only the prefixes whose user is gone.

## Integration

Against Testcontainers Postgres, Garage and real pg-boss:
- two users with PDFs; delete one through Better Auth;
- the purge runs, and that user's prefix is empty;
- the other user's objects remain;
- an orphan prefix left by a user deleted earlier is found by the sweep and
  purged.
