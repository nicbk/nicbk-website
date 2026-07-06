# PDF Metadata / Bibliography Extraction

Researched: 2026-07-02. Decided: 2026-07-02.

Needed for the lit-tracker's "upload a PDF, auto-extract name/abstract/
authors/bibliography" feature (see
[lit-tracker/DESIGN.md](../../high-level-guidance/design/lit-tracker/DESIGN.md)).

## Decision

**GROBID** for PDF extraction, **Semantic Scholar only** (no Crossref) for
enrichment/canonical resolution of bibliography entries.

Reasoning: many of the papers expected in this collection are CS papers
that are arXiv preprints, sometimes not yet published elsewhere. Crossref
has a confirmed gap here — **arXiv registers its DOIs with DataCite, not
Crossref**, and isn't a Crossref member, so Crossref's coverage of arXiv
papers is a known dead zone. Semantic Scholar, in contrast, indexes arXiv
(along with bioRxiv/medRxiv) natively alongside journals/conferences, and
arXiv submissions are typically indexed within days. It also has built-in
citation/reference-graph traversal, which overlaps directly with the
citation-graph feature (see [citation-graph.md](./citation-graph.md)).

Caveat: Semantic Scholar's exact indexing lag for brand-new submissions
wasn't confirmed (only that arXiv itself indexes within days) — but since
GROBID extracts title/authors/abstract/bibliography directly from the PDF
regardless of any external index, that already covers the freshest papers
without depending on enrichment. No separate arXiv API fallback was added
for now; revisit if same-day preprints turn out to be a real gap in
practice.

## GROBID

- GROBID (GeneRation Of BIbliographic Data) is a machine-learning library
  that extracts, parses, and re-structures raw PDFs into structured
  XML/TEI, focused on technical/scientific publications.
- Extracts: title, authors, abstract, body paragraphs, figure/table
  captions, equations, inline citations, and parsed bibliography entries
  (title, authors, year, venue) — this maps directly onto the lit-tracker
  requirements.
- Performance: ~120 pages/sec on commodity hardware; designed for
  large-scale processing (~10.6 PDF/sec sustained). Far more throughput
  than a personal literature tracker would ever need, so resource usage
  should be a non-issue.
- License: Apache 2.0. Open source since 2011, originally by Patrice
  Lopez, currently maintained by Luca Foppiano (INRIA/MESRE support).
  Recent releases (e.g. `grobid-client-python`, Jan 2026) indicate active
  maintenance.
- Deployment: run your own GROBID server rather than relying on rate-limited
  public demo servers.

## Supplementing extraction with bibliographic APIs

For matching a paper's parsed bibliography entries against canonical
records (DOIs, richer metadata, and for cross-referencing what's already
in the user's collection — see [citation-graph.md](./citation-graph.md)):

- **Crossref API** — DOI-centric metadata database for scholarly articles;
  good for canonical identification once you have title/author/year from
  GROBID.
- **Semantic Scholar API** — academic knowledge graph covering papers,
  authors, citations, and references; supports full-text-aware search and
  citation/reference graph traversal directly, which is close to what the
  lit-tracker's citation graph feature needs natively.

A typical combined pipeline: GROBID extracts structured data from the
uploaded PDF → Crossref/Semantic Scholar resolve/enrich each bibliography
entry to a canonical, identifiable record → those canonical records are
what get matched against the user's existing collection.

## Sources

- [Introduction - GROBID Documentation](https://grobid.readthedocs.io/en/latest/Introduction/)
- [How GROBID works - GROBID Documentation](https://grobid.readthedocs.io/en/latest/Principles/)
- [grobid/LICENSE at master · kermitt2/grobid](https://github.com/kermitt2/grobid/blob/master/LICENSE)
- [grobid-client-python · PyPI](https://pypi.org/project/grobid-client-python/)
- [Semantic Scholar Academic Graph API](https://www.semanticscholar.org/product/api)
- [Research Paper APIs for Scientific Literature in 2026](https://intuitionlabs.ai/articles/research-paper-apis-scientific-literature)
- [Leaving the house - where preprints go - Crossref](https://www.crossref.org/blog/leaving-the-house-where-preprints-go/)
- [Introduction to posted content (includes preprints) - Crossref](https://www.crossref.org/documentation/research-nexus/posted-content-includes-preprints/)
- [Semantic Scholar | Frequently Asked Questions](https://www.semanticscholar.org/faq)
- [Status Information - arXiv info](https://info.arxiv.org/help/submit_status.html)
