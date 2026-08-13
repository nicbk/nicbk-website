# App Security Headers

Researched: 2026-07-05. Decided: 2026-07-05.

Response-header-level hardening for the TanStack Start app server, given
TLS itself is already handled by Caddy in front of it (see
[../devops-deployment/hosting-and-infrastructure.md](../devops-deployment/hosting-and-infrastructure.md)),
and building on the syntax-highlighting/`Callout` decisions in
[../documentation-content-conventions/mdx-authoring-conventions.md](../documentation-content-conventions/mdx-authoring-conventions.md).

## Decision

- **HSTS is set at Caddy, not the app** (`header_down
  Strict-Transport-Security "max-age=31536000; includeSubDomains"`) — the
  conventional single point for it, since Caddy already terminates TLS and
  passes other headers through untouched.
- **All other headers — CSP, `X-Content-Type-Options`,
  `frame-ancestors`, `Referrer-Policy`, `Permissions-Policy` — are set via
  a small hand-rolled TanStack Start global request middleware.** Helmet
  was considered and rejected: it assumes Express-style direct
  response-object access, which TanStack Start's middleware model doesn't
  expose the same way.
- **CSP uses TanStack Start's built-in nonce support** for `script-src`,
  rather than `unsafe-inline` — the framework auto-attaches a nonce to
  resources that need one and appends the CSP header itself.
- **A strict starting policy, validated in Report-Only mode first:**
  `default-src 'self'; script-src 'self' 'nonce-<generated>'; style-src
  'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none';
  base-uri 'none'; form-action 'self'`, plus `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a
  conservative `Permissions-Policy` disabling unused browser features
  (camera/microphone/geolocation, etc.) unless a specific sub-app needs
  one.

## Amendment (2026-08-13): what the PDF reader needs from the policy

The starting policy above **blocks the Lit Tracker's PDF reader outright**, in
three separate ways. Nothing is broken today — no middleware implements any of
these headers yet — but whoever writes it will take the reader down unless the
policy accounts for the following. Found while building #9's reader
(`features/article-detail-and-reader/tasks/pdf-reader/`), by reading EmbedPDF's
published source rather than by hitting it in production.

- **`script-src` needs `'wasm-unsafe-eval'`.** The reader's engine is PDFium
  compiled to WebAssembly. A bare `script-src 'self'` blocks WebAssembly
  compilation entirely in Chrome; `'wasm-unsafe-eval'` is the narrow grant that
  permits compiling and instantiating wasm without permitting `eval`.
- **`worker-src` needs `'self' blob:`.** The engine runs PDFium in a Web Worker
  it constructs from a `blob:` URL (`URL.createObjectURL` over an inlined worker
  source, in `@embedpdf/engines`). `default-src 'self'` blocks that. The only
  alternative is running the engine on the main thread, which puts PDF rendering
  in front of every interaction.
- **`img-src` needs `'self' blob:`.** Rendered pages are handed to an `<img>` as
  object URLs, so every page of every document is a `blob:` image.
- **`connect-src 'self'` is sufficient, and only because the wasm is
  self-hosted.** EmbedPDF's default fetches its 4.6 MB binary from
  `cdn.jsdelivr.net`; the reader overrides that with a Vite-emitted asset from
  this origin, for the same reason the site self-hosts its fonts. Its optional
  font fallback — also a CDN — is explicitly disabled. **If either is ever
  allowed to fall back to the default, this policy has to grow a CDN origin**,
  and a reading tool starts telling a third party which papers are being read.

The general point, which outlives these four bullets: **a strict CSP is a
constraint on what libraries may be adopted, not only on how they are
configured.** A dependency that builds workers from blobs, compiles wasm, or
loads its own assets from a CDN is making policy decisions on this project's
behalf, and the time to find that out is while choosing it.

## Reasoning

- Setting HSTS once at Caddy rather than duplicating it at the app avoids
  two independently-maintained copies of the same header value —
  consistent with [AGENTS.md](../../AGENTS.md)'s "Avoid duplication"
  principle, and Caddy is already the layer that knows about TLS.
- A hand-rolled middleware over Helmet was chosen for fit, not
  preference: Helmet's API is built around Express's response object,
  which doesn't map cleanly onto TanStack Start's middleware model — a
  small explicit middleware is both the documented path and avoids
  fighting a library against a framework it wasn't built for.
- A strict `style-src 'self'` (no `unsafe-inline`) is achievable, not just
  aspirational, specifically because of a decision already made
  elsewhere: `rehype-pretty-code`'s Shiki output styles code blocks via
  data attributes and CSS custom properties consumed by an external CSS
  Module, not inline `style="..."` attributes. If a future MDX feature
  ever needed genuine inline styles, this policy would need revisiting —
  worth flagging so that tradeoff isn't made silently.
- CSP is recommended in Report-Only mode first, per OWASP's own rollout
  guidance, because the exact nonce wiring through TanStack Start's SSR
  pipeline needs verifying against a real build rather than assumed
  correct from documentation alone.

## Sources

- [Configuring Content Security Policy (CSP) in TanStack Start](https://www.vseventer.com/blog/configuring-content-security-policy-csp-in-tanstack-start) —
  TanStack Start's built-in CSP nonce support.
- [How to setup csp and global headers with tanstack start? — TanStack/router #3028](https://github.com/TanStack/router/discussions/3028) —
  confirms the global-middleware approach and Helmet's fit mismatch.
- [Middleware | TanStack Start React Docs](https://tanstack.com/start/v0/docs/framework/react/guide/middleware) —
  TanStack Start's request middleware model.
- [Content Security Policy - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) —
  baseline policy directives and the Report-Only rollout recommendation.
- [Rehype Pretty Code](https://rehype-pretty.pages.dev/) — confirms
  data-attribute/CSS-variable-based styling output, not inline styles.
- [Code Highlighting - shikijs/rehype (velite.js.org)](https://velite.js.org/guide/code-highlighting) —
  further confirmation of Shiki's non-inline-style output.
- [How to use HSTS for proxied http server — Caddy Community](https://caddy.community/t/how-to-use-hsts-for-proxied-http-server/5301) —
  setting HSTS at the Caddy layer for a proxied app.
- [header (Caddyfile directive) — Caddy Documentation](https://caddyserver.com/docs/caddyfile/directives/header) —
  the `header_down` directive syntax used above.
- For the 2026-08-13 amendment:
  [MDN — CSP `script-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src)
  and [WebAssembly/content-security-policy#7](https://github.com/WebAssembly/content-security-policy/issues/7)
  — `'wasm-unsafe-eval'`, and that a bare `script-src 'self'` blocks
  WebAssembly. The `blob:` worker, the `blob:` page images and the default CDN
  wasm URL were read directly out of the installed `@embedpdf/engines` and
  `@embedpdf/plugin-render` packages at 2.15.0, and confirmed against a
  production build's network log.
