# Citation Graph Modeling + Traversal UI Patterns

Researched: 2026-07-02. Decided: 2026-07-02.

Needed for the lit-tracker's requirement to traverse an article's
bibliography/citing-articles within the user's collection (see
[lit-tracker/DESIGN.md](../../high-level-guidance/design/lit-tracker/DESIGN.md)).

## Decision

**Simple list/breadcrumb UI**, not a full graph-visualization canvas. The
citation graph is still modeled as data (a directed graph, with
"in collection / not in collection" as a per-node attribute — see
[../data-modeling/index.md](../data-modeling/index.md)), but it's surfaced
via list views with back/forward breadcrumb-style navigation rather than a
node-link graph-viz library like Connected Papers/Oignon.

Reasoning: the lit-tracker spec's three traversal modes (referenced articles
in collection, articles citing this one, referenced articles not in
collection) map directly onto simple, filtered list views — they don't need
a full similarity-graph layout. This avoids pulling in a heavyweight
graph-viz dependency up front. A graph view can be layered on top later as
an optional visualization if it turns out to be wanted.

## Reference tools/prior art

- **Connected Papers** — given a paper, shows ~50 related works arranged
  by similarity; hovering a node previews its abstract, clicking opens the
  PDF. A node-link, similarity-based exploration pattern.
- **Oignon** — free, open-source citation-graph visualization tool; uses a
  dual-path ranking system with recency weighting to surface both
  foundational and recent work.
- **SciSpace Citation Explorer** — interactive citation network with
  cluster summaries (topic bubbles) and "path reports" showing how two
  papers connect via citation chains.
- **citation-graph-builder** (FZJ-IEK3-VSA, GitHub) — open-source tool
  combining citation data parsed from PDFs with bibliographic-API queries
  to build citation networks; conceptually close to what lit-tracker needs
  (PDF parsing + API enrichment feeding a graph), see
  [pdf-metadata-extraction.md](./pdf-metadata-extraction.md).

## UI traversal research findings

A study of how researchers actually browse citation-network visualizations
identified two dominant perspectives: one focused on the **layout** (overall
graph shape/clusters) and one focused on **connections** (following specific
edges from paper to paper). This maps onto the two lit-tracker navigation
modes already specified: browsing what's referenced/citing (connection-
following) versus surfacing what's missing from the collection (more of a
set-comparison/gap view than a graph-layout view).

## Notes for later planning

- The lit-tracker spec's three traversal requirements (referenced articles
  in collection, articles citing this one, referenced articles *not* in
  collection) are simpler than a full similarity graph like Connected
  Papers — it's closer to a directed citation graph with "in collection /
  not in collection" as a per-node attribute, plus back/forward navigation.
  A full graph-visualization library may be more than needed; a simpler
  list/breadcrumb-style traversal UI (with an optional graph view later)
  may fit the spec better. Worth discussing directly rather than defaulting
  to a heavyweight graph-viz tool.
- Data modeling for the citation graph itself (nodes/edges, how "not yet in
  collection" placeholder entries are represented) belongs in
  [../data-modeling/index.md](../data-modeling/index.md).

## Sources

- [Connected Papers Review 2026](https://tooliverse.ai/tools/connected-papers)
- [Oignon: Citation Graph Tool](https://arxiv.org/pdf/2512.22159)
- [GitHub - FZJ-IEK3-VSA/citation-graph-builder](https://github.com/FZJ-IEK3-VSA/citation-graph-builder)
- [Fields, Bridges, and Foundations: How Researchers Browse Citation Network Visualizations](https://arxiv.org/html/2405.07267v1)
- [Citation Explorer: Follow Ideas Through the Literature](https://scispace.com/agents/citation-explorer-7mxusqq0)
