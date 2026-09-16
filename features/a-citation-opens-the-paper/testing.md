# Testing: A Citation Opens the Paper

## Unit

- **The TEI parser** keeps each entry's page and rectangles, including an entry
  whose boxes span four lines, and yields nothing for an entry GROBID located no
  coordinates for.
- **The matching rule** (task 2): the region inside an entry's boxes matches it;
  a region on another page does not; a region overlapping two entries matches
  neither; a region overlapping none matches none; an edge with no regions is
  never matched.
- **The preview action** (task 3): shown only when the match has a
  `citedArticleId`; absent for an unmatched region, for an edge with no article,
  and for a non-reference link. The link it renders carries the hop, and drops
  `view`.

## Integration

- **The bibliography writer** stores regions for a TEI with coordinates and null
  for one without, and the re-read rewrites them without touching the fields it
  is barred from (#10's list).

## Browser

| Check | Where |
|---|---|
| a stored rectangle and the previewed region for the same reference agree (criterion 4) | Chrome, local |
| a citation to a paper in the collection: the action, and what it opens | Chrome, local |
| the path shows the hop, and a revisit cuts it back | Chrome, local |
| a citation to a paper not in the collection: no action | Chrome, local |
| a table or section link: no action | Chrome, local |
| the re-read fills older papers in, with its summary row | Chrome, local |
| the whole flow | Safari, `nicbk.com` after deploy |

Reload before every check.
