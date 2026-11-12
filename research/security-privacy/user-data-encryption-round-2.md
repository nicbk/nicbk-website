# User Data Encryption: Round 2

Researched: 2026-11-12. Follow-up research on top of
[user-data-encryption.md](./user-data-encryption.md), after the user chose
option (d), zero-access encryption, on 2026-11-12 (E1, E2 and E3 decided; the
user's words are in
[answers-2026-11-12.md](../requests/2026-10-14/answers-2026-11-12.md)). It
answers the user's follow-up question E4 and records what the user's new E7
feature needs. The other round-2 follow-up, E6 (2FA, passkeys and the recovery
code), is in its own file:
[user-data-encryption-2fa-and-recovery.md](./user-data-encryption-2fa-and-recovery.md).
Questions left for the user are R2-3 and R2-4 in
[decisions.md](../requests/2026-10-14/decisions.md#round-2-questions-for-the-user-2026-11-12).

Source caveats: E4 was checked against this repository at HEAD and against the
Zero 1.8 docs (read from the docs' GitHub source at
`raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/*.mdx` and
from zero.rocicorp.dev) and Replicache's rebase docs. `node_modules` is not
installed in this checkout (`package.json` pins `@rocicorp/zero` 1.8.0), so
nothing comes from reading Zero's source. Claims marked *uncertain* could not
be confirmed against a primary source.

## Round 2 (2026-11-12): what stays plaintext under Zero (E4)

The user asked: *"Given zero-access encryption, how much can we encrypt while
still allowing the Zero reactive database to work for the users?"*

**Short answer: all user-written and extracted content.** Zero needs plaintext
only for what zero-cache uses to decide *which rows sync* and *in what order*.
Every query in `src/zero/queries.ts` filters and orders on ids, `user_id`,
foreign keys, `created_at`, `page_index` and status columns, with one exception:
`tags` orders by `name` (`queries.ts:101`). Live updates, the offline cache,
optimistic writes, multi-device sync and per-user filtering all keep working.
The cost falls elsewhere: cross-paper citation linking moves to the browser,
the two backfill jobs need the user's consent (E7), and content validation
moves to the client.

### The plaintext/encrypted split

"Sealed" means ciphertext in a `text` column, one column per *write unit*
(braces group fields sealed together). The synced columns are the allowlist in
`drizzle-zero.config.ts:21-119`; `user`, `session`, `account` and
`verification` are not synced (`:115-118`).

| Table | Plaintext (kept) | Sealed | Dropped / added |
|---|---|---|---|
| `articles` | `id`, `user_id`, `created_at`, `updated_at`, `extraction_status`, `pdf_object_key`, `reference_count`, `references_read_at` | `details` {title, authors, publication_year, venue, doi, semantic_scholar_id}; `abstract`; `notes`; `status`; `position` {reading_page, reading_offset} | Drop `authors_search` and its trigram index; add plaintext `pipeline_version` / `finished_at` |
| `tags` | `id`, `user_id`, `created_at` | `name` | — |
| `article_tags` | all (ids and a timestamp) | — | — |
| `annotations` | `id`, `user_id`, `article_id`, `page_index`, timestamps | {type, contents, payload} | — |
| `citation_edges` | ids, `user_id`, `citing_article_id`, `cited_article_id`, timestamps | {title, authors, publication_year, semantic_scholar_id, raw_text, entry_regions} | Drop the unique `(citing_article_id, semantic_scholar_id)` (`lit-tracker.ts:488-491`) and the partial index (`:497-499`); add `match_s2`, `match_title` (client-keyed HMACs) |
| `upload_jobs` | `id`, `user_id`, `status`, `failure_reason` (as a code), `article_id`, `pdf_object_key`, timestamps | `filename` | — |
| `reference_reads` | all (`article_id`, `user_id`, `status`, timestamps) | — | — |
| `article_contents` | `article_id`, `user_id`, `source`, `expanded`, timestamps | `entries` | Add plaintext `entry_count` |

Why the plaintext columns stay plaintext:

- **Ids, `user_id`, foreign keys:** every ZQL filter, ownership check,
  `related` and cascade. The cost is that the shape of the user's own graph is
  visible: which of their papers cite which, which share a tag.
- **Timestamps:** `orderBy createdAt` (`queries.ts:39,151,243`), quota and
  dormancy timing.
- **`extraction_status`, `upload_jobs.status`, `reference_reads.status`:**
  server predicates (`mutators.ts:285, 574`; `server-effects.ts:167`;
  `reread-stage.ts`; `read-stage.ts:52`).
- **`pdf_object_key`** is `userId/articleId`, with no content.
- **`annotations.page_index`** (recommended, or seal): a server `orderBy`
  (`queries.ts:150`). Sealing it moves the sort per paper to the client, which
  is cheap at hundreds of marks; plaintext leaks only which pages carry marks.
- **`article_contents.expanded`** (recommended, or seal): see "Mutators that
  compute from the old value" below. Whether these two stay plaintext is
  question R2-3.

Two sealing decisions that are easy to get wrong:

- **`semantic_scholar_id` must be sealed with the title.** It is a public
  identifier, so a plaintext copy names the paper exactly and makes sealing the
  title pointless for the roughly 96% of papers that are enriched.
- **Reading status** is not used on the server; the filter is client-side, and
  null already reads as pending (`filter-articles.ts:38`), so the database
  default `'pending'` becomes null.

**What the operator can still see per user:** counts and timestamps of papers,
tags, annotations and references; PDF sizes (Garage); pages carrying marks; the
citation and tag graph among the user's own papers; how many entries each
contents list has; and **ciphertext lengths**, which reveal roughly how long a
title or note is. Pad each sealed value, for example to the next 32 or 64 bytes
or with Padmé (Padmé is *uncertain* as a choice and was not researched). This
matches RB15: an admin sees names, emails and paper counts and nothing more.

### How ciphertext travels through Zero

- **Column type: base64 text.** Zero maps `text`/`varchar`/`uuid` to `string`
  and `json`/`jsonb` to `json`; `bytea` is not listed, and unlisted types "will
  be ignored when replicating (the synced data will be missing that column)"
  ([postgres-support](https://zero.rocicorp.dev/docs/postgres-support),
  [schema](https://zero.rocicorp.dev/docs/schema)). A value looks like
  `v1.<keyId>.<base64url(nonce‖ct‖tag)>`, about +33% for base64.
- **Size limits.** No documented per-row or per-value limit was found.
  WebSocket messages are capped at 10 MB by default
  (`ZERO_WEBSOCKET_MAX_PAYLOAD_BYTES`), which bounds a mutation's arguments, and
  an OOM replicating "databases with large rows" was fixed in 0.26
  ([0.26 release notes](https://zero.rocicorp.dev/docs/release-notes/0.26)).
  The recommended total dataset is under 100 GB
  ([when-to-use](https://zero.rocicorp.dev/docs/when-to-use)). The largest
  sealed values (a textbook's contents, big ink annotations) are tens of KB;
  PDFs stay in Garage.
- **Only ciphertext is stored.** zero-cache's SQLite replica, the CVR store and
  the browser's IndexedDB
  ([queries.mdx "Cached Results"](https://zero.rocicorp.dev/docs/queries)) hold
  ciphertext; plaintext exists only in memory after unlock.

**Rule: encrypt before calling the mutator, never inside it.** A mutation is "a
record of the mutator having run with certain arguments"; Zero sends the
arguments to the server, which re-runs the mutator
([mutators](https://zero.rocicorp.dev/docs/mutators)), and the client replays
pending mutations on rebase
([Replicache](https://doc.replicache.dev/concepts/how-it-works)). So:

- The ciphertext must be *in the arguments*. The server cannot encrypt without
  receiving plaintext, which would defeat zero-access.
- Encrypting inside the mutator with a random nonce would produce different
  bytes on the client run, the server run and every rebase. With ciphertext
  arguments the optimistic row and the server row are byte-identical, so a
  rebase is a no-op.
- The caller seeds the in-memory decrypt cache with (ciphertext → plaintext)
  before calling, so the optimistic row renders with no decrypt step and no
  flicker.
- The server half of each mutator keeps its ownership checks and writes the
  opaque strings. Content validation becomes a ciphertext-length cap plus a
  format check; the rules in `mutators.ts:593-700` move to a shared client
  validator. They protect only the owner's own data, so this opens no
  cross-account hole. QM7's row limits still work on counts and bytes.

**One encrypted column per write unit, not one blob per row.** Zero's `update`
writes only the named columns (relied on at `mutators.ts:381-385`). Separate
sealed `details`, `abstract`, `notes`, `status` and `position` columns keep
today's independence: a notes save cannot clobber a status change made on
another device. One blob per row would turn every mutator into a client
read-modify-write with cross-field last-write-wins.

### Mutators that compute from the old value

- **`articleContents.setExpanded`** (`mutators.ts:320-347`) reads `entries` for
  its bound check and calls `foldsAfter` (`contents-tree.ts:125-138`).
  **Recommended: keep `expanded` plaintext and add a plaintext `entry_count`.**
  The server keeps the bound check (`index < entry_count`) and the set
  add/delete. For the null first-visit case the client passes its computed
  `firstVisitOpen` as an extra argument, used only when the stored value is
  null; trusting it is harmless because it is the user's own UI state. The
  two-device merge (`:302-305`) survives. If `expanded` were sealed, it would
  become a whole-set write: two devices folding different chapters could no
  longer both keep their change, and the later write would win.
- **`articles.updateDetails`** (`:464-486`): the client decrypts the current
  `details` blob, applies the form, keeps `semanticScholarId`, and writes it
  back. Same last-write-wins as today, because the write set is the same.
- **Annotation change detection** (`annotation-sync.ts:118-119`) **must
  fingerprint decrypted content, not ciphertext.** Re-encrypting the same
  payload gives new bytes, so comparing ciphertext would recreate the
  rubber-banding loop documented at `:95-117`. Do not re-write when the
  plaintext is equal.
- `setNotes`, `setReadingPosition`, `setStatus`, `tags.create` and
  `annotations.create/update` are already whole-value writes; tag
  attach/detach, deletes, `referenceReads.retry` and `retireResolvedUpload`
  touch only ids and statuses. All unchanged apart from carrying ciphertext.

### Citation linking moves to a client "finishing" step

Today both directions of cross-paper linking ("graduation" in the code) are
server SQL over the user's other stored rows (`citations/edges.ts:443-455`,
`:363-420`, `:459-478`). The usual workaround, a blind index under a
**server-held** key, fails here: Semantic Scholar ids are a public, enumerable
set, so whoever holds the key can hash every id and invert the index
([CipherSweet](https://ciphersweet.paragonie.com/security)).

What stays on the server is everything about the new paper on its own: GROBID,
the Semantic Scholar lookup, title verification (`enrich-stage.ts:255-276`),
reference-list alignment, merged-row cleanup and in-paper dedupe, all on the
in-memory upload that E3 allows. What moves to the browser runs on the next
unlocked device after an upload or re-read lands:

1. **New paper's references → papers already in the collection.** The
   collection is synced and decrypted, so the client runs the existing pure
   `isSameWork` (`citations/matching.ts`) over the new paper's edges and writes
   `citedArticleId` through a new owner-checked mutator such as
   `citationEdges.link({edgeId, articleId})`.
2. **Existing placeholder references → the new paper.** Syncing every
   unresolved edge (about 3,000 × 40 ≈ 120k rows) is too heavy. Instead each
   edge carries plaintext `match_s2` = HMAC(K_idx, "s2:"+id) and `match_title`
   = HMAC(K_idx, "ta:"+normalizedTitle+"|"+firstAuthorKey). **K_idx is derived
   from the user's key material in the browser and never leaves it.** The
   client writes these tags during the finishing step, and links a new paper
   by querying `citationEdges` on its tags with `citedArticleId IS NULL`: a
   server-side predicate on an opaque value, so only matching rows sync. Two
   scalar columns, not an array, because ZQL has no array-element operators
   ([postgres-support](https://zero.rocicorp.dev/docs/postgres-support)). The
   leak is equality only (which of the user's papers cite the same unknown
   work); frequency analysis could guess very famous references.
3. A plaintext `articles.finished_at` (or `pipeline_version`) marks papers
   still to be finished, so any device can see what is pending.

Consequence for the user: **a new paper's links to and from the rest of the
collection appear when a device is next unlocked and online**, not while every
device is closed (question R2-4). The client work is milliseconds per upload on
a 3,000-paper library. A simpler fallback, if the blind index is judged too
complex: direction 1 only, plus one sealed "unresolved match keys" row per paper
for direction 2, about 10–15 MB decrypted once per session.

### One in-memory extract + enrich job

- **Collapse extract, enrich (and finalize) into one in-memory run per
  upload.** Today enrich re-reads the stored plaintext article
  (`enrich-stage.ts:289-305`) and edges (`:220`), and the pg-boss `EnrichJob`
  payload carries DOIs and arXiv ids in plaintext (`jobs/queue.ts:144-151`),
  which sits in the pg-boss job and archive tables and their backups. No
  retention setting was found in `queue.ts`.
- Seal everything to the user's public key at the final write, or keep stage
  state under a per-job key deleted at job end (the pattern round 1 raised for
  the PDF).
- The Semantic Scholar wait is the long pole; the upload-status UI already
  handles a slow `processing` state.
- The fallback title must come from the in-memory filename
  (`extract-stage.ts:245`), because `upload_jobs.filename` is sealed at the
  request (`store-upload.ts:73`).
- Replace the backfill's content-sniffing predicate
  (`reread-stage.ts:93-95`: `e.raw_text is not null and e.entry_regions is
  null`) with a plaintext `pipeline_version`.

### A leak outside the database: search text and tags in the URL

The collection's search state is `?q=<text>&tags=<tag names>`
(`search-schema.ts:13-17`). On a full page load it reaches the server and the
proxy logs, outside every sealed column. **Fix:** move it to the URL fragment,
or use tag ids and keep `q` out of the query string.

### Decryption on the client, and performance (estimates)

- One hook per table between `useQuery` and components returns decrypted rows
  from a `Map` keyed by `(table, id, ciphertext)`, so only changed rows are
  decrypted again. Optionally, an IndexedDB cache encrypted under the device's
  non-extractable key gives a fast cold start.
- Already client-side and unchanged: text search, tag and status filters
  (`filter-articles.ts:19-74`), citation ordering by year
  (`citation-lists.ts:178-189`), tag autocomplete (`tag-matching.ts`),
  reference preview matching (`previewed-reference.ts:67`). Moving to the
  client: tag alphabetical order, and annotation page order if `page_index` is
  sealed. Newly possible at no server cost: sorting the collection by title,
  year or author.
- **Bounding asymmetric work.** Server-written values must be sealed to the
  public key, one X25519 per sealed box. Instead the server wraps **one data key
  per upload** to the public key, so all rows of that paper share it: one
  X25519 per paper (cacheable), symmetric decryption for the rest. Values the
  client writes use a per-user symmetric key wrapped to the public key (two `v1`
  formats, told apart by key id).
- WebCrypto X25519 ships in Chrome 133+, Firefox 130+ and Safari (2025)
  ([Igalia](https://blogs.igalia.com/jfernandez/?p=1913),
  [caniuse](https://caniuse.com/mdn-api_subtlecrypto_derivebits_x25519));
  sources disagree on Safari's version.

| Workload (3,000-paper collection) | Estimate | Status |
|---|---|---|
| Collection ciphertext | 3,000 `details` + 3,000 small sealed fields, roughly 1–3 MB, plus tens to hundreds of tags; per article page, 50–200 edges and 0–500 annotations | Estimate |
| Thousands of sub-KB AES-GCM decrypts in a Worker | Tens to low hundreds of ms | *Uncertain: measure* |
| Cold start: about 3,000 X25519 + 6,000 AES-GCM | A few hundred ms in a Worker | *Likely, but uncertain*: measure on a low-end phone |
| Client search over decrypted rows | The same linear pass as today | — |

### What is lost or degraded

- **Cross-collection citation linking while all devices are closed:** delayed
  to the next unlocked session, not lost.
- **Automatic backfills over stored papers** (reference re-read, contents
  outline): only with the user's per-job consent (E7, below).
- **Server-enforced content rules** (non-empty title, tag ≤ 64 characters, year
  range): client-side plus a size cap; a modified client can store odd values,
  but only in its own account.
- **Server-side author/title search:** unused today (`authors_search` is not
  synced), so nothing visible is lost.
- **Two-device merge of contents folds:** lost only if `expanded` is sealed.
- **Operator debugging and abuse review of stored content:** already accepted
  in round 1.

### Code areas that must change

1. `src/db/schema/lit-tracker.ts`, a migration, `drizzle-zero.config.ts`, the
   `zero_data` publication and `schema.gen.ts`.
2. `src/zero/queries.ts:101`: drop `orderBy('name')`; add the graduation queries
   on `match_*` and the "unfinished papers" query.
3. `src/zero/mutators.ts`: ciphertext arguments with length caps; validation in
   a shared client module; `setExpanded` with `entry_count` and the first-visit
   default; new `citationEdges.link` and `setMatchTags`; `ownership.ts`
   unchanged.
4. Client hooks (`use-article-mutations.ts`, `use-annotation-mutations.ts`,
   `use-synced-text.ts`, every `useQuery` site): encrypt before calling, decrypt
   through the cached layer, sort tags client-side; `annotation-sync.ts`
   fingerprints plaintext.
5. `src/lit-tracker/extraction/*`: one in-memory pipeline with no plaintext in
   pg-boss payloads. `citations/edges.ts`: delete cross-collection graduation
   (`unresolvedArticlesOf`, `graduateEdgesCiting`,
   `articlesBySemanticScholarId`), keep the in-paper logic; the client finishing
   step reuses `matching.ts`.
6. `reread-stage.ts`, `contents/read-stage.ts`: run only on an E7 approval.
7. `pdf-endpoint.ts`: unchanged apart from serving ciphertext (the ETag still
   works); the reader decrypts (age stream) before EmbedPDF.
8. `search-schema.ts`: `q` and `tags` out of the query string.
9. `upload-endpoint.ts` / `store-upload.ts`: seal `filename` at the request.

## E7: re-processing with consent

**Decided by the user (2026-11-12):** if the server wants to run an extraction
job over old papers, the user is notified about the job and approves or denies
a temporary decryption for that job, through the notification UI that already
exists for article uploads. This replaces round 1's proposed rule that the
server would never re-process stored papers.

**Which jobs become consent jobs.** Both existing backfills: the reference
re-read (`reread-stage.ts`) and the contents outline (`contents/read-stage.ts`).
Under zero-access neither can read a stored paper on its own, so each runs only
on an approval. Any future extraction over stored papers joins them.

What it needs technically, drawing on E4:

1. **Selection without content.** The server must know which papers a job
   applies to without reading them: the plaintext `pipeline_version` replaces
   today's content-sniffing predicate (`reread-stage.ts:93-95`), alongside the
   already-plaintext `extraction_status` and the absence of an
   `article_contents` row (`read-stage.ts:43-60`).
2. **A request in the existing upload-status list.** The pending job appears
   where upload jobs already do (`job-list.tsx`), with Approve and Deny. Its
   status is plaintext, like `upload_jobs.status`. One request per job, saying
   how many papers it covers, is the streamlined reading of the user's answer;
   whether it is a new kind of upload-job row or its own table is for planning.
3. **Approval on an unlocked device hands over one key per paper.** The client
   unwraps that paper's data key (one data key per upload, from E4) and hands it
   to the job for a single use. The job decrypts the PDF in memory, runs the
   stage, writes sealed results and discards the key. While it runs, the server
   sees that paper's plaintext: the same exposure the user accepted at upload
   (E3), limited to the papers approved. How the handed-over keys are held until
   the job runs should reuse round 1's per-job key deleted at job end.
4. **Then the client finishing step runs** for the re-read papers, so their
   citation links are repaired as for a new upload.
5. **Deny, or no answer:** nothing is decrypted, and the papers keep their old
   results.

## Sources

Zero and Replicache
- [Zero queries](https://zero.rocicorp.dev/docs/queries) — server-side ZQL; client copy; cached results in IndexedDB.
- [Zero postgres-support](https://zero.rocicorp.dev/docs/postgres-support), [schema](https://zero.rocicorp.dev/docs/schema) — column types; unlisted types not replicated; no array-element operators.
- [Zero mutators](https://zero.rocicorp.dev/docs/mutators) — a mutation is a record of arguments; the server re-runs it.
- [Zero 0.26 release notes](https://zero.rocicorp.dev/docs/release-notes/0.26) — 10 MB WebSocket default; large-row OOM fix.
- [Zero when-to-use](https://zero.rocicorp.dev/docs/when-to-use) — under 100 GB dataset.
- [Replicache: how it works](https://doc.replicache.dev/concepts/how-it-works) — pending mutations replayed on rebase.
- [CipherSweet security](https://ciphersweet.paragonie.com/security) — blind-index leakage.
- [Igalia](https://blogs.igalia.com/jfernandez/?p=1913), [caniuse X25519](https://caniuse.com/mdn-api_subtlecrypto_derivebits_x25519) — WebCrypto X25519 support.

Repository
- `drizzle-zero.config.ts`, `src/db/schema/lit-tracker.ts`, `src/zero/queries.ts`, `src/zero/mutators.ts`, `src/zero/ownership.ts`, `src/lit-tracker/**` (extraction, citations, enrichment, contents, upload, search), `package.json`.
