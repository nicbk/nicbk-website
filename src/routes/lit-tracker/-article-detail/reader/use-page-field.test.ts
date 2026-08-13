import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { parsePageInput, usePageField } from './use-page-field'

/**
 * The page field's two jobs: reading a number a human typed, and knowing when
 * the document is allowed to overwrite it.
 *
 * The second is the one worth the file. Bound naively, typing "12" into a paper
 * showing page 3 is reverted by the next scroll event — and on a trackpad
 * something is always scrolling.
 */

describe('parsePageInput', () => {
  it('reads a plain page number', () => {
    expect(parsePageInput('7', 15)).toBe(7)
  })

  it('ignores space around it, which is what a paste brings', () => {
    expect(parsePageInput('  7 ', 15)).toBe(7)
  })

  it('clamps past the end rather than refusing', () => {
    // Someone who types 900 into a 15-page paper means the end of it. Rejecting
    // the input would leave them looking at a field that ignored them.
    expect(parsePageInput('900', 15)).toBe(15)
  })

  it('clamps zero up to the first page', () => {
    expect(parsePageInput('0', 15)).toBe(1)
  })

  it('rejects what is not a number at all', () => {
    // Each of these is a case `Number()` alone gets wrong: '' is 0, '3px' is
    // NaN, and '3.5'/'-2' parse to numbers that are not pages.
    expect(parsePageInput('', 15)).toBeNull()
    expect(parsePageInput('abc', 15)).toBeNull()
    expect(parsePageInput('3px', 15)).toBeNull()
    expect(parsePageInput('3.5', 15)).toBeNull()
    expect(parsePageInput('-2', 15)).toBeNull()
  })
})

describe('usePageField', () => {
  function setup(currentPage = 1, totalPages = 15) {
    const onCommit = vi.fn()
    const view = renderHook(
      ({ page }: { page: number }) =>
        usePageField({ currentPage: page, totalPages, onCommit }),
      { initialProps: { page: currentPage } },
    )
    return { ...view, onCommit }
  }

  it('shows the page the document is on', () => {
    const { result } = setup(3)

    expect(result.current.value).toBe('3')
  })

  it('follows the document while the reader is not typing', () => {
    // This is what makes the indicator track scrolling rather than only clicks.
    const { result, rerender } = setup(3)

    rerender({ page: 4 })

    expect(result.current.value).toBe('4')
  })

  it('does not overwrite what is being typed', () => {
    // The defect this hook exists for. A scroll arriving mid-entry must not
    // reset the field to the page in view.
    const { result, rerender } = setup(3)

    act(() => result.current.onChange('12'))
    rerender({ page: 4 })

    expect(result.current.value).toBe('12')
  })

  it('commits what was typed and hands the field back', () => {
    const { result, onCommit } = setup(3)

    act(() => result.current.onChange('12'))
    act(() => result.current.onEnter())

    expect(onCommit).toHaveBeenCalledWith(12)
  })

  it('resumes following the document once committed', () => {
    const { result, rerender, onCommit } = setup(3)

    act(() => result.current.onChange('12'))
    act(() => result.current.onEnter())
    onCommit.mockClear()
    rerender({ page: 12 })

    expect(result.current.value).toBe('12')
    rerender({ page: 13 })
    expect(result.current.value).toBe('13')
  })

  it('commits on blur too, for a reader who clicks away instead of pressing enter', () => {
    const { result, onCommit } = setup(3)

    act(() => result.current.onChange('9'))
    act(() => result.current.onBlur())

    expect(onCommit).toHaveBeenCalledWith(9)
  })

  it('reverts rather than committing when what was typed is not a page', () => {
    const { result, onCommit } = setup(3)

    act(() => result.current.onChange('abc'))
    act(() => result.current.onEnter())

    expect(onCommit).not.toHaveBeenCalled()
    // Handed back to the document, which puts the real page back for free.
    expect(result.current.value).toBe('3')
  })

  it('does not jump to the page it is already on', () => {
    // A committed no-op would still scroll the document to the top of the
    // current page, moving the paper under someone who changed nothing.
    const { result, onCommit } = setup(3)

    act(() => result.current.onFocus())
    act(() => result.current.onEnter())

    expect(onCommit).not.toHaveBeenCalled()
  })
})
