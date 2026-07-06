# Hosting and Infrastructure

Researched: 2026-07-04. Decided: 2026-07-04.

Where the single-node stack decided in
[../system-architecture/service-topology.md](../system-architecture/service-topology.md)
(app server, zero-cache, Postgres, Garage, GROBID) actually runs, and how
it's orchestrated — given pre-existing personal infrastructure (a NixOS
bare-metal home node, and an existing WireGuard mesh + EC2 relay for public
ingress) and this category's two guiding principles from
[index.md](./index.md): prefer open-source tooling, and minimize manual
configuration. Boundary notes: how each container image is actually built
belongs to [containerization-and-build.md](./containerization-and-build.md)
(not yet researched); how updates to the running stack are rolled out on
each merge belongs to
[deployment-strategy.md](./deployment-strategy.md) (not yet researched);
backup/upgrade responsibility for the now-containerized Postgres/Garage is
carried forward to
[backup-and-disaster-recovery.md](./backup-and-disaster-recovery.md) (not
yet researched).

## Decision

### Compute and network (pre-existing, not a new decision)

The stack runs on a NixOS bare-metal machine physically hosted at home.
Public ingress goes through an existing WireGuard mesh with a minimal,
non-NixOS EC2 relay (Amazon Linux 2): the EC2 box does a pure `nftables`
DNAT passthrough of ports 80/443 to the home node's WireGuard IP, with no
TLS or application logic on EC2 itself — it stays outside this project's
Nix-managed scope entirely, as a dumb relay.

### Service orchestration: one Docker Compose stack, run identically everywhere

All five services — Postgres, Garage, GROBID, the TanStack Start app
server, and Zero's zero-cache — are defined in a single `docker-compose.yml`
in this repo (a sixth, self-hosted GlitchTip for error tracking, was added
later — see
[monitoring-and-observability.md](./monitoring-and-observability.md) —
reusing this same Postgres instance rather than needing one of its own).
That one file is run with the same command in both environments:

- **Locally (macOS)**: `docker compose up`, via OrbStack as the local
  Docker runtime.
- **Production (NixOS)**: `virtualisation.docker.enable = true;` plus one
  small systemd unit that runs `docker compose -f <path> up -d` against the
  exact same file — no NixOS-native `services.postgresql` or
  `services.garage` modules are used, even though both exist and are
  mature.

This is a deliberate simplification, not a default: NixOS's own service
modules would have given Postgres/Garage some upgrade handling and
potential backup hooks "for free." Trading that away for one genuinely
unified local/prod definition means backup and upgrade responsibility for
containerized Postgres/Garage has to be explicitly designed, not assumed —
carried forward to `backup-and-disaster-recovery.md`.

**Why plain Compose, not Arion or NixOS-native modules:**
- **Arion** (a Nix-expression wrapper around Compose with a real NixOS
  module) was considered and rejected because its actual source of truth is
  a Nix expression that *generates* a compose file underneath — "one
  definition" would still mean two representations, plus a Nix/`arion` CLI
  dependency just to run locally on macOS. Plain Compose is the literal
  same file, same command, both places.
- **Coolify** (a generic self-hosted Docker PaaS, our first hypothesis
  before the home-NixOS-node constraint was known) was rejected specifically
  *for a NixOS host*: it keeps its own mutable state as the source of truth
  for services, which directly conflicts with NixOS's declarative-config
  model. No established pattern combines the two.
- **`compose2nix`** (generates NixOS `oci-containers` config from a compose
  file) was rejected as the production-side mechanism because it's a
  one-shot codegen step someone has to remember to re-run on every compose
  change — a bare systemd unit pointed at the same file avoids that
  bookkeeping entirely.

### Local hot-reload

The app server's source directory is bind-mounted into its container, and
the framework's own dev-server watch mode picks up edits made on the Mac.
Two fixes are required for this to actually work — not automatic:

1. **`CHOKIDAR_USEPOLLING=true`** in the compose environment. Docker bind
   mounts don't propagate host filesystem-change events into a container,
   so Vite's file watcher never sees an edit without polling — this applies
   even through OrbStack's VirtioFS-backed file sharing.
2. **TanStack-Start-specific**: the framework is built on vinxi, which
   historically doesn't expose Vite's HMR host/port options, so HMR can
   silently fail in a container even with polling fixed. The documented fix
   is to explicitly set `routers.client.vite.server.hmr.{host,port}` in
   `app.config.ts`.

This unification also makes the earlier `devenv`/`services-flake`/devshell
question moot: local service management is now just `docker compose up`,
the same command used in production — no separate process-manager layer is
needed.

### Open-source boundary: applies to the NixOS node, not the Mac

OrbStack (the local Docker runtime) is proprietary, and that's accepted:
the open-source-preference principle is scoped to what actually runs on
the NixOS production node, not personal local dev tooling on an already-
proprietary OS (macOS). Every service in the compose stack itself —
Postgres, Garage (AGPL-3.0), GROBID (Apache-2.0), the app server, zero-cache
— and the Docker Engine running them on the NixOS host are open source,
which is what the principle is actually protecting.

### What stays NixOS-native, outside the Compose stack

- **TLS/reverse proxy**: `services.caddy` + `security.acme` remain a
  NixOS-native, system-level concern rather than another container in this
  project's stack. Caddy is host-level ingress that may need to route to
  other things on the general-purpose home NixOS box beyond just this site,
  so it belongs to the general system flake's scope, not this project's own
  compose file. (Noted here as the working assumption — flag if this should
  instead be containerized alongside everything else.)
- **Config management / deployment plumbing**: this project's own
  `flake.nix` still exposes a `nixosModules.default`, consumed as a pinned
  flake input by the user's separate general system flake (same pattern
  regardless of what's inside the module). That module's job is now
  narrower than originally scoped: enabling Docker and wiring the one
  systemd unit that runs this repo's `docker-compose.yml`, rather than
  declaring `services.postgresql`/`services.garage` directly. Local
  iteration on that NixOS-level module (as opposed to app-level compose
  changes, which need no VM at all now) still uses a local-path flake-input
  override plus `nixos-rebuild build-vm`, or nix-darwin's `nix.linux-builder`
  or `nixosTest` for validating the wiring before a real
  `nixos-rebuild --target-host` deploy.

## Reasoning

This decision went through several revisions as constraints surfaced, each
one is worth recording since it explains why the final shape looks the way
it does:

1. Starting from a blank slate, the natural default was a generic
   self-hosted PaaS (Coolify) on a rented cloud VPS (Hetzner) — a reasonable
   answer to "where does an open-source, low-manual-config single-node
   stack run" in isolation.
2. That was entirely superseded once the actual compute was revealed to be
   fixed: an existing NixOS bare-metal home node. This made NixOS-native
   modules (`services.postgresql`, `services.garage`,
   `virtualisation.oci-containers` for GROBID) the natural first-pass
   answer, since they're idiomatic for a NixOS host and Coolify doesn't fit
   NixOS's declarative model.
3. That, in turn, was revised again once the user prioritized a single
   unified local/prod workflow with working hot-reload over NixOS purity —
   a real, explicitly-acknowledged tradeoff (giving up NixOS's native
   service modules) in exchange for genuinely one definition, one command,
   everywhere, which is what actually satisfies "minimal manual
   configuration" once local development is weighed as seriously as
   production.
4. The open-source-preference principle was scoped, by direct user
   clarification, to the NixOS production node rather than personal local
   tooling — avoiding an unproductive purity argument about macOS/OrbStack
   that wasn't what the principle was meant to protect.

## Sources

- [github.com/hercules-ci/arion](https://github.com/hercules-ci/arion),
  [docs.hercules-ci.com/arion](https://docs.hercules-ci.com/arion/),
  [arion nixos-module.nix](https://github.com/hercules-ci/arion/blob/main/nixos-module.nix) —
  Arion's Nix-expression-to-compose translation layer and NixOS module.
- [wiki.nixos.org/wiki/Docker](https://wiki.nixos.org/wiki/Docker/en) —
  running plain Docker/Compose on NixOS via `virtualisation.docker.enable`.
- [github.com/aksiksi/compose2nix](https://github.com/aksiksi/compose2nix) —
  compose-to-`oci-containers` codegen, and why its regeneration step was
  rejected here.
- [docs.orbstack.dev/docker](https://docs.orbstack.dev/docker/) — OrbStack's
  Docker Compose compatibility on macOS.
- [github.com/vitejs/vite issue #14004](https://github.com/vitejs/vite/issues/14004),
  [issue #18689](https://github.com/vitejs/vite/issues/18689) — Vite/chokidar
  file-watching not propagating across a bind-mounted container boundary
  without polling.
- [TanStack/router discussion #3147](https://github.com/TanStack/router/discussions/3147) —
  vinxi's HMR host/port limitation in containers and the
  `routers.client.vite.server.hmr` workaround.
- [mynixos.com — services.garage options](https://mynixos.com/nixpkgs/options/services.garage),
  [nixpkgs oci-containers.nix](https://github.com/NixOS/nixpkgs/blob/master/nixos/modules/virtualisation/oci-containers.nix) —
  the NixOS-native modules considered and ultimately not used, in favor of
  full containerization.
- [wiki.nixos.org/wiki/Caddy](https://wiki.nixos.org/wiki/Caddy),
  [aottr.dev — Caddy + ACME on NixOS](https://aottr.dev/posts/2024/08/homelab-setting-up-caddy-reverse-proxy-with-ssl-on-nixos/),
  [NixOS Discourse — ACME multi-domain](https://discourse.nixos.org/t/nixos-nginx-acme-ssl-certificates-for-multiple-domains/19608) —
  `security.acme` + `services.caddy` for multi-subdomain TLS.
- [medium.com — L4 vs L7 pass-through](https://medium.com/@shindevikram1210/load-balancing-prototype-l4-vs-l7-pass-through-vs-proxy-mode-docker-iptables-haproxy-nginx-9a34dd9afe5e),
  [loadbalancer.org — HAProxy/iptables/nftables](https://www.loadbalancer.org/blog/how-to-limit-connections-with-haproxy-or-iptables-nftables/) —
  choosing `nftables` DNAT over a proxy process for the EC2 passthrough.
- [wiki.nixos.org/wiki/Flakes](https://wiki.nixos.org/wiki/Flakes),
  [Xe Iaso — exposing NixOS modules from a flake](https://xeiaso.net/blog/nix-flakes-3-2022-04-07/),
  [Determinate Systems — extending NixOS configurations](https://determinate.systems/blog/extending-nixos-configurations/),
  [NixOS Discourse — passing through nixosModules](https://discourse.nixos.org/t/how-to-pass-through-nixosmodules-in-flakes/18064) —
  exposing this repo's `nixosModules.default` and consuming it as a flake
  input from a separate system flake.
- [flake.parts](https://flake.parts/),
  [vtimofeenko.com — flake-parts custom modules](https://vtimofeenko.com/posts/flake-parts-writing-custom-flake-modules/),
  [mccurdyc.dev (2026-02)](https://www.mccurdyc.dev/posts/2026/02/nix-flake-parts-flake-utils-or-neither/),
  [snowfall.org/reference/lib](https://snowfall.org/reference/lib/) — why a
  full composition framework (flake-parts, snowfall-lib) was skipped for a
  two-repo, one-module composition.
- [nixos.asia — local flake input override](https://nixos.asia/en/howto/local-flake-input),
  [nix.dev — nix3-flake manual](https://nix.dev/manual/nix/2.18/command-ref/new-cli/nix3-flake) —
  iterating on the NixOS-level module locally via a path-input override.
- [Tweag — NixOS VM on macOS](https://www.tweag.io/blog/2023-02-09-nixos-vm-on-macos/),
  [wiki.nixos.org — NixOS VMs on macOS](https://wiki.nixos.org/wiki/NixOS_virtual_machines_on_macOS),
  [NixOS Discourse — aarch64 build-vm](https://discourse.nixos.org/t/simulate-aarch64-linux-using-nixos-rebuild-build-vm-from-x86-64-linux/35923),
  [nixcademy — NixOS integration tests on macOS](https://nixcademy.com/posts/running-nixos-integration-tests-on-macos/),
  [nixpkgs darwin-builder docs](https://github.com/NixOS/nixpkgs/blob/master/doc/packages/darwin-builder.section.md) —
  validating the NixOS-level module via `nix.linux-builder`/`nixosTest`
  rather than a bare `build-vm` on Apple Silicon.
