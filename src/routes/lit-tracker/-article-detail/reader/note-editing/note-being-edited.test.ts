import { afterEach, describe, expect, it } from 'vitest'
import {
  noteBeingEdited,
  noteBeingEditedOn,
  READER_PAGE_ATTRIBUTE,
} from './note-being-edited'

/** A page as the reader renders it, holding whatever `inner` is. */
function page(pageIndex: number, inner: string): string {
  return `<div ${READER_PAGE_ATTRIBUTE}="${pageIndex}">${inner}</div>`
}

const EDITOR = '<div contenteditable="true">a note</div>'
const AT_REST = '<div contenteditable="false">a note</div>'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('noteBeingEdited', () => {
  it('finds the editor and the page it is on', () => {
    document.body.innerHTML = page(0, AT_REST) + page(2, EDITOR)
    const note = noteBeingEdited(document)
    expect(note?.pageIndex).toBe(2)
    expect(note?.editor.textContent).toBe('a note')
  })

  it('finds nothing when every note is at rest', () => {
    document.body.innerHTML = page(0, AT_REST)
    expect(noteBeingEdited(document)).toBeNull()
  })

  // A rich-text field elsewhere on the site is not a note on the paper.
  it('ignores an editable element outside the reader’s pages', () => {
    document.body.innerHTML = EDITOR + page(0, AT_REST)
    expect(noteBeingEdited(document)).toBeNull()
  })
})

describe('noteBeingEditedOn', () => {
  it('answers for the page asked about and no other', () => {
    document.body.innerHTML = page(1, EDITOR) + page(3, AT_REST)
    expect(noteBeingEditedOn(document, 1)).not.toBeNull()
    expect(noteBeingEditedOn(document, 3)).toBeNull()
  })

  // Page 1 must not answer for page 11 — the attribute is matched exactly.
  it('does not match a page whose index merely starts the same', () => {
    document.body.innerHTML = page(11, EDITOR)
    expect(noteBeingEditedOn(document, 1)).toBeNull()
  })
})
