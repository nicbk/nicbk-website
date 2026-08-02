# Feature: Article Upload and Extraction

The Lit Tracker's **ingest slice**, and the site's **second phase transition**:
[`authentication`](../authentication/description.md) (#6) turned a static site
into one with a database and server-side sessions; this feature turns it into a
**natively reactive application**. Everything else in Phase 3 — the collection
view (#8), the reader (#9), the citation graph (#10), article edit (#11) —
builds on what lands here.

The user-visible slice is one continuous flow. A signed-in user opens
`/lit-tracker`, clicks "+", picks one or more PDFs, and the modal closes
immediately. A status indicator next to the "+" button shows each upload
in progress — **live**, without a refresh — while a background pipeline sends
each PDF to GROBID, resolves the extracted bibliography against Semantic
Scholar, and writes the finished article. Rows disappear from the status list
as their jobs resolve; an upload GROBID cannot parse leaves a warning row
naming the reason.

Concretely, this feature produces:

- The **Zero sync engine bring-up**: a `zero-cache` service, `zero/schema.ts`
  generated from the Drizzle schema via `drizzle-zero`, and the app server's
  **`/query` and `/mutate` endpoints** — where every read is scoped to the
  requesting user's `user_id` from a server-derived context the client cannot
  forge. This is the reactivity foundation the whole site was designed around
  and has not had until now.
- The **Lit Tracker's first protected pages**: the `/lit-tracker` route group
  behind `requireAuth`, and the lit-tracker header (fixed app-shell layout,
  breadcrumb root segment, avatar). This is where the route guard and the
  user-settings modal built in #6 get their **first live consumers**.
- **Garage blob storage** and a **proxied upload path**: PDFs stream through
  the app server — authenticated, ownership-checked, never via a presigned URL
  — into `lit-tracker/{user_id}/{article_id}/source.pdf`.
- The **background extraction pipeline**: pg-boss chaining an extract stage
  (GROBID) to an enrich stage (Semantic Scholar) to a finalize stage, with the
  app-owned `upload_jobs` table as the reactive projection the status popup
  reads.
- The **`articles`, `upload_jobs`, and `citation_edges` tables** — the first
  user-owned, `ON DELETE CASCADE`-scoped, Zero-replicated data on the site.

## Scope boundary

This feature is **ingest, not browsing**. It builds the minimum surface needed
to start an upload and watch it finish: the route, the header, the upload
modal, the status indicator, and a plain list of the resulting articles.

The full **collection view** — card grid, user-defined tags, the reading-status
filter sidebar, live search, infinite scroll — is
[`collection-view`](../../features/index.md) (#8), which **upgrades the surface
this feature leaves behind** rather than starting from a blank page. Nothing
here is throwaway; #8 replaces the plain list with the card grid and adds the
sidebar around it.

Also not here: the PDF reader and annotations (#9), citation-graph *traversal
UI* (#10 — this feature writes the edges, it does not render them), and article
edit (#11).

## The failure path is deliberately incomplete

[`upload-status.md`](../../research/ui-ux/pages/lit-tracker/components/upload-status.md)
says a failed job is resolved by opening it in `article-edit` — which is #11,
and #11 depends on #7. So this feature ships the **warning row** (filename,
warning icon, failure reason) and the article row behind it, but the row stays
in the list until #11 provides the edit/delete that clears it.

That is the roadmap's own dependency direction, confirmed with the user rather
than worked around: inventing a throwaway delete button here would be replaced
by #11's real edit modal immediately, the same reasoning that kept #6 from
inventing a throwaway protected route.

## Why the Zero bring-up is isolated in its own task

`zero-cache` is a new always-on service with three Postgres connections of its
own, a SQLite replica, a logical-replication slot, and two HTTP callbacks into
the app server that carry every authorization decision for user data on this
site. It is the largest and most cross-cutting piece here by a wide margin, and
getting its user-scoping wrong is a data-leak class of bug rather than a
cosmetic one.

So it lands first, alone, proven by integration tests against a real Postgres —
the same "prove the backend before any page depends on it" shape that worked
for [`auth-backend-and-config`](../authentication/tasks/auth-backend-and-config/description.md).
The page that makes it visible in a browser follows immediately as task 2.
