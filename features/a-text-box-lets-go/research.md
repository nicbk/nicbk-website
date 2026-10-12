# Research: A Text Box Lets Go

Measured 2026-10-11, before the spec was written. Neither research document
below has anything to decide here: the change keeps every decided behaviour of
the reader's pointer handling and adds one it never had.

## Traceability

- `research/ui-ux/pages/lit-tracker/components/reader-annotation.md`: the text
  box is one of the decided tools, and a mark is movable once selected.
- `features/reader-touch-and-gestures/` (#12): a finger's press is judged at its
  end, and a scroll leaves what was selected alone. This feature applies the same
  rule to the note being written.
- `features/a-note-fits-the-margin/` (#24): the margin text box most notes are.

## 1. The defect, reproduced

Chromium, the signed-in e2e stack, a three-page PDF. *text box*, click the left
margin, type, click the bare paper at the right of the same page:

| | before | with the press reaching the page element |
|---|---|---|
| what the press landed on | `IMG[data-paper]` | `DIV` (the page) |
| `[contenteditable="true"]` after | 1 | 0 |
| a 80px drag on the note moved it | **0px** (selected its text) | 77px |

The middle column is the defect. The right column was produced by a test-only
style rule, `[data-paper] { pointer-events: none }`, and it confirms the cause
below.

## 2. Where the engine ends an edit

`@embedpdf/plugin-annotation` 2.15.0, `dist/react/index.js`, the annotation
layer:

```js
const [editingId, setEditingId] = useState(null);
...
onPointerDown: (_, pe) => {
  if (pe.target === pe.currentTarget && annotationProvides) {
    if (editingId && annotations.some((a) => a.object.id === editingId)) {
      pe.stopImmediatePropagation();
    }
    annotationProvides.deselectAnnotation();
    setEditingId(null);
  }
}
```

The other two writers of `editingId` are a `create` event with
`editAfterCreate`, which is how the user's create-then-delete workaround escaped,
and a click on a *different* mark. The editing state is:

- **private** (component state, with no capability method);
- **per page** (one layer per page, each with its own handler);
- **reachable only through a press whose target is the page element itself.**

In this reader that last condition never holds. The paper image answers every
press on the page, which `blank-paper.ts` relies on. While editing, the box is
drawn `contenteditable`, takes pointer events, and the renderer's `isDraggable`
returns false.

Checked for an API to end an edit: 2.15.0 (installed), 2.15.1 (`latest`) and
3.0.0-next.14 (`next`). None has one.

## 3. Why the text has to be blurred

The `FreeText` renderer saves `contents` in its `onBlur` and nowhere else. A
mouse press elsewhere moves focus at the press's default action, before the
deferred end runs. A tap on a surface that cannot take focus need not move it,
and an element unmounted while focused never receives `blur`. So the hook blurs
it explicitly.

## 4. After the fix

The same stack, Chromium:

| away | editing after | drag moved | text after reload |
|---|---|---|---|
| bare paper, same page | 0 | 57px | kept |
| another page | 0 | 57px | kept |
| sidebar | 0 | 57px | kept |
| Escape | 0 | 57px | kept |
| touch tap (emulated) | 0 | n/a | kept |
| delete control while typing | n/a | n/a | note deleted |

## Sources

- `node_modules/@embedpdf/plugin-annotation/dist/react/index.js`: the layer's
  `editingId`, its pointer handler and the `FreeText` renderer, read directly.
- `npm view @embedpdf/plugin-annotation dist-tags`, and both tarballs unpacked
  and searched for an editing API.
