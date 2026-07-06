# PDF Reader with Persisted Annotations

Researched: 2026-07-02. Decided: 2026-07-02.

Needed for the lit-tracker's built-in reader with persisted markup (see
[lit-tracker/DESIGN.md](../../high-level-guidance/design/lit-tracker/DESIGN.md)).

## Decision

**EmbedPDF**, chosen over the react-pdf-highlighter family after hands-on
testing showed react-pdf-highlighter-extended's prebuilt UI felt janky.

- MIT licensed, framework-agnostic (React/Vue/Svelte/vanilla JS).
- Built on a custom WebAssembly engine powered by **PDFium** (Chrome's PDF
  engine) rather than PDF.js — headless architecture, full UI control
  (you compose your own annotation UI on top of it rather than inheriting
  a prebuilt one, which directly avoids the jankiness observed).
  Alternatively, EmbedPDF also has a drop-in fully-styled component if a
  custom UI isn't wanted, but the headless path is the better fit here.
  Also handles client-side browser API quirks (e.g. Canvas) cleanly for SSR
  frameworks, relevant since the frontend framework is TanStack Start (see
  [frontend-framework.md](./frontend-framework.md)).
- Modular plugin system: 16+ plugins, including an annotation plugin
  supporting highlight, sticky notes, free text, and ink (freehand drawing)
  annotation types — broader than the react-pdf-highlighter family's
  text/rectangle-highlight-only scope.
- More actively maintained than the alternatives evaluated: 4.3k GitHub
  stars, 1,865 commits, 42 releases, most recent release 2026-06-08.

**Resolved 2026-07-04**: EmbedPDF's annotation plugin models annotations (highlight,
underline, strikeout, squiggly, ink, square, circle, line, polyline, polygon,
free text, sticky note/text, stamp — 13 types total) as plain JS/TS objects
(`id`, `type`, `pageIndex`, `contents`, `author`, `created`/`modified`, plus
type-specific fields like `color`/`segmentRects`/`inkList`), independent of
the PDF binary. `rect` is page-scoped (page-space/PDF points, confirming the
viewport-independence needed to persist and reload correctly at any zoom
level). The `AnnotationScope` API (`createAnnotation`/`updateAnnotation`/
`deleteAnnotation`/`getAllAnnotations`, plus `onAnnotationEvent`/
`onStateChange` subscriptions and a symmetric `exportAnnotations`/
`importAnnotations` pair) is exactly the shape needed to feed annotations
through our own reactive sync engine and store them in our own database,
keyed by `id`/`pageIndex` — no need to re-export/rewrite the whole PDF file
per edit, and no architectural mismatch with live reactive sync. See
[Annotation Models](https://www.embedpdf.com/docs/engines/annotations/annotation-models)
and [Annotation Plugin (React headless)](https://www.embedpdf.com/docs/react/headless/plugins/plugin-annotation).

## react-pdf-highlighter family (considered, not chosen)

All three below are confirmed **MIT licensed** — license was not a
differentiator between them. All built on PDF.js rather than PDFium.

- **react-pdf-highlighter** (agentcooper) — the original; React components
  for PDF annotation. Highlight data format is viewport-independent, so
  it's suitable for saving to a server and re-rendering correctly at any
  zoom level.
- **react-pdf-highlighter-extended** — actively maintained fork with a more
  customizable annotation experience; supports both text highlights and
  rectangular/area highlights; same viewport-independent storage format.
- **react-pdf-highlighter-plus** — feature-rich, headless viewer/annotation
  library: highlights, notes, drawn shapes, embedded images, and export of
  annotated PDFs with annotations burned in permanently.

## Notes for later planning

- Persisted annotation coordinates (viewport-independent) tie into
  [../data-modeling/index.md](../data-modeling/index.md) for the annotation
  schema, and into the reactive sync engine for live-updating annotations
  across sessions/devices, see [sync-engine.md](./sync-engine.md). The
  per-annotation object shape (`id`/`type`/`pageIndex`/`contents`/etc., see
  "Resolved" note above) is the natural basis for that schema.
- UI-level decisions (which annotation types to expose, toolbar layout,
  annotations list) are spec'd in
  [../ui-ux/pages/lit-tracker/components/reader-annotation.md](../ui-ux/pages/lit-tracker/components/reader-annotation.md).

## Sources

- [EmbedPDF — React PDF Viewer](https://www.embedpdf.com/react-pdf-viewer)
- [EmbedPDF](https://www.embedpdf.com/)
- [GitHub - embedpdf/embed-pdf-viewer](https://github.com/embedpdf/embed-pdf-viewer)
- [embed-pdf-viewer/LICENSE](https://github.com/embedpdf/embed-pdf-viewer/blob/main/LICENSE)
- [React PDF Highlighter Plus - Open Source PDF Annotation Tool](https://react-pdf-highlighter-plus-demo.vercel.app/)
- [GitHub - agentcooper/react-pdf-highlighter](https://github.com/agentcooper/react-pdf-highlighter)
- [GitHub - DanielArnould/react-pdf-highlighter-extended](https://github.com/DanielArnould/react-pdf-highlighter-extended)
- [react-pdf-highlighter - npm](https://www.npmjs.com/package/react-pdf-highlighter)
