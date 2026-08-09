# Status: Semantic Scholar Enrichment

**State:** Implemented, awaiting review. Fifth of five; completes the feature.

- Branch: `article-upload-and-extraction/semantic-scholar-enrichment`.
- Sub-issue: [#71](https://github.com/nicbk/nicbk-website/issues/71)
  (parent [#66](https://github.com/nicbk/nicbk-website/issues/66)).
- PR: — (open on push)

## What was built

- **`citation_edges`** in Drizzle and migration `0002`, to the letter of
  [citation-graph-schema.md](../../../../research/data-modeling/citation-graph-schema.md):
  denormalized `title`/`authors`/`publication_year`, nullable
  `cited_article_id` `on delete set null`, `user_id`/`citing_article_id`
  `on delete cascade`, the `unique (citing_article_id, semantic_scholar_id)`
  constraint and all three indexes including the partial one. Added to the
  `zero_data` publication and `drizzle-zero.config.ts` in the same migration,
  as 0001 requires.
- **`src/lit-tracker/citations/`** — the graph itself: `matching.ts` (the
  graduation rule, pure) and `edges.ts` (writing a bibliography, and running
  the match in both directions).
- **`src/lit-tracker/enrichment/`** — the Semantic Scholar integration:
  `client.ts`, `throttle.ts` (the rate limiter), `metadata.ts` (which source
  wins per field), `failure.ts`.
- **`extraction/enrich-stage.ts`**, chained between extract and finalize, with
  its own retry policy and a dead-letter queue that finalizes anyway.
- **`SEMANTIC_SCHOLAR_URL`** (required) and **`SEMANTIC_SCHOLAR_API_KEY`**
  (optional), plus an in-process Semantic Scholar stub for the signed-in e2e
  tier.

## What the real services actually did

Verified in the browser against the **real, unauthenticated** Semantic Scholar
API and a real GROBID, on five real papers.

| | before (task 4) | after |
|---|---|---|
| *Attention Is All You Need* | `grobid_only`, no venue, **year 2023** | `enriched`, "Neural Information Processing Systems", **2017** |
| PLOS ONE paper | `grobid_only`, no venue | `enriched`, "PLoS ONE", 2017 |

The 2023 was GROBID reading the arXiv revision stamp. Both titles kept
GROBID's reading rather than the API's ("Attention Is All You Need", not
Semantic Scholar's "Attention is All you Need") — which is exactly the split
`metadata.ts` implements.

## Findings worth carrying

### Reading only DOIs would have made this feature useless for half a library

The identifier reader was extended to arXiv and PubMed ids because the merged
task-4 parser read only `<idno type="DOI">`. Measured on GROBID's real output:

| citing paper | edges | resolved to a paper |
|---|---|---|
| *Attention Is All You Need* | 39 | 15 |
| *BERT* | 54 | 7 |
| *Convolutional Sequence to Sequence Learning* | 46 | 13 |
| PLOS ONE paper | 41 | **39** |

DOI-only would have resolved **0** of the first paper's 39 references, and
missed that paper's own identifier too — its header carries an arXiv id and no
DOI. The PLOS paper's 39 is 32 DOIs plus 7 more reachable only by PubMed id.

### The arXiv version suffix decides whether a preprint enriches at all

Semantic Scholar returns **null** for `ARXIV:1706.03762v7` and resolves
`ARXIV:1706.03762`. GROBID emits the identifier exactly as printed —
`arXiv:1706.03762v7[cs.CL]` — so normalizing it is load-bearing, not tidying.
Verified against the live API.

### A GROBID-only edge can never match an enriched article

The decided rule is ID-first with a title fallback **only when neither side
has an ID**. Real consequence, found in the browser: *BERT* cites *Attention Is
All You Need*, both are in the collection, and the edge does **not** graduate —
BERT's reference list names it as a NeurIPS paper with no arXiv id, so the edge
has no ID while the article has one, and the fallback correctly declines.

This is the rule working as specified, not a defect, and the false-positive
risk it avoids is real. But it means the graph fills in best where
bibliographies print identifiers (biomedical) and worst where they do not (ML
proceedings). The cheap improvement is recorded under "Deferred" below.

### Semantic Scholar throttles by load, not by quota

Twelve concurrent requests against the live API returned **eight 429s and four
200s**; a minute later four rapid sequential requests all succeeded. There is
**no `Retry-After` and no `X-RateLimit-*` header** on a 429 — verified. So
every delay in `throttle.ts` is one this code chose, and the limiter adapts its
spacing rather than asserting a rate.

### Two nested backoff loops multiply

The first implementation had the in-process limiter *and* the pg-boss retry
policy both backing off generously, and a single failed enrichment took over
three minutes — long enough that the e2e test for it timed out and, more to the
point, long enough to leave a row reading "in progress" in the user's popup for
no benefit. Each now has one job: the limiter handles bursts (seconds), the
queue handles outages (about seventy seconds, then `grobid_only`). The
signed-in e2e suite went from 9.1 minutes to 4.0.

## Deviations from the task's own specs, and why

- **`citation_edges` is written by the extract stage, not the enrich stage.**
  Raised with the user and approved before implementation. The references are
  already in hand when the article is written, and a busy third party must not
  be able to cost a user a paper's whole bibliography. Enrichment then only
  attaches IDs and resolves. Confirmed in the browser: with Semantic Scholar
  unreachable, the upload still produced an article *and its 31 edges*.
- **Enrichment may overwrite `venue` and `publication_year`** — not only fill
  them — when the match came from an identifier. Approved with the user. A DOI
  or arXiv id names one paper and cannot be a coincidence; a title match is a
  guess and overwrites nothing. Without this the *Attention* paper keeps 2023.
- **The e2e Semantic Scholar stub is a process, not a container**, following
  the precedent task 4 set for GROBID and recorded in
  [mocking-external-services.md](../../../../research/testing-qa/mocking-external-services.md).
- **Unit HTTP stubbing is `vi.stubGlobal('fetch', …)`, not MSW.** MSW is the
  decided tool and is still not installed; task 4 stubbed `fetch` directly and
  this task followed it rather than running two mocking mechanisms in adjacent
  files. Recorded as a dated revision in that same document — it is a standing
  divergence, not a one-off.
- **"Enriched metadata visible in the browser" was not achievable.** The
  collection list renders a title and its authors; venue, year and the graph
  are #8 and #10. The e2e specs prove the live round-trip in the browser and
  assert the enrichment in the database, with the reason written where the
  helper is defined.

## Deferred

- **`GET /paper/{id}/references`** would give Semantic Scholar's own resolved
  reference list for the uploaded paper in **one** extra request, and could
  supply IDs to the identifier-less entries by matching titles locally — the
  case above where *BERT* fails to reach *Attention*. Raised during research
  and left out of this task by agreement. Worth reconsidering when #10 makes
  the gaps visible.

## Log

- 2026-08-01 — Task defined during the feature spec. Fifth of five. Populating
  `citation_edges` here rather than deferring to #10 was a user decision at
  spec time.
- 2026-08-09 — Researched the API against the live service (batch limits, the
  404 on an unmatched title, the missing rate-limit headers, the arXiv version
  suffix), agreed the four open design questions with the user, and
  implemented. Verified against real GROBID and the real, unauthenticated
  Semantic Scholar on five papers, including both graduation directions and a
  deliberately unreachable API.
