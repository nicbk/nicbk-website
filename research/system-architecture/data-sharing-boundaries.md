# Data Sharing Boundaries

Researched: 2026-07-04. Decided: 2026-07-04.

Which data is shared across sub-apps vs. scoped to a specific sub-app
(and, within that, scoped per-user) — given the project is **multi-tenant**:
any signed-in Google account gets its own private collection/data, isolated
from other users.

## Decision

- **Shared across all sub-apps: only identity.** Better Auth's core schema
  (`user`, `session`, `account`, `verification` tables — deployed
  regardless of which auth plugins are used) is the one thing every
  sub-app references. No shared "global profile" fields beyond this exist
  yet (e.g. cross-app display preferences) — none are implied by the
  project's design docs, so the default is not to add any until a concrete
  need appears.
- **Everything else is sub-app-scoped, then user-scoped.** Lit-tracker's
  data (articles, annotations, citation-graph, `upload_jobs` — see
  [background-jobs.md](./background-jobs.md)) belongs to lit-tracker only,
  and within lit-tracker, every user-owned table carries a `user_id`
  column referencing Better Auth's `user` table, so one user's collection
  is never visible to another. The same pattern (sub-app table +
  `user_id` FK) applies to any future sub-app.
- **Isolation is enforced in the app server's `/query`/`/mutate`
  handlers, not a separate permissions layer.** Zero (Rocicorp) has no
  first-class row-level-security/permissions system (an earlier RLS-style
  permissions model is documented as deprecated/superseded) — the current
  model is that Zero calls back into the app server's own `/query`/
  `/mutate` endpoints (see [service-topology.md](./service-topology.md)),
  and those handlers receive the authenticated session context (e.g.
  `ctx.id`) and are responsible for filtering/validating against it —
  e.g. a query handler for articles filters `.where('user_id', ctx.id)`,
  and a mutate handler checks the target row's `user_id` matches `ctx.id`
  before permitting an update/delete. This is the same authorization
  mechanism already established for job data, applied uniformly to all
  user-owned tables.

## Reasoning

- Re-reading the project's design docs turned up no cross-app data sharing
  need beyond identity — the blog is static MDX committed to source (not
  runtime user data), and the "shared infrastructure" constraint in
  [DESIGN.md](../../high-level-guidance/design/DESIGN.md) is about shared
  *infrastructure* (DB/sync engine/blob store), not shared *application
  data*. Inventing a shared-profile concept without a concrete need would
  be premature.
- Using Zero's documented `/query`/`/mutate`-handler-based authorization
  (rather than assuming an RLS-style permissions file still exists) avoids
  building against a deprecated model.

## Sources

- [zero.rocicorp.dev/docs/permissions](https://zero.rocicorp.dev/docs/permissions) —
  confirms Zero has no first-class RLS-style permission system; current
  model is authorization inside `/query`/`/mutate` handlers using the
  authenticated session context.
- [zero.rocicorp.dev/docs/deprecated/rls-permissions](https://zero.rocicorp.dev/docs/deprecated/rls-permissions) —
  confirms the older RLS-style permissions approach is deprecated/
  superseded, not the current model.
- [better-auth.com/docs/concepts/database](https://www.better-auth.com/docs/concepts/database) —
  confirms Better Auth's core schema: `user`, `session`, `account`,
  `verification` tables, deployed regardless of plugins.
