# Feature: Tracker Navigation Latency

**#13** in [../index.md](../index.md). Taking the round trip out from in front of
every move inside the Lit Tracker.

## What it is

Every client-side navigation within `/lit-tracker` waits for a network round
trip that re-answers a question the browser already had: *who is this?* The
destination route cannot begin until it returns.

The guard is attached at the group root, so it covers every tracker page —
which is the right design, and is also why the cost is paid on every move
between them: opening an article from the collection, going back, opening the
next one.

## Why it is worth a feature

Because it is the last of the five things the user reported on 2026-08-17 after
using the finished tracker, and the only one still standing. The other four
became #12 and #14, both complete.

And because the cost is structural rather than incidental: **the work is
~15 ms and the wait is ~120 ms.** Validating the session against the database
is fast; the trip to ask is not. No amount of making the query faster would
help.

## What it delivers

- **A session resolved once per page load**, and read from memory for every
  navigation after it — decided with the user on 2026-09-12.
- **No change to what protects data.** The guard decides whether to render the
  tracker or redirect to sign-in; every byte of user data is authorized
  separately, server-side, from the request's own cookie.

## What it does not do

- **No change to the guard's decision.** `requireSession` — signed in, hand the
  session back; signed out, redirect carrying the destination — is #6's and is
  not revisited.
- **No new caching layer for anything else.** This caches one answer, in one
  place, for one document's lifetime.
- **No server-side cache.** Stated in the negative because the opposite would be
  a security defect rather than a slower version: see
  [constraints-and-behavior.md](./constraints-and-behavior.md).

## Exit state

A reader opens an article from their collection and the page begins loading
immediately, rather than after a round trip to ask a question the browser had
already answered on the way in.
