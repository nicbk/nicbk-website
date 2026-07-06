# Blob Storage

Researched: 2026-07-02. Decided: 2026-07-02.

## Decision

**Garage**, chosen over SeaweedFS. Fits the project's scale as a simple,
self-hosted, S3-shaped binary; open source and not dependent on
commercializing the same artifact being run.

For storing uploaded PDFs and other files, shared across sub-applications
(see [DESIGN.md](../../high-level-guidance/design/DESIGN.md)).

## Important: MinIO is no longer a safe default

Training-knowledge instinct would reach for MinIO first, but **MinIO
discontinued its open-source Community Edition in 2025, and its GitHub
repository was archived (read-only, no new commits/PRs/issues) on
2026-02-14.** MinIO should not be used going forward. This is a concrete
example of why this project's research must come from live web search
rather than built-in knowledge (see [AGENTS.md](../../AGENTS.md)).

## Options

**SeaweedFS**
- Written in Go, Apache 2.0 license, 12+ years of active development.
- Considered the most production-mature of the remaining S3-compatible
  options; strong small-file performance (handles billions of small files).
- Uses erasure coding is NOT default — uses replication for fault
  tolerance in typical setups (see storage-efficiency note below).

**Garage**
- Purpose-built for distributed/geo-redundant object storage — a use case
  MinIO and SeaweedFS don't handle as well.
- Described as a small, "boring", S3-shaped binary; works well on modest
  hardware (NAS, small VPS, etc.).
- Open source, built by an entity (Deuxfleurs) whose survival doesn't
  depend on commercializing the same project.

**Storage efficiency tradeoff**
- MinIO's erasure coding (e.g. 4+2) tolerates losing 2 of 6 nodes at ~1.5x
  storage overhead. SeaweedFS and Garage rely on replication instead,
  which is simpler operationally but needs ~3x storage for comparable
  fault tolerance. Given MinIO is now off the table, this tradeoff is
  largely moot unless erasure coding becomes a hard requirement later.

## Recommendation signal from research

Multiple 2026 sources converge on **Garage or SeaweedFS** as the safe
choices for new self-hosted S3-compatible storage, specifically because
neither depends on extracting commercial revenue from the same open-source
artifact being run (unlike MinIO's now-defunct OSS edition).

## Sources

- [Self-Hosted S3-Compatible Object Storage: MinIO vs SeaweedFS vs Garage 2026](https://www.pistack.xyz/posts/2026-05-03-self-hosted-s3-object-storage-minio-seaweedfs-garage-guide/)
- [Self-hosted S3 after MinIO: lightweight alternatives for 2026](https://productimpossible.com/articles/self-hosted-s3-after-minio/)
- [Self-Hosted S3 Storage in 2026: RustFS, SeaweedFS, Garage, or Ceph?](https://rilavek.com/resources/self-hosted-s3-compatible-object-storage-2026)
- [Self-Hosted Object Storage in 2026: SeaweedFS, Garage, and Why MinIO is Done](https://www.offshoreserverhosting.com/blog/self-hosted-object-storage-2026-seaweedfs-garage-minio-replacement/)
- [Best Open Source Alternatives to AWS S3 2026](https://ossalt.com/guides/aws-s3-minio-garage-seaweedfs-2026)
