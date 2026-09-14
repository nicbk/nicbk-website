# Testing: Unchanged Papers Answer 304

As the feature's [testing.md](../../testing.md), which lists every case. The
checks that prove the tests themselves:

- **Move the revalidation ahead of the ownership check** — the "matching tag,
  another user's article" and "matching tag, no session" tests must fail.
- **Remove the 304 translation in storage** — the endpoint's 304 test with the
  SDK's thrown shape must fail with a 500.
- **Drop the conditional from `GetObjectCommand`** — the integration 304 test
  must fail.

Browser, local Chrome: open a paper; note `transferSize`; navigate to the
collection and back; the second entry for the PDF URL must be a few hundred
bytes, and the paper must render. Reload the page before the check.
