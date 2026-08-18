# Feature: Reader Touch and Gestures

**#12 in [../index.md](../index.md).** The reader learns the gestures its
readers already know.

Feature #9 built a PDF reader with its own toolbar, its own marks, and its own
sidebar — and every one of those was driven by a mouse. Using it on a laptop
trackpad and on a phone found the gap: the reader responds to clicks and to its
own controls, and to almost nothing else a hand does.

## What it does

- **Pinch to zoom, on a trackpad and on a touchscreen.** Today a trackpad pinch
  falls through to the browser and zooms the whole page — chrome, sidebar and
  all — instead of the paper.
- **Scroll the paper by dragging one finger.** Today a touch drag starts a text
  selection and the page does not move, which makes the reader unusable on a
  phone for the one thing a reader mostly does.
- **Put a mark down by clicking away from it, without drawing another one.**
  Today, with a tool still active, that click both deselects the mark and stamps
  a new one where the reader clicked.

## What it does not do

- **No new marks, no new tools, no new stored data.** Nothing here changes the
  `annotations` table, its mutators, or the sync bridge.
- **No change to what the toolbar offers.** The zoom controls, the tool menu and
  the page field stay exactly as #9 left them; this adds ways to reach the same
  state, not new state.
- **No mobile redesign.** The reader already lays out correctly at 420px
  (verified through #9's browser passes). This is about input, not layout.
- **No keyboard shortcuts beyond what exists.** ⌘C and Escape are what #9
  decided; nothing here adds a shortcut vocabulary.

## Why it is a feature and not a bug list

Three symptoms, three causes, one subsystem — and one of them is a **regression
against a decided rule** rather than a missing capability:
`research/ui-ux/design-system.md` decided on 2026-08-09 that hiding scrollbars
leaves scrolling itself untouched, "wheel, trackpad, keyboard, and touch all
work". In the reader, touch does not. Fixing that is not polish; it is restoring
a property the design system already claims the site has.

## Exit state

A reader can pick up a phone, scroll the paper with a thumb, pinch to zoom in on
a figure, and long-press to select a passage to copy — and on a laptop, pinch
the trackpad to zoom the paper rather than the page. A mark is put down by
clicking away from it, and clicking away leaves the paper as it was.
