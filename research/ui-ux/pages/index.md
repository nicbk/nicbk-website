# Page & Component Specs

Status: all decided (2026-07-04) — see
[site-wide/index.md](./site-wide/index.md) and
[lit-tracker/index.md](./lit-tracker/index.md) for per-page status.

Concrete, page-by-page and component-by-component layout/interaction specs,
worked out directly with the user using the mockups as reference (not web
research — see [../index.md](../index.md) and
[../design-system.md](../design-system.md) for the cross-cutting
framework-level topics instead).

Split into two folders, mirroring the fact that the personal site and each
sub-application (starting with the lit tracker) are distinct concerns with
their own pages and even their own header (see "Header split" below):

- [site-wide/index.md](./site-wide/index.md) — personal site pages, plus
  auth/account surfaces shared by any sub-application that needs them.
- [lit-tracker/index.md](./lit-tracker/index.md) — Literature Tracker
  sub-application pages.

## Mockups on file

- [home-page.png](../../../high-level-guidance/design/home-page.png),
  [about-page.png](../../../high-level-guidance/design/about-page.png),
  [blog-page.png](../../../high-level-guidance/design/blog-page.png) —
  original site mockups (see
  [DESIGN.md](../../../high-level-guidance/design/DESIGN.md)).
- [../sample-mockups/literature-tracker-sample.png](../sample-mockups/literature-tracker-sample.png),
  [../sample-mockups/popup.png](../sample-mockups/popup.png) — rough
  lit-tracker mockups. **Not literal spec** — some contents are placeholders
  from an earlier idea (e.g. the per-user "S3 Bucket URL" field does not
  reflect the actual shared-infrastructure blob storage decision in
  [../../technologies/blob-storage.md](../../technologies/blob-storage.md)).
  They establish look/feel (dark theme, monospace, rounded cards, sidebar
  filters, breadcrumb-style path indicator, profile modal pattern) rather
  than exact functional content.

## Decisions

- **Access-denied handling**: no separate interstitial page. A signed-out
  user hitting a protected (lit-tracker) URL is redirected straight to the
  sign-in entry point ([site-wide/pages/sign-in.md](./site-wide/pages/sign-in.md)).
- **Generic error fallback**: yes, a top-level "something went wrong" page
  (e.g. a React error boundary) will be spec'd
  ([site-wide/pages/error-fallback.md](./site-wide/pages/error-fallback.md)), distinct
  from the per-component loading/error/empty states under
  [../design-system.md](../design-system.md)'s "Reactive UI feedback
  patterns" topic.
- **Header split**: there is no single shared "header" component. The
  personal site has its own site-wide header
  ([site-wide/components/header.md](./site-wide/components/header.md)), and each sub-application
  (starting with the lit tracker) has its own, separate header
  ([lit-tracker/components/header.md](./lit-tracker/components/header.md)).
