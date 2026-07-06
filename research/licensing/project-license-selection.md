# Project License Selection

Decision: **Apache-2.0** for this project's own source code.

## Garage/AGPL-upward-pull: ruled out

[dependency-license-audit.md](./dependency-license-audit.md) deferred one
question here: whether Garage's AGPLv3 license could reach upward and
impose obligations on this project's own code. Checked
[../system-architecture/service-topology.md](../system-architecture/service-topology.md)
and all of `high-level-guidance/`: Garage is accessed only through its
standard S3-compatible API, runs single-node and unmodified, and no
plugin/extension model anywhere in the design touches its internals — per
[../devops-deployment/hosting-and-infrastructure.md](../devops-deployment/hosting-and-infrastructure.md)
it's its own container in the unified `docker-compose.yml`. AGPL's
copyleft obligation attaches to modifications of Garage's own source made
available over a network; since nothing here modifies Garage, it does not
reach this project's application code. No copyleft obligation flows
upward under the current or planned design.

## Why Apache-2.0 over MIT or copyleft

Given the repo is already public (per
[../devops-deployment/ci-pipeline.md](../devops-deployment/ci-pipeline.md)),
the choice is which permissive-vs-copyleft license to put on it:

| Candidate | Patent grant | Fit |
|---|---|---|
| MIT | No | Simplest, most common for personal/portfolio repos |
| **Apache-2.0** | Yes (explicit grant + litigation-termination clause) | Same permissiveness as MIT, plus a patent grant, and already the license on 4 of this project's own dependencies (Zero, GROBID, Caddy, Sysbox) |
| GPL/AGPL (copyleft) | N/A | No rationale — copyleft exists to force downstream modifications to stay open, which doesn't serve a personal blog/portfolio site's goals |

Apache-2.0 wins: equally permissive as MIT for reuse/forking, adds a
patent grant at no practical cost, and gives one consistent license
convention across "code written for this project" and "code most directly
depended on" rather than mixing two permissive licenses. Apache-2.0 and
MIT dependencies combine cleanly regardless of which is chosen, so this is
a preference pick, not a compatibility requirement.

## Implementation (not a decision factor)

Root-level `LICENSE` file with the full Apache-2.0 text, plus an SPDX
identifier (`"license": "Apache-2.0"`) in `package.json`.
