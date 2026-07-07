# CI Pipeline

Researched: 2026-07-04. Decided: 2026-07-04.

What runs on every PR — build/lint/typecheck/test execution, PR-title
Conventional Commits linting — implementing the CI/CD gate already required
by [../project-management-conventions/review-process.md](../project-management-conventions/review-process.md)
(gate 2 of 3: a red run blocks the PR outright, no human review on a
failing PR) and the PR-title format already decided in
[../project-management-conventions/commit-message-conventions.md](../project-management-conventions/commit-message-conventions.md).
Builds directly on the unified `docker-compose.yml` decided in
[hosting-and-infrastructure.md](./hosting-and-infrastructure.md) — the CI
runner itself becomes one more service in that same file. Guiding
principles from [index.md](./index.md) apply here as everywhere in this
category: prefer open-source tooling, minimize manual configuration.

Boundary notes: the specific test-runner/tooling choice invoked by the
"run the test suite" step belongs to
[../testing-qa/index.md](../testing-qa/index.md) (not yet researched) —
this doc only decides that a test step exists and blocks the PR. The
specific security/static-scanning tool belongs to
[../security-privacy/index.md](../security-privacy/index.md) (not yet
researched) — this doc only decides that a scanning step exists and is
required. How a merge that passes CI actually reaches production belongs
to [deployment-strategy.md](./deployment-strategy.md) (not yet
researched). Container image build specifics belong to
[containerization-and-build.md](./containerization-and-build.md) (not yet
researched).

## Decision

### Platform: GitHub Actions workflows, with a self-hosted runner

The repo is public, and workflow orchestration stays on GitHub Actions —
GitHub Issues/PRs is already the committed platform
([../project-management-conventions/issue-and-pr-lifecycle.md](../project-management-conventions/issue-and-pr-lifecycle.md)),
and Forgejo Actions / Gitea Actions were confirmed to require the repo
actually be hosted on a self-managed Forgejo/Gitea instance — they cannot
target a repo hosted on github.com, so adopting them would mean migrating
off the already-decided GitHub platform. Ruled out.

The **runner** is self-hosted on the existing NixOS home node, rather than
GitHub-hosted. GitHub-hosted runners are free/unlimited for public repos
and need zero management, but the execution agent itself is fully
GitHub's proprietary hosted compute. A self-hosted runner uses the actual
`actions/runner` execution agent (open source) running on infrastructure
already open-source top-to-bottom, directly serving this category's
open-source-preference principle for the CI *execution* mechanism, which
the user specifically asked to keep open source when possible — the
workflow orchestration/scheduling UI remains GitHub's regardless of runner
choice, but that's an accepted, unavoidable consequence of staying on the
already-committed GitHub platform, not a new exception. A persistent
self-hosted runner also keeps its Docker layer cache on local disk between
jobs, avoiding the cache-upload/download step hosted runners need.

### Runner implementation: one more service in the existing `docker-compose.yml`, isolated by network

The runner is [Docker's own official `docker/github-actions-runner`
image](https://github.com/docker/github-actions-runner) (open source,
built on [Sysbox](https://github.com/nestybox/sysbox), also open source),
run in **ephemeral mode** — one job, then the container is destroyed and a
fresh one spun up for the next. Sysbox gives the runner container a real
Docker-in-Docker capability via Linux user namespaces, instead of the
older pattern of mounting the host's `/var/run/docker.sock` or running
`--privileged` — both of which would let a compromised job escalate onto
the host directly. Ephemeral mode addresses a different risk (state/
backdoors persisting *between* jobs); it does not by itself prevent
arbitrary code from executing on the host *during* a job, which is why the
gates below exist as a separate, additional layer.

This runner is added as **one more service inside the same
`docker-compose.yml`** already decided in `hosting-and-infrastructure.md`,
not a separate compose file/project. The initial instinct was to isolate
it into its own file/project for network isolation, but that isolation
comes from Docker Compose's per-service custom `networks:` declarations,
not from file/project boundaries: services only reach each other if
they're both attached to the same explicitly-declared network — the
"everyone shares one default network" behavior only happens when no
custom networks are declared at all. So the runner service gets its own
dedicated network, with no attachment to the app-internal network carrying
Postgres/Garage/the app server/zero-cache traffic, no shared volumes, and
no Docker socket mount — the same isolation a separate file would give,
achieved with strictly less configuration surface, which is a direct win
for this category's minimal-manual-config principle without weakening the
open-source or security stance.

### Public-repo safety gates (mandatory, layered with the above — not a substitute for it)

Because the repo is public, anyone can open a PR from a fork, and its
workflow run would otherwise execute on this same physical home server.
Two GitHub-side controls are required, on top of the ephemeral+Sysbox
isolation above, not instead of it:

- **Repo setting: "require approval for all outside collaborators"** —
  stricter than GitHub's own first-time-contributor-only default. A fork
  PR's workflow simply does not start running, on any runner, until a
  maintainer manually approves it in the GitHub UI.
- **Workflow trigger: plain `pull_request`, never `pull_request_target`.**
  `pull_request_target` runs in the base repository's context with a
  privileged `GITHUB_TOKEN` and secrets access even for fork PRs — the
  documented root cause behind the majority of real-world GitHub Actions
  RCE incidents when combined with checking out and running the fork's
  code. Plain `pull_request` runs with a read-only, unprivileged token and
  no secrets access, which is the correct trigger for anything the
  self-hosted runner executes.

### Pipeline steps run on every PR

- **Lint/format**: Biome, already decided in
  [../coding-conventions/formatting-and-linting.md](../coding-conventions/formatting-and-linting.md).
- **Typecheck**: the TypeScript project's strict compiler check.
- **Test suite**: the full suite from the task's `testing.md`; which test
  runner/tooling actually implements this is deferred to
  [../testing-qa/index.md](../testing-qa/index.md) (not yet researched) —
  this step just invokes it and blocks the PR on failure.
- **PR-title lint**:
  [`amannn/action-semantic-pull-request`](https://github.com/amannn/action-semantic-pull-request),
  actively maintained, enforcing the Conventional Commits format already
  decided in `commit-message-conventions.md` (optional scope, `!`/
  `BREAKING CHANGE:` syntax).
- **Security/static scanning**: a required step per `review-process.md`;
  the specific tool is deferred to
  [../security-privacy/index.md](../security-privacy/index.md) (not yet
  researched). Open-source options surveyed in passing (Semgrep OSS,
  Gitleaks, Trivy) are noted there, not decided here. One flag carried
  forward regardless of which tool is eventually chosen: Trivy's own
  GitHub Action suffered a supply-chain compromise via hijacked tags in
  March 2026 — if it's used, pin the action by commit SHA, not a tag.
- A red run on any of the above blocks the PR outright — this doc doesn't
  newly decide that (already decided in `review-process.md`), it just
  implements it concretely.

### Caching

Not much is needed beyond what's already implied above: a persistent
self-hosted runner retains Docker layer and dependency caches on local
disk across ephemeral job containers, sidestepping the
upload/download cache-action cycle (e.g. `docker/build-push-action`'s
`type=gha` backend) that GitHub-hosted runners require.

## Reasoning

- Runner platform was decided by elimination: Forgejo/Gitea Actions
  conflict directly with the already-committed GitHub Issues/PR platform,
  so the real choice was GitHub-hosted vs. self-hosted runners on already-
  owned infrastructure. Self-hosted won once open-source CI execution was
  weighed as a real requirement rather than a nice-to-have, and once the
  Docker-layer-cache side benefit was factored in.
- Ephemeral mode and Sysbox isolation solve two different problems
  (between-job persistence vs. within-job host escalation) and are
  explicitly layered with GitHub's contributor-approval gate and the
  `pull_request`-only trigger rule, rather than treated as sufficient on
  their own — no single source suggested skipping the approval gate was
  safe on a public repo even with container-level isolation in place.
- The single-compose-file-with-per-service-networks approach directly
  replaced an initial separate-file proposal after the user pointed out
  that file/project separation wasn't actually necessary for network
  isolation — verified against Docker's own documentation before revising,
  rather than assumed. This is a concrete case of the minimal-manual-
  config principle winning outright once verified, with no isolation
  trade-off given up to get there.
- Deferring the specific test-runner and security-scanning tool choices to
  `testing-qa/` and `security-privacy/` respectively (rather than deciding
  them here) follows this category's existing boundary pattern — e.g. how
  `hosting-and-infrastructure.md` deferred backup responsibility to
  `backup-and-disaster-recovery.md` — so this doc owns "a step exists and
  gates the PR," not the tool underneath it.

## Addendum (2026-07-06): Runner Decision Revised — GitHub-Hosted

The self-hosted runner decided above was never deployed, and this addendum
reverses that part of the decision: CI stays on GitHub-hosted runners, and
issue [#11](https://github.com/nicbk/nicbk-website/issues/11) (deploy the
Sysbox runner, switch `runs-on`) is closed as not planned. Everything else
in this document — the pipeline steps, the public-repo safety gates, the
plain-`pull_request`-only rule — is unchanged and remains binding.

### What Invalidated the Original Decision

The chosen `docker/github-actions-runner` image requires the Sysbox
container runtime, and Sysbox turned out to be effectively unavailable on
the NixOS production host: the nixpkgs package request
([NixOS/nixpkgs#271901](https://github.com/NixOS/nixpkgs/issues/271901))
was closed as not planned after the requester's own packaging attempt
failed on overlayfs mounts; the only packaging anywhere is a one-person,
0-star flake pinned a release behind upstream; and Sysbox-EE was archived
in August 2025. Running the decided image would mean trusting unmaintained
packaging of a security-critical runtime.

### Alternatives Compared (research pass, 2026-07-06)

- **Containerized ephemeral runner without Sysbox** — the strongest
  self-hosted candidate. This repo's CI jobs never invoke Docker, so the
  Docker-in-Docker capability Sysbox existed to provide safely is not
  actually needed; an unprivileged, no-socket-mount, ephemeral container
  (e.g. the actively maintained `myoung34/docker-github-actions-runner`,
  Ubuntu 24.04 userland, `EPHEMERAL=1` + a compose restart loop) would run
  the existing workflows unchanged, with gVisor (`runsc`, packaged in
  nixpkgs) available later as a syscall-isolation upgrade.
- **NixOS-native `services.github-runners` (ephemeral)** — excellent
  systemd sandboxing (per-job `DynamicUser`, wiped state), but jobs run on
  a non-FHS userland: `actions/setup-node`'s prebuilt binaries need
  `nix-ld`, and Playwright must come from nixpkgs'
  `playwright-driver.browsers`, whose version must exactly match the npm
  `playwright` version — NixOS 25.11 stable ships 1.56.1 against npm
  1.61.x, so the repo's `package.json` would be permanently coupled to the
  host's nixpkgs channel, plus the workflows would need
  `runner.environment` conditionals.
- **microvm.nix guest VM** — the best isolation, but no published
  GitHub-runner-in-microvm.nix pattern exists, per-job VM recycling would
  be custom glue, guest RAM is a standing reservation on the host, and a
  NixOS guest re-inherits the FHS problems above.
- **GitHub-hosted status quo** — free and unlimited for public repos
  (4 vCPU / 16 GB `ubuntu-latest`), reaffirmed through the December 2025
  pricing changes (hosted rates cut; a proposed self-hosted platform
  charge withdrawn, with public repos exempt even in the withdrawn plan).
  It is also the posture GitHub's security guidance assumes: current docs
  still say self-hosted runners "should almost never be used for public
  repositories".

### Why GitHub-Hosted Won

- **The open-source gain from self-hosting is narrower than the original
  decision weighed it.** The Actions control plane (scheduling, workflow
  parsing, token issuance) is GitHub's proprietary service regardless of
  runner choice; the `actions/runner` execution agent is the same MIT
  code on both; and the hosted VM images' build sources are public
  (`actions/runner-images`). Self-hosting moves only the compute onto
  open ground — while the project is on the GitHub platform for git
  hosting, issues, and PRs anyway, that residual gain does not pay for
  the maintenance and risk below.
- **Blast radius.** The would-be runner host is now the production node
  serving the live site, Nextcloud, and the WireGuard mesh. GitHub-hosted
  runners put untrusted fork-PR code on GitHub's disposable VMs instead
  of anywhere near it. The approval gate mitigates but does not eliminate
  that exposure (one careless approval executes untrusted code
  on-premises).
- **Zero cost, zero maintenance** vs. a runner-version treadmill (GitHub
  is moving to enforce minimum runner versions), image/token plumbing,
  and host hardening.
- **Revisit trigger, decided now:** a local runner becomes worth
  reconsidering only if the project migrates off github.com entirely to a
  self-hosted platform (e.g. Forgejo) for git, issues, and CI together —
  such a platform brings its own runner story, so this document's
  self-hosted-runner section should be re-researched from scratch at that
  point rather than resurrected.

The `TODO(#11)` markers in `.github/workflows/` are removed; the
workflows' `runs-on: ubuntu-latest` is now the decided end state, not a
temporary arrangement. The caching section's self-hosted rationale is
moot: on hosted runners the current npm-cache-free, no-image-build CI is
fast enough that no cache action is warranted yet.

## Sources

- [docs.github.com — billing and usage](https://docs.github.com/en/actions/concepts/billing-and-usage),
  [docs.github.com — about billing for GitHub Actions](https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions),
  [docs.github.com — GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners),
  [docs.github.com — Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing),
  [github.com/orgs/community discussion #70492](https://github.com/orgs/community/discussions/70492) —
  GitHub-hosted runner free-minute limits, public vs. private repos.
- [nixpkgs — github-runners.nix](https://github.com/NixOS/nixpkgs/blob/master/nixos/modules/services/continuous-integration/github-runners.nix),
  [mynixos.com — services.github-runners options](https://mynixos.com/options/services.github-runners.%3Cname%3E),
  [github.com/juspay/github-nix-ci](https://github.com/juspay/github-nix-ci),
  [NixOS Discourse — github-nix-ci](https://discourse.nixos.org/t/github-nix-ci-for-self-hosting-github-runners-on-macos-linux/47642) —
  NixOS-native self-hosted runner options (considered, not chosen — see
  "Runner implementation" for why a containerized runner was preferred).
- [forgejo.org — Actions reference](https://forgejo.org/docs/latest/user/actions/reference/),
  [forgejo.org — Actions](https://forgejo.org/docs/latest/user/actions/),
  [docs.gitea.com — act-runner](https://docs.gitea.com/usage/actions/act-runner),
  [github.com/actions/checkout issue #2321](https://github.com/actions/checkout/issues/2321) —
  Forgejo/Gitea Actions requiring a self-managed instance, ruling them out
  for a github.com-hosted repo.
- [docs.github.com — secure use reference](https://docs.github.com/en/actions/reference/security/secure-use),
  [docs.github.com — adding self-hosted runners](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners),
  [github.com/orgs/community discussion #26722](https://github.com/orgs/community/discussions/26722) —
  GitHub's own guidance against self-hosted runners on public repos with
  untrusted fork PRs.
- [github.com/docker/github-actions-runner](https://github.com/docker/github-actions-runner),
  [github.com/nestybox/sysbox](https://github.com/nestybox/sysbox),
  [github.com/myoung34/docker-github-actions-runner](https://github.com/myoung34/docker-github-actions-runner) —
  containerized self-hosted runner images; Docker's official Sysbox-based
  image chosen over the community myoung34 image.
- [docs.github.com — approving workflow runs from forks](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/approve-runs-from-forks) —
  confirms the contributor-approval gate blocks workflow execution itself,
  not just cost/minutes.
- [Orca Security — Pull Request Nightmare pt. 1](https://orca.security/resources/blog/pull-request-nightmare-github-actions-rce/),
  [pt. 2](https://orca.security/resources/blog/pull-request-nightmare-part-2-exploits/),
  [Wiz — hardening GitHub Actions](https://www.wiz.io/blog/github-actions-security-guide) —
  `pull_request` vs. `pull_request_target` security distinction.
- [Medium — Docker escape via mounted docker.sock](https://theoffensivelabs.medium.com/docker-escape-using-mounted-docker-sock-6d5a74d6b783) —
  why socket-mounting/`--privileged` is the risk Sysbox avoids.
- [docs.docker.com — networks in Compose](https://docs.docker.com/reference/compose-file/networks/),
  [DockerHomeLab — Compose networking guide](https://dockerhomelab.com/posts/docker-compose-networking-guide/),
  [netmaker.io — networking with Docker Compose](https://www.netmaker.io/resources/docker-compose-network) —
  confirms per-service custom networks in one compose file isolate
  services exactly as a separate file/project would.
- [github.com/amannn/action-semantic-pull-request](https://github.com/amannn/action-semantic-pull-request),
  [releases](https://github.com/amannn/action-semantic-pull-request/releases),
  [GitHub Marketplace listing](https://github.com/marketplace/actions/semantic-pull-request) —
  PR-title Conventional Commits linting, current maintenance status.
- [docs.docker.com — GHA cache backend](https://docs.docker.com/build/cache/backends/gha/),
  [docs.docker.com — caching in GitHub Actions](https://docs.docker.com/build/ci/github-actions/cache/) —
  hosted-runner Docker layer caching, for contrast with the self-hosted
  runner's native disk cache.
- [The Hacker News — Trivy GitHub Action compromise](https://thehackernews.com/2026/03/trivy-security-scanner-github-actions.html),
  [GHSA-69fq-xp46-6x23](https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23),
  [Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2026/03/24/detecting-investigating-defending-against-trivy-supply-chain-compromise/),
  [CrowdStrike blog](https://www.crowdstrike.com/en-us/blog/from-scanner-to-stealer-inside-the-trivy-action-supply-chain-compromise/),
  [Socket.dev blog](https://socket.dev/blog/trivy-under-attack-again-github-actions-compromise),
  [GitGuardian blog](https://blog.gitguardian.com/trivys-march-supply-chain-attack-shows-where-secret-exposure-hurts-most/) —
  the March 2026 Trivy Action tag-hijack supply-chain compromise, and the
  pin-by-SHA mitigation carried forward regardless of final tool choice.

Sources for the 2026-07-06 runner-revision addendum:

- [NixOS/nixpkgs issue #271901](https://github.com/NixOS/nixpkgs/issues/271901),
  [github.com/polferov/sysbox-nix](https://github.com/polferov/sysbox-nix),
  [docker-archive/nestybox.sysbox-ee releases](https://github.com/docker-archive/nestybox.sysbox-ee/releases) —
  Sysbox not packaged in nixpkgs (request closed not-planned), the sole
  third-party flake's state, and Sysbox-EE's August 2025 archival.
- [github.com/myoung34/docker-github-actions-runner](https://github.com/myoung34/docker-github-actions-runner) —
  the maintained no-Sysbox ephemeral runner image the containerized
  alternative would have used.
- [nixpkgs — gvisor package](https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/gv/gvisor/package.nix),
  [nixpkgs — gvisor NixOS test](https://github.com/NixOS/nixpkgs/blob/master/nixos/tests/gvisor.nix) —
  gVisor packaged in nixpkgs and wired as a Docker runtime, the
  hardening upgrade path the containerized alternative kept open.
- [nixpkgs release-25.11 — github-runner options](https://github.com/NixOS/nixpkgs/blob/release-25.11/nixos/modules/services/continuous-integration/github-runner/options.nix),
  [wiki.nixos.org — Playwright](https://wiki.nixos.org/wiki/Playwright),
  [NixOS Discourse — playwright-driver version sync](https://discourse.nixos.org/t/synchronize-versions-of-playwright-driver-browsers-and-npm-package/66267) —
  the NixOS-native runner module's capabilities and the FHS/Playwright
  version-coupling friction that demoted it.
- [github.com/microvm-nix/microvm.nix](https://github.com/microvm-nix/microvm.nix),
  [github.com/bitcoin-dev-tools/nix-github-runner](https://github.com/bitcoin-dev-tools/nix-github-runner) —
  microvm.nix's state, and the closest runner project explicitly noting
  the runner-in-microVM pattern is unimplemented.
- [docs.github.com — GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners),
  [github.com — 2026 pricing changes for GitHub Actions](https://github.com/resources/insights/2026-pricing-changes-for-github-actions),
  [github.blog — reduced hosted-runner pricing (2026-01-01)](https://github.blog/changelog/2026-01-01-reduced-pricing-for-github-hosted-runners-usage/) —
  hosted runners free/unlimited for public repos (4 vCPU / 16 GB), and
  the December 2025 pricing episode leaving public repos free.
- [docs.github.com — secure use reference](https://docs.github.com/en/actions/reference/security/secure-use),
  [docs.github.com — managing GitHub Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) —
  current "almost never" wording on self-hosted runners for public
  repos, and the fork-PR approval policies' explicit non-sufficiency.
- [github.com/actions/runner](https://github.com/actions/runner),
  [github.com/actions/runner-images](https://github.com/actions/runner-images) —
  what is and isn't open in the hosted path (MIT agent, public image
  sources, proprietary control plane and compute).
- [github.blog — runner minimum-version enforcement paused](https://github.blog/changelog/2026-03-13-self-hosted-runner-minimum-version-enforcement-paused/) —
  the self-hosted runner-version maintenance treadmill.
