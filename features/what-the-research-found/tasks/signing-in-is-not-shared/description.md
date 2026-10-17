# Task: Signing In Is Not Shared

Task 1 of 2 of [#31](../../description.md); F1. Sub-issue [#263](https://github.com/nicbk/nicbk-website/issues/263).

`createAuth` sets `advanced.ipAddress.disableIpTracking`. Behind the relay,
every client has the relay's address, so Better Auth's per-IP rate limits are
one site-wide limit. The comment names the way back: real client addresses
(H2), then `trustedProxies`.
