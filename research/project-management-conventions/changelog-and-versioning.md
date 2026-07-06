# Changelog and Versioning

Researched: 2026-07-04. Decided: 2026-07-04.

Whether/how a user-facing changelog is kept, and whether formal versioning
applies to a continuously-deployed personal site — building directly on
the Conventional Commits format decided in
[commit-message-conventions.md](./commit-message-conventions.md).

## Decision

**Changelog: yes — auto-generated from Conventional Commits via
`git-cliff`.** A `CHANGELOG.md` at the repo root, regenerated (or appended
to) from git history, grouped by commit type (Features, Bug Fixes,
Documentation, Performance, etc.) using `git-cliff`'s default
Conventional-Commits grouping. Exactly when/how regeneration runs (a CI
step, a manual command, a release-time hook) is a mechanism owed to
[../devops-deployment/index.md](../devops-deployment/index.md), not yet
researched — this doc decides that a changelog exists and how its content
is derived, not the pipeline step that runs it.

**Versioning: no formal semantic version number for the site as a whole.**
This project has no downstream consumer depending on a published version
for compatibility guarantees — no npm package, no external API contract to
signal breaking/additive/patch impact against. It's a personal,
continuously-deployed website (per
[../../high-level-guidance/design/DESIGN.md](../../high-level-guidance/design/DESIGN.md):
a personal blog plus personal sub-apps, not a distributed library). The
changelog's own chronological, per-merge entries already serve as the
"what changed and when" record without a version number attached to it.

This isn't a blanket ban on versioning anything, ever: if a sub-app later
exposes something genuinely consumed externally (e.g. a public API), that
specific surface can adopt semver independently at that point. This
decision applies to the site as a whole, as it stands today.

## Reasoning

- `git-cliff` was chosen over `semantic-release`/`release-please` because
  those tools are fundamentally built around cutting versioned releases —
  exactly the piece this decision concludes isn't needed — while
  `git-cliff` generates/updates a changelog purely from commit history with
  no version-tagging step required, matching a "changelog yes, versioning
  no" outcome precisely rather than requiring a tool built around a
  release cycle this project doesn't have.
- Rejecting semver follows directly from sourced material on what semver
  is *for*: communicating compatibility impact to something integrating
  against the code as a dependency. A personal website consumed only by
  browser visitors — not by other software — has no audience for that
  signal, and the sourced acknowledgment that solo/personal projects often
  find full semver overhead unjustified matches this project's situation
  specifically (per `DESIGN.md`'s own framing, not just general precedent).
- Leaving room for a future public-API sub-app to adopt semver
  independently avoids a blanket rule that would need to be reversed the
  moment such a surface actually appeared, rather than scoped narrowly to
  what's true today.

## Sources

- [git-cliff.org](https://git-cliff.org/), [github.com/orhun/git-cliff](https://github.com/orhun/git-cliff) —
  changelog generation purely from Conventional Commits, no version-tagging
  step required, configurable grouping by commit type.
- [workos.com — from 1.0.0 to 2025.4: making sense of software versioning](https://workos.com/blog/software-versioning-guide) —
  what semantic versioning communicates and to whom.
- [blog.ploeh.dk — semantic versioning with continuous deployment](https://blog.ploeh.dk/2013/12/10/semantic-versioning-with-continuous-deployment/) —
  how versioning intent changes (or doesn't apply) under continuous
  deployment.
- [dev.to — how to use semantic versioning for your apps](https://dev.to/julianburr/how-to-use-semantic-versioning-for-your-apps-2dak) —
  direct acknowledgment that full semver overhead is often unjustified for
  a small, single-maintainer project.
