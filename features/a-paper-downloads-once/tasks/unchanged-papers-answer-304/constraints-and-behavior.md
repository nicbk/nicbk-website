# Constraints and Behavior: Unchanged Papers Answer 304

The feature's [constraints](../../constraints-and-behavior.md) apply in full.
Specific to the code:

- **The not-modified case is a value, not an exception**, by the time it leaves
  `pdf-storage.ts`. Recognise it by `$metadata.httpStatusCode === 304` on the
  thrown error and nothing looser; every other error still throws.
- **`fetchOwnedObject`'s ownership check still runs first** — the conditional
  header is an argument to the fetch it guards, not a way around it.
- **Header validation is a pure function** with its own tests: a bounded,
  comma-separated list of `"…"` / `W/"…"` / `*`. Weak prefixes are stripped.
  Anything else yields "no condition".
- **The 304 has no body and no `content-length`.**
- **Rewrite the `cache-control` comment** rather than appending to it. It now
  states the policy, that a 304 is only reachable after authorization, and why
  `immutable` was declined — with the user, 2026-09-14.
- **Update the existing header test, don't delete it.** It is named for "not
  cached publicly", which is still true.

## Acceptance criteria

The feature's criteria 1–6 at the unit and integration tiers, and criterion 7's
Chrome check on the local stack. The Safari check on `nicbk.com` runs after
deploy and completes the feature, not the task.
