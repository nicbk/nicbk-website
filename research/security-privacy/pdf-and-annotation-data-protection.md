# PDF & Annotation Data Protection

Researched: 2026-07-05. Decided: 2026-07-05.

How uploaded PDFs and their annotations (Academic Literature Tracker, see
[../../high-level-guidance/design/lit-tracker/DESIGN.md](../../high-level-guidance/design/lit-tracker/DESIGN.md))
are protected at rest and in access, given Garage as the already-decided
blob store and the multi-tenant `user_id` scoping already enforced in
[../system-architecture/data-sharing-boundaries.md](../system-architecture/data-sharing-boundaries.md).

## Decision

- **At-rest encryption: host-level LUKS on the Garage storage partition,
  not app-level or Garage-native encryption.** Garage has no server-side
  encryption for standard S3 API calls (only SSE-C, which requires the
  client to supply a key per request); its own documentation recommends
  LUKS-encrypted partitions as the general answer.
- **All PDF reads and writes are proxied through the app server — no
  presigned/signed Garage URLs are issued to clients.** The app server
  authenticates the request and checks `user_id` ownership before
  streaming the object to or from Garage.
- **Annotations need no new mechanism.** They already live in Postgres and
  already inherit the existing `user_id`-scoped enforcement in the app
  server's `/query`/`/mutate` handlers — this topic only concerns the PDF
  binary itself.

## Reasoning

- Proxying through the app server keeps file-access authorization in the
  same place that already enforces it for every other piece of user data
  (the `/query`/`/mutate` handlers), rather than introducing a second,
  bearer-token-style trust model — a presigned URL grants access to
  anyone holding it until expiry, independent of the app server's own
  authorization checks.
- Presigned URLs exist primarily to offload download bandwidth from an
  application server at scale; this project's traffic is personal-scale,
  so that benefit doesn't apply here, while the single-choke-point
  correctness benefit of proxying does.
- Client-side (pre-upload) encryption was considered as a stronger
  alternative to LUKS, since it's Garage's own documented escape hatch for
  projects wanting true at-rest confidentiality independent of the host —
  but it adds real complexity (key management, no server-side full-text
  extraction without decrypting first, which conflicts with this
  sub-app's GROBID metadata-extraction feature) with no threat this
  project currently needs to defend against beyond physical host
  compromise, which LUKS already covers.

## Sources

- [Encryption | Garage HQ](https://garagehq.deuxfleurs.fr/documentation/cookbook/encryption/) —
  Garage's own recommendation of LUKS at-rest encryption and SSE-C support.
- [List of Garage features](https://garagehq.deuxfleurs.fr/documentation/reference-manual/features/) —
  confirms no native server-side encryption beyond SSE-C.
- [S3 Compatibility status | Garage HQ](https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/) —
  Garage's S3 API compatibility surface.
- [Securing S3 Objects: Backend Proxy vs Gateway Auth vs Presigned URLs](https://georg-schwarz.com/blog/securing-s3-objects-backend-proxy-gateway-auth-presigned-urls/) —
  comparison of the access-pattern options, informing the proxy decision.
- [S3 Uploads — Proxies vs Presigned URLs vs Presigned POSTs](https://zaccharles.medium.com/s3-uploads-proxies-vs-presigned-urls-vs-presigned-posts-9661e2b37932) —
  further tradeoffs between proxying and presigned URLs.
