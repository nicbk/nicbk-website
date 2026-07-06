# Deployment Strategy

Researched: 2026-07-05. Decided: 2026-07-05.

How a merge to `main` actually reaches the NixOS production host and becomes
the running stack, building on the unified `docker-compose.yml` and the
NixOS-defined systemd unit decided in
[hosting-and-infrastructure.md](./hosting-and-infrastructure.md), and
deliberately kept separate from the self-hosted CI runner decided in
[ci-pipeline.md](./ci-pipeline.md) — that runner has no Docker socket and no
production-network access by design (public-repo/fork-PR threat model), and
this doc does not change that; deployment uses its own, independent
mechanism. Guiding principles from [index.md](./index.md) apply here as
everywhere in this category: prefer open-source tooling, minimize manual
configuration.

Boundary notes: the Dockerfile/build internals for each image belong to
[containerization-and-build.md](./containerization-and-build.md) (not yet
researched) — this doc only decides *when and how* images get built as part
of the deploy flow, not their internal build strategy. Secrets/environment
config used during deploy belongs to
[secrets-and-environment-config.md](./secrets-and-environment-config.md)
(not yet researched). Database migration sequencing relative to a deploy
belongs to [database-migrations.md](./database-migrations.md) (not yet
researched) — this doc doesn't address migration ordering. Backup/recovery
of data (as opposed to code/image rollback) belongs to
[backup-and-disaster-recovery.md](./backup-and-disaster-recovery.md) (not
yet researched).

## Decision

### Pull-based, continuous deployment: a systemd timer extends the existing deploy unit

The one-shot systemd unit from `hosting-and-infrastructure.md` (which runs
`docker compose -f <path> up -d` against a checked-out copy of this repo)
becomes a **systemd timer**, polling on a short interval (proposed: every 2
minutes, tunable) rather than running once at boot. Each tick runs a small
script:

1. `git fetch origin main`.
2. Compare the fetched `origin/main` SHA to the SHA last deployed (tracked
   simply as the local checkout's current `HEAD`, no separate state file
   needed).
3. If unchanged, do nothing.
4. If changed: `git pull` (fast-forward only), `docker compose build`,
   `docker compose up -d`.

This makes every merge to `main` a deploy within one poll interval —
**continuous deployment**, not a manual/gated trigger — because the human
review and CI/CD gates already required by
[../project-management-conventions/review-process.md](../project-management-conventions/review-process.md)
happen *before* a merge lands on `main`. A second manual approval step after
merge would just be redundant re-approval of code already approved once;
nothing new is gained by gating deploy separately from merge.

The core reason this is **pull-based** rather than push-based: no
GitHub-triggered process — including the existing CI runner — is ever
handed Docker socket access or production-network reachability. The host
only ever makes outbound connections (to GitHub, to fetch); nothing from
GitHub ever reaches in. This eliminates the self-hosted-runner-as-deploy-
vector risk class entirely, rather than mitigating it, which is the
deciding factor over the alternatives below.

### Rejected: a separate, push-triggered privileged runner

A second self-hosted runner, registered separately from the PR-testing
runner and scoped only to the `push` event on `main`, was considered. It is
technically sound as a security boundary: GitHub runs `push`-triggered
workflows from the target ref itself (already-reviewed code), not from a
fork's ref the way `pull_request` does, so it isn't exposed to the same
fork-PR threat model the existing CI runner defends against. But two things
count against it here:

- It still means a Docker-socket-privileged process is reachable from
  GitHub's infrastructure at all — a risk surface the pull-based approach
  removes outright rather than narrows.
- Holding this trust boundary depends on branch protection explicitly
  including administrators in "do not allow bypassing the above settings" —
  an easy-to-miss configuration detail, since GitHub's default lets repo
  admins bypass branch protection rules.

Given that a short poll-interval delay after merge was explicitly acceptable
for this project, there was no offsetting benefit to taking on this
additional risk surface.

### Rejected: SSH/webhook deploy from a GitHub-hosted runner

A GitHub-hosted runner triggering an SSH command or a small webhook
listener (e.g. `adnanh/webhook`) on the host was also considered. This
requires an inbound-reachable listener (even behind a tunnel) that neither
of the other approaches need, and it puts GitHub's hosted infrastructure —
via a long-lived SSH key or webhook secret — directly in the production
trust chain. Weakest fit given the open-source/self-contained preference,
especially once the pull-based approach already covers the need without
either cost.

### Rejected: a GitOps tool (Komodo, Watchtower, etc.)

**Watchtower** is dead upstream — the original repo was archived in
December 2025; only a fresh community fork exists, not an actively-designed
project. **Komodo** (a Compose-native GitOps tool with a UI and a
Core/Periphery agent architecture) is actively developed and would work,
but its multi-host/UI capabilities solve problems this single-host project
doesn't have — adopting it would mean a new long-lived service and
dependency for no capability gained over a small script, which cuts against
this category's minimal-manual-config principle. A systemd timer plus a
short script already fully implements the reconciliation loop these tools
exist to provide.

### Image build: on-host, at deploy time — not CI-built-and-pushed

Images are built locally by the deploy script (`docker compose build`), not
built once in CI and pushed to a registry for the host to pull. This avoids
introducing a container registry (e.g. GHCR) and push credentials as a new
dependency the CI runner would otherwise need to manage. The accepted
tradeoff: this rebuilds from source on the host rather than reusing the
exact artifact CI already tested — but it's a rebuild of the *same reviewed
commit* that passed CI, so the risk is limited to non-determinism in the
build itself, not to running different or unreviewed code.

### Rollback

Because images are rebuilt from source on every deploy rather than pulled
by registry-pinned digest, there's no separate "old digest" to fall back to
— so rollback is: **revert the commit on `main`** through the normal
reviewed-PR process (consistent with the trunk-based development already
decided in
[../project-management-conventions/branching-and-parallel-agent-strategy.md](../project-management-conventions/branching-and-parallel-agent-strategy.md)),
and let the timer's next poll redeploy the reverted state automatically —
no separate rollback mechanism to build or maintain. For a rollback faster
than the poll interval, a maintainer can manually run
`git checkout <previous-sha> && docker compose up -d --build` directly on
the host, ahead of the timer (the timer will simply detect no drift once it
next runs, since the checkout now matches an already-fetched ancestor —
note this manual path is a stopgap, and the reverted state should still land
on `main` through a real PR shortly after so the timer's normal reconciliation
stays authoritative).

## Reasoning

- Pull-based beat both push-based alternatives on the same axis each time:
  it removes GitHub-triggered access to Docker/production credentials as a
  risk *category*, rather than narrowing it (push-scoped runner) or
  routing around it with an inbound listener and long-lived credential
  (SSH/webhook). This was the deciding factor once a short poll-interval
  delay was confirmed acceptable — there was no remaining benefit to
  weigh against the extra risk surface of either alternative.
- A plain systemd timer + script was chosen over adopting a GitOps tool
  (Komodo) because it exactly matches this project's actual scale (one
  host, one maintainer) — Komodo's multi-host/UI machinery would be new
  surface to secure and maintain for capability this project doesn't need,
  which is precisely the kind of avoidable manual-config/ops burden this
  category's guiding principles ask to weigh against alternatives. Watchtower
  was ruled out on a factual basis (dead upstream), not a design tradeoff.
- Building images on-host at deploy time, rather than in CI with a registry
  push, was chosen for the same minimal-moving-parts reason: a registry and
  push credentials are a real new dependency, and the tradeoff being
  avoided (reusing the literal CI-tested artifact) is only meaningfully
  different from "rebuild the same reviewed commit" if the build itself is
  non-deterministic — a narrower and more inspectable risk than adding
  infrastructure.
- Rollback follows directly from the build-on-host choice: since there's no
  registry-pinned digest to keep around, there's no separate digest-pinning
  or image-retention machinery to design — reverting the source and letting
  the same reconciliation loop redeploy is both simplest and consistent
  with the trunk-based development model already in place.
- Continuous (not manually gated) deployment was a natural consequence, not
  a fresh tradeoff: `review-process.md` already requires human review and a
  green CI/CD run before anything merges to `main`, so gating deploy again
  after merge would just re-approve already-approved code.

## Sources

- [docs.github.com — securely using `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target),
  [docs.github.com — events that trigger workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows) —
  confirms `push`-triggered workflows run from the target ref (trusted),
  unlike `pull_request` from a fork.
- [docs.github.com — managing a branch protection rule](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule) —
  the admin-bypass-by-default gotcha for branch protection rules.
- [GitHub Security Lab — preventing pwn requests](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/),
  [StepSecurity — pwn request vulnerability](https://www.stepsecurity.io/blog/github-actions-pwn-request-vulnerability) —
  the `workflow_run`/`pull_request_target` privilege-escalation pattern a
  push-triggered deploy workflow must avoid chaining into.
- [docs.github.com — self-hosted runners](https://docs.github.com/en/actions/reference/runners/self-hosted-runners),
  [github.com/orgs/community discussion #26630](https://github.com/orgs/community/discussions/26630) —
  self-hosted runners only require outbound connectivity, relevant to
  comparing against the inbound-listener requirement of the SSH/webhook
  option.
- [Netdata — Docker socket security](https://www.netdata.cloud/guides/docker/docker-socket-security/),
  [Praetorian — self-hosted GitHub runners are backdoors](https://www.praetorian.com/blog/self-hosted-github-runners-are-backdoors/) —
  Docker-socket access as root-equivalent host access, the core risk being
  avoided.
- [Linuxhandbook — Watchtower alternatives](https://linuxhandbook.com/blog/watchtower-like-docker-tools/),
  [xda-developers — Watchtower discontinued](https://www.xda-developers.com/with-watchtower-discontinued-heres-how-i-update-containers/) —
  Watchtower's archival (December 2025) and the community fork status.
- [awesome-docker-compose.com — Komodo](https://awesome-docker-compose.com/komodo),
  [antoine.weill-duflos.fr — Komodo writeup](https://antoine.weill-duflos.fr/en/post/komodo/),
  [veerendra2.github.io — GitOps for homeservers pt.3](https://veerendra2.github.io/gitops-for-homeservers-part3/),
  [dev.to — GitOps + Docker Compose homeserver writeup](https://dev.to/veerendra2/how-i-manage-my-homeservers-with-gitops-and-docker-compose-3fcp),
  [words.defrances.co — GitOps for Docker](https://words.defrances.co/gitops-docker/) —
  Komodo/ComposeFlux as Compose-native GitOps options, and why k8s-native
  tools (Flux/ArgoCD) don't apply to a bare Compose host.
- [blog.tymscar.com — private GitHub CI/CD via webhook+SSH](https://blog.tymscar.com/posts/privategithubcicd/),
  [github.com/adnanh/webhook releases](https://github.com/adnanh/webhook/releases) —
  the SSH/webhook deploy pattern and its credential/attack-surface
  tradeoffs.
- [engineerpalsu.medium.com — image tagging strategies](https://engineerpalsu.medium.com/implementing-image-tagging-strategies-for-version-control-437ef86bb875),
  [oneuptime.com — Docker Compose with pre-built images](https://oneuptime.com/blog/post/2026-02-08-how-to-use-docker-compose-with-pre-built-images-only/view),
  [docs.docker.com — `docker service rollback`](https://docs.docker.com/reference/cli/docker/service/rollback/) —
  digest-pinning rollback patterns (relevant to the CI-build-and-push
  alternative that was not chosen) and confirmation that Swarm-style
  service rollback doesn't apply to plain Compose.
- [Praetorian — TensorFlow supply-chain compromise via self-hosted runner](https://www.praetorian.com/blog/tensorflow-supply-chain-compromise-via-self-hosted-runner-attack/) —
  validates the existing PR-runner isolation from `ci-pipeline.md` against
  a real incident of the class it defends against.
- [Sysdig — self-hosted GitHub Actions runners as backdoors](https://www.sysdig.com/blog/how-threat-actors-are-using-self-hosted-github-actions-runners-as-backdoors),
  [Dark Reading — Shai-Hulud npm worm](https://www.darkreading.com/cyberattacks-data-breaches/supply-chain-worms-in-2026-what-shai-hulud-taught-attackers-and-how-to-prepare) —
  attackers registering rogue self-hosted runners for persistence/C2.
- [Unit42 — GitHub Actions supply-chain attack (tj-actions)](https://unit42.paloaltonetworks.com/github-actions-supply-chain-attack/),
  [The Hacker News — GitHub Actions supply-chain attack](https://thehackernews.com/2026/05/github-actions-supply-chain-attack.html) —
  tag-repointing supply-chain compromises, motivating the digest-over-tag
  discussion even though the CI-build-and-push option wasn't chosen here.
