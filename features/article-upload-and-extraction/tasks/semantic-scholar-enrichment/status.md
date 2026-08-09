# Status: Semantic Scholar Enrichment

**State:** Implemented, awaiting review. Fifth of five; completes the feature.

- Branch: `article-upload-and-extraction/semantic-scholar-enrichment`.
- Sub-issue: [#71](https://github.com/nicbk/nicbk-website/issues/71)
  (parent [#66](https://github.com/nicbk/nicbk-website/issues/66)).
- PR: [#78](https://github.com/nicbk/nicbk-website/pull/78)

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
- **`enrichment/reference-list.ts`** — the piece that actually fills the graph:
  aligning GROBID's parsed bibliography with Semantic Scholar's own reference
  list for the same paper, so references that printed no identifier still
  resolve. See the measurements below.

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

### The graph only fills in because Semantic Scholar's own reference list is used

Originally this task resolved an edge only from an identifier the citing paper
printed. That is enough for biomedical bibliographies and almost useless for
machine-learning ones, which cite proceedings by name: 47 of BERT's 54
references carry no identifier of any kind. Worse, the decided matching rule
declines when only one side has an ID — so *BERT* citing *Attention Is All You
Need*, with both papers in the collection, did **not** graduate.

The user rejected that as insufficient, and rightly: ML proceedings are the
main use case. The fix is `GET /paper/{id}/references` — Semantic Scholar's own
resolved reference list for the uploaded paper, **one** extra request, every
entry carrying a `paperId`, matched onto GROBID's parsed entries locally by
title (`enrichment/reference-list.ts`).

The list is used two ways, and the second matters as much as the first:

1. **Identifiers for entries GROBID parsed** — matched on by title.
2. **Edges for references GROBID never produced at all.** Its list is simply
   bigger than the parse (63 entries vs 54 for BERT), because GROBID drops what
   it cannot segment. *Attention Is All You Need* cites *Layer Normalization*
   and GROBID emitted no title for it; that citation existed nowhere in the
   graph until these were added.

Where Semantic Scholar resolved a reference, **its record is what gets stored** —
a canonical title where GROBID kept a year prefix or a trailing venue, plus the
year and authors GROBID often lacks.

Measured on real papers, references resolved to a paper:

| citing paper | identifiers only | + reference list |
|---|---|---|
| *BERT* | 7/54 (13%) | **59/61 (97%)** |
| *Attention Is All You Need* | 15/39 (38%) | **39/40 (98%)** |
| *Convolutional Sequence to Sequence Learning* | 13/46 (28%) | **50/53 (94%)** |
| *Layer Normalization* | — | **32/32 (100%)** |

With all four in one collection the graph is genuinely connected: *BERT* →
*Attention*, *Attention* → *Layer Normalization* and → *ConvS2S*, *ConvS2S* →
*Layer Normalization*. **The graduation rule was not loosened** — the
identifiers simply exist before it runs, so the strict ID-first path does the
work.

The six remaining unresolved edges are the ceiling rather than a shortfall:
three are references Semantic Scholar's own list could not resolve either, and
three are things no citation graph can link — a dataset ("English gigaword.
Linguistic Data Consortium") and two references GROBID merged with their
neighbours.

Title matching is used for the alignment and *not* for graduation because the
candidate sets differ in kind: graduation compares against a whole collection,
alignment against the ~50 papers this exact paper cited. That closed set is
what pays for a normalization tolerant enough to absorb GROBID keeping a year
prefix ("2018a. Deep contextualized word representations"), a trailing archive
name ("… in Linear Time. arXiv") or an author fragment. All four containment
matches in the sample were inspected by hand and were correct.

What remains is GROBID mis-parsing — a reference merged with its neighbour, a
title truncated past recognition — which #11's article-edit is the escape hatch
for.

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

## A trade that had to be reversed

The reference-list fetch was first written to swallow its own failure: the
article was already enriched, so giving that up over one supplementary request
looked like the worse deal. It stopped being so the moment the list became the
*main* source of edges. Observed directly, with four uploads running at once: a
single 429 left BERT's graph 13% full instead of 97%, permanently, because
nothing would ever revisit it.

It now propagates, so pg-boss retries the stage. That is cheap and safe — the
article update is idempotent, edge ids are assigned by id, and the added edges
insert `on conflict do nothing` — and it stays inside the decided rule, because
exhausted retries still finalize the upload as `grobid_only`.

The general shape, worth carrying: **how a failure should be handled depends on
how much the call is carrying.** A best-effort swallow is right for a garnish
and wrong for the main course, and the same line of code was both within one
afternoon.

## A gap this tier caught

The e2e Semantic Scholar stub first returned the reference list as a bare
array; the real endpoint wraps it in `{ "data": [ { "citedPaper": … } ] }`. The
client parsed nothing, every edge stayed unresolved, and **every unit and
integration test still passed** — because they stub the client's own return
type rather than its wire format. Only the signed-in e2e tier, which speaks
HTTP to a separate stub, could see it. Worth remembering the next time that
tier looks like duplicated coverage.

Separately: `e2e/` and `e2e-auth/` are **not** in `tsconfig.json`'s `include`,
so `tsc --noEmit` never typechecks the Playwright specs. A missing import in a
spec surfaced only at runtime during this task. Pre-existing, not fixed here.

## Deferred: closing the rest of the citation graph

Raised with the user, measured, and postponed by agreement — the graph is to
become a source of truth the reader can trust, and these are what that needs
beyond what this task ships. Recorded here rather than in an issue because #10
is where they will be built and this is what #10 should be planned against.

Measured on four real papers, the residue after this task is **not** missing
edges. Every true citation edge those papers make is present. What is wrong is:

- **Two spurious rows.** GROBID merged two references into one garbled row, and
  both halves also arrived cleanly from Semantic Scholar's list — so the graph
  holds three rows where the paper printed two. Fixable by dropping an
  unresolved row whose title contains an S2-sourced row's title from the same
  article.
- **Four rows with nothing to point at.** An LDC dataset, a technical report, a
  challenge paper, and one Semantic Scholar's own list did not resolve. These
  are real references and correctly stored; they simply are not links, and no
  amount of better PDF reading creates a node that does not exist.

The ideas worth taking into #10, in the order they are worth doing:

1. **Dedupe mis-segmented rows** against the S2-sourced ones, as above.
2. **Store the printed reference text.** `includeRawCitations=1` already gives
   the parser `raw`, and `writeBibliography` currently discards it. It is the
   evidence behind every row — what makes a row verifiable by eye, and what
   lets an unlinkable reference display as the paper printed it rather than as
   GROBID's guess. One additive column.
3. **Record what was expected.** Semantic Scholar reports `referenceCount`, and
   the row count is known. Storing both makes a shortfall visible instead of
   silent; today nothing distinguishes "this paper cites nothing else you own"
   from "its bibliography was not read", and that ambiguity costs more trust
   than the last few percent of resolution does.
4. **`/paper/search/match` for the leftovers.** Ruled out during this task at
   ~24 requests per upload; the reference list absorbed enough that it is now
   ~4, and it targets exactly the residue.
5. **#11's article-edit as the closing mechanism.** Some references will always
   need a human, and a graph that shows its gaps beats one that claims
   completeness.

**Not verified:** whether a reference exists in a printed PDF that *neither*
GROBID nor Semantic Scholar caught. That needs hand-counting one paper's
reference list against its rows, and should be done before completeness is
called solved.

A vision-model reader was evaluated and set aside for this. It addresses
segmentation, and segmentation is the half already covered — the merges it
would fix are the ones Semantic Scholar's list already supplies, and the
unlinkable references stay unlinkable. See
[citation-graph-schema.md](../../../../research/data-modeling/citation-graph-schema.md)'s
2026-08-09 revision.

## Log

- 2026-08-01 — Task defined during the feature spec. Fifth of five. Populating
  `citation_edges` here rather than deferring to #10 was a user decision at
  spec time.
- 2026-08-09 — Reference-list alignment added after the user judged
  identifier-only resolution insufficient for machine-learning proceedings,
  which are the collection's main case. Coverage across three real ML papers
  went from 13/38/28% to 96/97/93%, and *BERT* now graduates against
  *Attention Is All You Need*. The enrich retry policy was trimmed to two
  retries in the same change, since the extra request lengthened the window a
  row spends reading "in progress".
- 2026-08-09 — Researched the API against the live service (batch limits, the
  404 on an unmatched title, the missing rate-limit headers, the arXiv version
  suffix), agreed the four open design questions with the user, and
  implemented. Verified against real GROBID and the real, unauthenticated
  Semantic Scholar on five papers, including both graduation directions and a
  deliberately unreachable API.
