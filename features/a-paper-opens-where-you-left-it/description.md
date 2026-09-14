# Feature: A Paper Opens Where You Left It

**#23** in [../index.md](../index.md). The last item of the user's reported list:

> automatically track what page the user is viewing, so that when opening up
> the article again, the article is loaded at that page.

## What it is

Every paper opens at page 1. Nothing records where a reader was — the only
browser-persisted state on the site is the theme, and no column or research doc
mentions a reading position (research §1).

## What it delivers

- **The reader remembers where you were**, as you read — the page at the top of
  the view and how far down it, saved to your account.
- **Opening the paper again returns there**, on any device: stop on the phone,
  reopen on the desktop at the same paragraph, at whatever zoom that screen
  uses.
- **An open reader is never moved** by a position saved somewhere else.

## Decided with the user (2026-09-14)

| Question | Decision |
|---|---|
| where it is kept | **synced to the account** — two columns on `articles`, like reading status |
| how precisely | **the same spot on the page** — page plus offset in page points, not just the page |
| sync while reading | **applied only when the reader opens** — never while it is open |

## What it does not do

- **No "resume" prompt or indicator.** The paper simply opens where it was.
- **No reading history or progress bar.** One position per article.
- **No per-device positions.** The last place read, on any device, wins.
- **Does not change what "reading status" means.** Reading does not mark a paper
  `reading`; that stays the reader's choice.

## Exit state

Closing a paper mid-way and opening it again — later, or on another device —
puts the reader back on the paragraph they left.
