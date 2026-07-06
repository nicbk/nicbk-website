# CI Security-Scanning Tool

Researched: 2026-07-05. Decided: 2026-07-05.

The specific tool(s) for the CI security-scanning step already required (but
left undecided) by
[../devops-deployment/ci-pipeline.md](../devops-deployment/ci-pipeline.md),
which surfaced Semgrep OSS, Gitleaks, and Trivy in passing and flagged a
March 2026 supply-chain compromise of Trivy's own GitHub Action.

## Decision

- **Two tools, run as separate CI jobs: Gitleaks (secret scanning) and
  Semgrep OSS (SAST).** Neither alone covers both risks, and this project
  needs both: a public repo makes leaked-secret exposure a real risk, and
  a SAST pass catches application-code bug patterns neither tool shares
  with the other.
- **`npm audit` is added as a lightweight third step for dependency CVEs**,
  rather than adopting a fourth dedicated tool (e.g. OSV-Scanner) —
  ecosystem-native, zero extra tooling, sufficient for a single-ecosystem
  (Node/npm) project.
- **Trivy is not adopted.** Its main strength (container image/IaC
  scanning) is less central to this project's actual risk surface than
  secrets and application code, and it already has a flagged, real
  supply-chain incident (see `ci-pipeline.md`) — a defensible alternative
  exists (Gitleaks + Semgrep + `npm audit`) without taking on that
  specific tool's history. If broader dependency-CVE/container-scanning
  coverage becomes a real need later, Trivy pinned by commit SHA (not tag)
  remains a reasonable revisit, per the mitigation `ci-pipeline.md` already
  carries forward.
- **Any third-party GitHub Action used (Gitleaks', Semgrep's) is pinned by
  commit SHA, not a version tag** — the same requirement `ci-pipeline.md`
  already established regardless of which tool was chosen here.

## Reasoning

- Semgrep, Gitleaks, and Trivy address genuinely different risk
  categories (app-code SAST, leaked credentials, dependency/container
  vulnerabilities) — treating "a security-scanning step" as satisfied by
  any single one of them would leave real gaps, so this decision
  deliberately picks the two most relevant to this project's actual shape
  (a TypeScript/Node app on a public repo) rather than the most
  general-purpose single tool.
- Gitleaks and Semgrep OSS are both widely adopted, actively maintained,
  low-configuration open-source tools — directly serving this category's
  and `devops-deployment/`'s shared principles of preferring open-source
  tooling and minimizing manual upkeep for a project with no dedicated
  ops role.
- Excluding Trivy is a judgment call, not a clear-cut elimination: its
  container/IaC-scanning strength is real, just not this project's most
  pressing gap given the single-host, already-hardened deployment decided
  in
  [../devops-deployment/hosting-and-infrastructure.md](../devops-deployment/hosting-and-infrastructure.md)
  and [../devops-deployment/ci-pipeline.md](../devops-deployment/ci-pipeline.md)
  (Sysbox isolation, ephemeral runner, contributor-approval gate). Revisit
  if container-supply-chain risk becomes a bigger concern later.
- SHA-pinning any third-party Action is carried forward unchanged from
  `ci-pipeline.md`'s existing flag — the same lesson (a tag can be
  silently repointed to malicious code after the fact; a commit SHA
  cannot) applies to whichever scanning Actions are added here.

## Sources

- [GitHub Advanced Security Alternative: Semgrep + Gitleaks + Claude Code 2026](https://devsecops.ae/blog/github-advanced-security-alternative-claude-code-2026/) —
  the combined Semgrep+Gitleaks open-source pattern this decision follows.
- [Snyk Alternatives 2026](https://devsecops.ae/snyk-alternatives-continuous-devsecops-2026/) —
  broader open-source DevSecOps tooling landscape survey.
- [Best Secret Scanning Tools 2026](https://appsecsanta.com/secret-scanning-tools) —
  Gitleaks' position among current secret-scanning tools.
- [How to Run Security Scanning with GitHub Actions](https://oneuptime.com/blog/post/2026-01-25-security-scanning-github-actions/view) —
  practical CI wiring for these tools.
- [Auditing package dependencies | npm Docs](https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities/) —
  `npm audit` as the ecosystem-native dependency-vulnerability check.
- [OSV-Scanner GitHub Action](https://google.github.io/osv-scanner/github-action/) —
  the dedicated dependency-scanning alternative considered and not adopted
  in favor of `npm audit`.
