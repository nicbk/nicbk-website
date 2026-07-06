# Generic Error Fallback Page

Status: Decided 2026-07-02.

A top-level "something went wrong" page (e.g. a React error boundary),
distinct from the per-component loading/error/empty states under
[../../../design-system.md](../../../design-system.md)'s "Reactive UI feedback
patterns" topic.

- **Content**: plain-text "something went wrong" message plus a "back home"
  link, same tone/pattern as [not-found.md](./not-found.md).
- **Technical error detail**: the page supports optionally showing
  technical error details (e.g. the underlying error message/stack), for
  cases where that's useful to surface — expected to be used rarely in
  practice, but the capability should exist rather than being hardcoded to
  the generic message only.
- Uses the [site header](../components/header.md).
