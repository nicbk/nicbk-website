# Secrets and Environment Configuration

Researched: 2026-07-05. Decided: 2026-07-05.

What secrets/config values this stack actually needs, and how they get onto
the NixOS production host and into the Docker Compose stack decided in
[hosting-and-infrastructure.md](./hosting-and-infrastructure.md) — given the
app services deliberately do NOT use NixOS-native modules (so no
NixOS-activation-tied secrets mechanism naturally applies), and the repo is
public (per [ci-pipeline.md](./ci-pipeline.md)/
[deployment-strategy.md](./deployment-strategy.md)), which rules out
otherwise-standard patterns that assume a private repo. Guiding principles
from [index.md](./index.md) apply here as everywhere in this category:
prefer open-source tooling, minimize manual configuration.

Boundary notes: backup/recovery of the actual application *data* (Postgres,
Garage) belongs to
[backup-and-disaster-recovery.md](./backup-and-disaster-recovery.md) (not
yet researched) — this doc only covers backing up the *secret values
themselves*. Database migration sequencing belongs to
[database-migrations.md](./database-migrations.md) (not yet researched).

## Decision

### What this stack actually needs

- **Better Auth**: `BETTER_AUTH_SECRET` (session/encryption secret — Better
  Auth throws at startup in production if this and `AUTH_SECRET` are both
  unset, no silent insecure default), `BETTER_AUTH_URL` (set explicitly
  rather than relying on request-based inference), `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` for the Google OAuth provider.
- **PostgreSQL**: connection string/password (`wal_level=logical` itself is
  a server config setting, not a secret).
- **Garage**: an S3-style access key + secret key (created via
  `garage key create`, used by the app server as an S3 client) and
  `rpc_secret` (inter-node RPC auth — irrelevant in single-node mode
  operationally, but Garage still requires it be set). No static
  `admin_token` (see below).
- **Zero (`zero-cache`)**: `ZERO_UPSTREAM_DB` (upstream Postgres connection
  string), `ZERO_ADMIN_PASSWORD` (required in production for zero-cache's
  own admin/inspector endpoints), and one shared `ZERO_PUSH_API_KEY`-style
  secret sent as an `X-Api-Key` header so the app server can trust that a
  mutate/query push actually came from zero-cache. Zero's older
  JWT/JWKS-based client-auth config (`ZERO_AUTH_JWKS_URL` etc.) is
  documented as deprecated and isn't needed here — with custom mutators and
  synced queries, all auth/business-logic checks already live in the app
  server's push/query endpoints (per
  [../system-architecture/service-topology.md](../system-architecture/service-topology.md)),
  so no shared JWT secret between zero-cache and the app server is
  required at all.
- **GROBID**: no secrets.
- **Semantic Scholar**: keyless by default (shared, lower-rate-limit
  unauthenticated pool); an API key is optional and only worth requesting
  if the unauthenticated rate limit becomes a real constraint later — not
  a launch requirement.

### Garage's admin token: avoided entirely, not templated

Garage's `admin_token` has no confirmed native environment-variable or
file-path override (unlike `rpc_secret`, which supports
`GARAGE_RPC_SECRET_FILE` directly) — using a static admin token would mean
templating it into `garage.toml` at container start, one more piece of
bootstrap glue. Instead, no static admin token is configured at all;
administrative actions use short-lived, scoped tokens created on demand
(`garage admin-token create --expires-in <duration>`) rather than one
long-lived, all-powerful credential sitting in config permanently. This
avoids both the templating problem and the standing risk of a single
permanent master credential.

### Secrets storage: manual provisioning directly on the host, no git involvement

Secrets are never committed to any git repository, encrypted or not.
`sops`/`age` (encrypting secrets and committing the ciphertext into this
project's own repo) was seriously considered and explicitly rejected: this
repo is **public**, and committing ciphertext to it means that ciphertext
becomes part of a permanently public, forkable git history — forks and
clones retain it even after a later history rewrite. Community discussion
that specifically addresses public-repo visibility (as opposed to generic
sops/age tutorials, which mostly don't address it at all) converges on
public ciphertext being conditionally acceptable only for short-lived,
easily-rotated secrets — the opposite of this stack's actual secrets
(database passwords, S3-style credentials), which are long-lived and not
casually rotated across multiple dependent systems. There's also a
concrete, non-theoretical concern, not just a hypothetical one: `age` is
not post-quantum-safe, and tens of thousands of `age`-encrypted files are
already discoverable on public GitHub — plausible "harvest now, decrypt
later" targets. A private companion repo (secrets pulled via a read-only
deploy key) was also considered as a way to keep sops/age's rotation
convenience while avoiding public exposure, but was set aside in favor of
the simpler option below.

Instead: secrets are provisioned manually, directly on the host — SSH in,
write a git-ignored `.env` file (or files, one per service as convenient),
`chmod 600`. This is Docker's own documented default practice, not a
fallback, and adds zero new tooling/credentials on top of what's already
decided. The accepted tradeoff: no automatic audit trail or backup of the
secret values themselves, and a from-scratch host rebuild requires
remembering to re-provision — mitigated by keeping an out-of-git backup of
the actual values (e.g. in a password manager), which is the maintainer's
responsibility, not a new system to build.

### How secrets reach each container

Two distinct Compose mechanisms are both named `.env` and are easy to
confuse, so this is worth being explicit about: Compose's auto-loaded
project-root `.env` file is used only for `${VAR}` substitution *inside the
Compose YAML itself* — it does not inject anything into a container unless
also referenced via `environment:`. Actually injecting values into a
container's environment requires a service's `env_file:` directive, which
is what this project uses for the app server, `zero-cache`, and Postgres's
non-file-based values.

Where an official image already supports Docker Compose's file-based
`secrets:` mechanism (mounted at `/run/secrets/<name>`) with zero extra
code, it's used in preference to a plain env var, since it isn't visible
via `docker inspect`/`ps` the way `environment:`/`env_file:` values are:
Postgres's `POSTGRES_PASSWORD_FILE` and Garage's `GARAGE_RPC_SECRET_FILE`
both support this natively. The custom TanStack Start app server does
**not** get the same treatment — Node has no built-in support for reading
`_FILE`-suffixed env vars, so using Compose file-secrets there would mean
writing and maintaining bootstrap code to populate `process.env` from
`/run/secrets/*`, a real cost with no off-the-shelf image support to offset
it. So the app server's secrets (`BETTER_AUTH_SECRET`,
`GOOGLE_CLIENT_SECRET`, Garage's S3-style keys, `ZERO_PUSH_API_KEY`) stay
plain `env_file:`-injected environment variables — simpler, and consistent
with this category's minimize-manual-config principle once the added code
cost is weighed against the marginal security gain.

### Local dev vs. production config split

TanStack Start (via Vite) loads `.env`, `.env.local`, `.env.development`,
and `.env.production`, with `.env.local` meant to be git-ignored for local
overrides — a `.env.example` with placeholder values stays committed as a
template, following the still-common (if not framework-official)
convention. Server code (server functions, the app server's own backend
logic) can read any environment variable via `process.env`; only variables
carrying Vite's public prefix (`VITE_` by default) are bundled into
client-side JS and become publicly visible. Every actual secret in this
doc — `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `ZERO_UPSTREAM_DB`,
Garage's S3-style keys, `ZERO_PUSH_API_KEY` — stays unprefixed and
server-only; a `VITE_`-prefixed variable would only ever be used for a
genuinely public value (e.g. a public API base URL), if one exists.

### CI needs no GitHub-side secrets

As currently scoped, the CI pipeline decided in `ci-pipeline.md` needs zero
manually-provisioned GitHub encrypted repository secrets. `GITHUB_TOKEN`
(used by `amannn/action-semantic-pull-request`) is GitHub's own automatic,
per-workflow-run token, not something manually configured. More
fundamentally: on `pull_request` (not `pull_request_target`) events from
forks — the only trigger this project's CI uses, per `ci-pipeline.md` —
GitHub does not propagate repo-level encrypted secrets into the job at all,
so even if a secret were added to the repo's GitHub settings, a fork PR's
run couldn't see it regardless. The one adjacent credential worth noting:
registering the ephemeral self-hosted runner itself typically needs a PAT
or GitHub App credential — but that's a host-side credential for runner
infrastructure, provisioned the same manual, on-host way as every other
secret in this doc, not a GitHub Actions repository secret.

### Rotation

Rotating any secret is a manual, host-side step: SSH in, edit the relevant
`.env` file (or regenerate the relevant file-based secret), then
`docker compose up -d` (or restart just the affected service) to pick up
the new value. This is an accepted, infrequent manual step — secret
rotation isn't a recurring operation the way a deploy is, so it doesn't
conflict with this category's minimize-manual-config principle the way a
recurring task would.

## Reasoning

- Manual, on-host, git-free provisioning was chosen directly in response to
  a real objection to the sops/age-in-public-repo alternative: once
  ciphertext is pushed to a public remote, it's permanently exposed
  regardless of later key rotation or history rewrites, and this stack's
  actual secrets are exactly the long-lived, hard-to-rotate-everywhere kind
  that public-ciphertext discussions warn against, not the short-lived kind
  they consider conditionally fine. A private companion repo would have
  addressed this while keeping some of sops/age's convenience, but adds a
  second remote/credential for marginal benefit over the simpler
  no-git-at-all option, which is also literally Docker's own documented
  default practice.
- Avoiding a static Garage admin token isn't just about the missing
  env-var override — it also means never having a single, permanent,
  all-powerful Garage credential to protect at all, which is a strictly
  better security posture than templating one in, independent of which
  secrets-storage mechanism was chosen above.
- File-based Compose secrets were adopted only where an image already
  supports the `_FILE` convention for free (Postgres, Garage's
  `rpc_secret`) — anywhere else, the code cost of adding that support
  (the app server has none built in) wasn't judged worth the marginal gain
  over a plain injected env var, directly applying this category's
  minimize-manual-config principle to a security-vs-effort tradeoff rather
  than defaulting to "more secure" unconditionally.
- Confirming CI needs no GitHub secrets is a validation of the isolation
  already decided in `ci-pipeline.md`, not a new decision — the
  `pull_request`-only trigger (never `pull_request_target`) already
  independently guarantees fork PRs can't see repository secrets even if
  some existed.

## Sources

- [better-auth.com — Options reference](https://better-auth.com/docs/reference/options),
  [better-auth.com — Google provider](https://better-auth.com/docs/authentication/google),
  [better-auth.com — Security reference](https://better-auth.com/docs/reference/security) —
  Better Auth's required/optional secret env vars.
- [garagehq.deuxfleurs.fr — Admin API reference](https://garagehq.deuxfleurs.fr/documentation/reference-manual/admin-api/),
  [garagehq.deuxfleurs.fr — Configuration file format](https://garagehq.deuxfleurs.fr/documentation/reference-manual/configuration/),
  [garagehq.deuxfleurs.fr — configuring S3 clients](https://garagehq.deuxfleurs.fr/cookbook/clients.html),
  [git.deuxfleurs.fr issue #659](https://git.deuxfleurs.fr/Deuxfleurs/garage/issues/659) —
  Garage's `admin_token`/`rpc_secret`/S3-key distinctions and env-var
  support.
- [zero.rocicorp.dev — zero-cache config](https://zero.rocicorp.dev/docs/zero-cache-config),
  [zero.rocicorp.dev — custom mutators](https://zero.rocicorp.dev/docs/custom-mutators) —
  Zero's required env vars and the deprecated JWT/JWKS auth path vs. the
  custom-mutators/synced-queries model this project already uses.
- [semanticscholar.org — Academic Graph API](https://www.semanticscholar.org/product/api) —
  keyless-by-default access with an optional higher-rate-limit API key.
- [tvi.al — commit secrets to git, encrypted with sops and age](https://tvi.al/commit-your-secrets-to-git-encrypted-with-sops-and-age/),
  [wiki.nixos.org — comparison of secret-managing schemes](https://wiki.nixos.org/wiki/Comparison_of_secret_managing_schemes) —
  generic sops/age-in-git guidance that doesn't address repo visibility.
- [discourse.nixos.org — handling secrets in NixOS overview](https://discourse.nixos.org/t/handling-secrets-in-nixos-an-overview-git-crypt-agenix-sops-nix-and-when-to-use-them/35462),
  [discourse.nixos.org — sops-nix safe enough to commit id_rsa?](https://discourse.nixos.org/t/sops-nix-safe-enough-to-commit-id-rsa/34354) —
  community discussion specifically addressing public-repo ciphertext risk,
  the basis for rejecting sops/age-in-this-repo.
- [github.com/FiloSottile/age issue #578](https://github.com/FiloSottile/age/issues/578),
  [github.com/getsops/sops issue #1536](https://github.com/getsops/sops/issues/1536) —
  `age`'s lack of post-quantum safety and the ~23,200 already-public
  `age`-encrypted files found on GitHub.
- [til.simonwillison.net — rewriting a git repo to remove secrets](https://til.simonwillison.net/git/rewrite-repo-remove-secrets),
  [elegantsoftwaresolutions.com — BFG/git-filter-repo for leaked secrets](https://www.elegantsoftwaresolutions.com/blog/bfg-git-filter-repo-cleaning-leaked-secrets-from-history) —
  why a public git history is treated as permanently compromised once
  pushed, regardless of later rewrites.
- [lorenzbischof.ch — managing secrets in NixOS with a private repository](https://lorenzbischof.ch/posts/manage-secrets-in-nixos-with-a-private-repository/) —
  the private-companion-repo-plus-deploy-key pattern considered and set
  aside in favor of the simpler no-git option.
- [docs.docker.com — manage secrets securely in Docker Compose](https://docs.docker.com/compose/how-tos/use-secrets/),
  [docs.docker.com — environment variables best practices](https://docs.docker.com/compose/how-tos/environment-variables/best-practices/),
  [docs.docker.com — environment variables precedence](https://docs.docker.com/compose/how-tos/environment-variables/envvars-precedence/) —
  Compose's `env_file:` vs. auto-loaded project-root `.env` distinction,
  file-based `secrets:` mechanism, and Docker's own recommendation to keep
  secrets outside the repo.
- [tanstack.com/start — environment variables](https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables) —
  TanStack Start's `.env`/`.env.local`/`.env.development`/`.env.production`
  loading order and Vite's `VITE_` client-exposure prefix.
- [docs.github.com — secure use reference](https://docs.github.com/en/actions/reference/security/secure-use),
  [docs.github.com — GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token) —
  confirms fork-PR `pull_request` runs don't receive repository secrets,
  and `GITHUB_TOKEN`'s automatic per-run nature.
