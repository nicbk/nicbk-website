# Constraints and Behavior: What the Research Found

## Behavior

### F1: signing in

- **Better Auth no longer reads a client address.** Rate limits keyed on an
  address that is the same for every visitor are a single site-wide limit. A
  burst of real users, or one abuser, would refuse everyone.
- **Sessions no longer record the relay's address** as the user's IP. It was
  never the user's.
- **The setting carries its reason and the way back**: real client addresses at
  the relay or Caddy (H2), then `trustedProxies`, then rate limiting returns.

### F2: deleting an account

- **After Better Auth deletes the user, a purge of that user's Garage prefix is
  queued.** The hook never throws: the account is already gone, and an error
  response would tell the user the deletion failed.
- **The purge lists `lit-tracker/<userId>/` and deletes each object.**
  - It first confirms the user no longer exists, and does nothing if they do.
  - Every key is checked with `isOwnedBy`.
  - It is idempotent: a retry finds fewer objects, or none.
- **At worker start, a sweep lists the user prefixes in the bucket** and queues
  a purge for each one whose user row is gone. This covers a lost hook,
  accounts deleted before this fix, and an upload that finished after its
  account was deleted.

## Constraints

- **Built on the existing pieces:**
  - the S3 client in `pdf-storage.ts`;
  - the key rules in `object-key.ts`;
  - pg-boss queues created in `jobs/queue.ts` with a retry policy and a dead
    letter;
  - handlers registered in `jobs/worker.ts`;
  - start-time sweeps, as `queueOlderPaperContents` does.
- **Auth stays independent of the Literature Tracker.** `createAuth` takes an
  `onUserDeleted` callback, and `auth.ts`, the composition point, supplies the
  lit-tracker purge. Each future app adds its own purge there.

## Acceptance criteria

1. Better Auth's options set `advanced.ipAddress.disableIpTracking`, with the
   reason in a comment.
2. Deleting an account queues a purge. The purge removes every object under
   that user's prefix and nothing under any other user's.
3. A purge for a user who still exists deletes nothing.
4. At worker start, a prefix whose user is gone gets a purge, and one whose user
   exists does not.
5. A failure to queue the purge does not fail the deletion.
