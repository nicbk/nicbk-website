# Feature: Article Detail and Reader

The Lit Tracker's **reading slice**. #7 made the tracker able to take an
article; #8 made it able to hold one. This makes it able to *read* one — which
is the thing the tracker was built for. Every surface up to now has described
papers from the outside: a title, some authors, a year. This is the first that
opens the PDF.

It is also the first feature that gives an article **a page of its own**. #8's
cards deliberately do not navigate, because their decided click target did not
exist yet; this feature builds that target and turns the card into a link.

The user-visible slice: a signed-in user clicks a card and lands on the paper —
its metadata across the top, the PDF filling the page, a sidebar for its tags
and their own notes. They highlight a passage, circle a figure, leave a sticky
note on the derivation they want to come back to, and every mark is saved as it
is made and is on the paper when they open it on another machine. The
Annotations tab lists what they have marked, and clicking a row jumps the reader
to that page.

Concretely, this feature produces:

- The **article detail route** `/lit-tracker/$articleId` — the metadata summary,
  the tabbed sidebar, and the responsive drawer that sidebar becomes on a narrow
  screen, all inside the app shell #7 built.
- An **authorized PDF-serving route**. The bytes have been in Garage since #7
  and nothing has ever read them back. Per the decided data-protection rule, the
  file is streamed through this server after an ownership check — no presigned
  URL is ever issued.
- The **PDF reader**: EmbedPDF's headless build mounted client-only, with the
  decided persistent toolbar — annotation tools, page navigation, zoom.
- The **`annotations` table** and its mutators — the second synced table a
  *client* writes, and the first whose rows are created by dragging rather than
  by clicking.
- The **Notes field**, a free-text summary per article, writing to the
  `articles.notes` column #7 created and nothing has used since.
- The **Annotations tab**: this article's marks as a list, each a way back into
  the page it lives on.

What it deliberately leaves alone: the **Citations tab**, which the decided page
spec places fourth in that sidebar. It activates the citation graph, and the
citation graph is #10 — so #9 builds the sidebar with three tabs and #10 adds
the fourth alongside the view it opens. Nothing throwaway gets built, and the
Semantic Scholar attribution the detail page owes travels with the S2-derived
data that triggers it.
