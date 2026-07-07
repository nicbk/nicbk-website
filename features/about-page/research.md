# Research Traceability: About Page

Every decision this feature implements traces to an already-decided
`research/*.md` doc or a `high-level-guidance/design/*.md` artifact. No
decision is improvised here; the one narrow, feature-local choice (the
generator's tooling) is recorded below rather than left implicit — per
[../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md).

## High-level design

- [../../high-level-guidance/design/DESIGN.md](../../high-level-guidance/design/DESIGN.md)
  — minimalist monospace personal site with a simple about page (line 40);
  match the mockups; open-source-only components.
- [../../high-level-guidance/design/about-page.png](../../high-level-guidance/design/about-page.png)
  — the exact about-page content and layout this feature reproduces.

## Page content

- [../../research/ui-ux/pages/site-wide/pages/about.md](../../research/ui-ux/pages/site-wide/pages/about.md)
  — the about page's final content/layout: heading, Résumé/CV (user-provided
  PDF) + LinkedIn, Communication section (Mail/Academic Mail, sign/encrypt
  note, Fingerprint + Public Key), Version Control section (GitHub/GitLab);
  uses the site header; entirely static.
- [../../research/ui-ux/pages/site-wide/components/header.md](../../research/ui-ux/pages/site-wide/components/header.md)
  — the shared sticky header this page renders inside (already built by
  `app-shell-and-home`; reused, not rebuilt).
- [../../research/ui-ux/design-system.md](../../research/ui-ux/design-system.md)
  — CSS Modules from global tokens, JetBrains Mono, light/dark theming, the
  simplicity philosophy the page's styling follows.

## GPG key publishing

- [../../research/security-privacy/gpg-key-publishing.md](../../research/security-privacy/gpg-key-publishing.md)
  — the core decisions this feature implements: self-hosted WKD at
  `/.well-known/openpgpkey/` as primary distribution; a static `.asc` linked
  from the page for humans; not delegating WKD and not using
  keys.openpgp.org as primary (preserves third-party signatures); and the
  displayed fingerprint **derived from the source key at build/update time,
  not hand-typed**, with rotation = regenerate from the new key.
- [../../research/security-privacy/app-security-headers.md](../../research/security-privacy/app-security-headers.md)
  — the app's CSP/security-header middleware the served static assets
  (`.asc`, PDF, WKD files) coexist with; `default-src 'self'` keeps these
  same-origin assets served without exceptions.

## Layout, conventions, and code style

- [../../research/coding-conventions/file-hierarchy-and-complexity.md](../../research/coding-conventions/file-hierarchy-and-complexity.md)
  — top-level layout; where a build/generation script and the committed
  generated constant live.
- [../../research/coding-conventions/styling-conventions.md](../../research/coding-conventions/styling-conventions.md)
  — 1:1 component-to-`.module.css`, token-driven styling, dividers/spacing
  from tokens.
- [../../research/coding-conventions/naming-and-casing.md](../../research/coding-conventions/naming-and-casing.md),
  [../../research/coding-conventions/component-and-export-conventions.md](../../research/coding-conventions/component-and-export-conventions.md),
  [../../research/coding-conventions/typescript-conventions.md](../../research/coding-conventions/typescript-conventions.md),
  [../../research/coding-conventions/import-conventions.md](../../research/coding-conventions/import-conventions.md)
  — kebab-case files, named exports, function-declaration components,
  `strict` TS, import grouping — matching the home-page precedent.

## System architecture / hosting

- [../../research/system-architecture/monorepo-structure.md](../../research/system-architecture/monorepo-structure.md)
  — single TanStack Start package; `/about` is a route in the
  `(personal-site)` group.
- [../../research/devops-deployment/hosting-and-infrastructure.md](../../research/devops-deployment/hosting-and-infrastructure.md)
  — Caddy terminates TLS and proxies the app; the app serves `public/` static
  assets (including `/.well-known/openpgpkey/`) through that proxy.
- [../../research/devops-deployment/containerization-and-build.md](../../research/devops-deployment/containerization-and-build.md)
  — the production image runs `.output/server/index.mjs`; because artifacts
  are committed, the image needs no `gpg` and runs no generator.
- [../../research/devops-deployment/ci-pipeline.md](../../research/devops-deployment/ci-pipeline.md)
  — CI is where the GPG-artifact drift-check step runs (GitHub-hosted runners
  have `gpg` available).

## Accessibility

- [../../research/accessibility/conformance-target.md](../../research/accessibility/conformance-target.md)
  — WCAG 2.2 AA, site-wide.
- [../../research/accessibility/color-contrast-and-focus-visibility.md](../../research/accessibility/color-contrast-and-focus-visibility.md),
  [../../research/accessibility/keyboard-and-focus-management.md](../../research/accessibility/keyboard-and-focus-management.md),
  [../../research/accessibility/semantic-markup-and-aria-conventions.md](../../research/accessibility/semantic-markup-and-aria-conventions.md)
  — link contrast/focus visibility, focus handoff to the page heading,
  semantic markup and accessible names for the several links on this page.

## Testing

- [../../research/testing-qa/test-runner-and-frameworks.md](../../research/testing-qa/test-runner-and-frameworks.md)
  — Vitest + Testing Library; pure-function testing for the generator/format
  helpers.
- [../../research/testing-qa/e2e-testing.md](../../research/testing-qa/e2e-testing.md)
  — Playwright, assert on DOM/served-asset state; the flagged Start+Playwright
  timing caveat.
- [../../research/testing-qa/test-coverage-and-ci-gating.md](../../research/testing-qa/test-coverage-and-ci-gating.md)
  — ratchet coverage; the drift check is an additional CI gate.
- [../../research/testing-qa/accessibility-testing.md](../../research/testing-qa/accessibility-testing.md),
  [../../research/accessibility/testing-and-tooling.md](../../research/accessibility/testing-and-tooling.md)
  — `@axe-core/playwright` inline on `/about` in both themes.

## Project-management process

- [../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md)
  — the feature/task folder structure and per-task PR gating.
- [../../research/project-management-conventions/commit-message-conventions.md](../../research/project-management-conventions/commit-message-conventions.md)
  — Conventional Commits on PR titles.

## Notes / narrower research (feature-local, not global)

- **Generator tooling — `gpg` CLI, not a JS OpenPGP library.** The
  `gpg-key-publishing.md` decision fixes *what* is produced (WKD files, the
  `.asc`, a derived fingerprint) but not the tool that produces them. The
  generator uses the `gpg` CLI because it is present in the dev environment
  and on the GitHub-hosted CI runners (where the drift check runs), and
  because artifacts are committed the production/Docker build never invokes
  it — so no `gpg` binary or `openpgp.js` dependency is added to the shipped
  image. This is narrow enough to record here rather than as a global
  `research/` decision; if the generator ever needs to run inside the build
  image, this choice is revisited.
- **WKD hash is fixed by the key's email.** For `nicolas@nicbk.com` the
  direct-method path is
  `/.well-known/openpgpkey/hu/egg3eb1dsgmi4atdj5obrtipjpcjyocr`
  (z-base-32 SHA-1 of the lowercased local part `nicolas`), confirmed with
  `gpg-wks-client --print-wkd-hash`. It changes only if the key's email
  local part changes.
- **The published key is expired** (see [description.md](./description.md)) —
  a known, user-accepted state, not a spec gap; the pipeline is built so a
  renewed key is a drop-in replacement.
