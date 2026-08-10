# Status: PDF Serving

**State:** Not started. Second of five.

- Branch: `article-detail-and-reader/pdf-serving`, from `main` after task 1
  merges.
- Sub-issue: filed with the feature's parent issue at spec review.
- PR: opened once the unit and integration tiers and the browser pass are all
  clean.

## Open items to settle before writing

- **The route's URL shape.** It sits under `/api/lit-tracker/`, beside the
  `upload.ts` #7 built, but whether the article id is a path segment or a search
  param — and whether the path ends in something that makes a browser treat it
  as a file — is worth deciding once rather than twice.
- **Which not-found response.** The app has a not-found treatment for pages;
  this is a byte stream, so it needs its own answer. Whatever it is, the "not
  yours" and "not there" cases must be indistinguishable, which is the actual
  requirement.
- **Streaming through the framework.** `getArticlePdf` returns whatever the S3
  client hands back; confirm how a TanStack Start server route returns a stream
  before assuming it can, and fall back to a buffered response only with the
  reason written down.

## Log

- (not started)
