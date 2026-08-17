import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { JumpToPage } from './reader-jump'
import {
  ReaderJumpProvider,
  useReaderJump,
  useRegisterReaderJump,
} from './reader-jump'

/**
 * The channel itself, with a probe at each end: a "reader" that registers a
 * handle and a "list" that calls the jump. What matters is the lifecycle — a
 * call lands on whatever is registered *now*, not on whatever was registered
 * when the caller first rendered, and a departed reader takes its handle with
 * it rather than leaving a call into an unmounted component.
 */

function Reader({ handle }: { handle: JumpToPage }) {
  useRegisterReaderJump(handle)
  return null
}

/** Hands the jump out so the test can call it like the list would. */
function List({ grab }: { grab: (jump: JumpToPage) => void }) {
  grab(useReaderJump())
  return null
}

describe('reader jump', () => {
  it('carries a jump from the list to the registered reader', () => {
    const handle = vi.fn()
    let jump: JumpToPage = () => {}

    render(
      <ReaderJumpProvider>
        <Reader handle={handle} />
        <List
          grab={(j) => {
            jump = j
          }}
        />
      </ReaderJumpProvider>,
    )

    jump(4)

    expect(handle).toHaveBeenCalledWith(4)
  })

  it('does nothing, quietly, while no reader is mounted', () => {
    // The list can exist before the paper has loaded — the rail renders as soon
    // as the route matches — and a jump then must be a no-op, not a crash.
    let jump: JumpToPage = () => {}

    render(
      <ReaderJumpProvider>
        <List
          grab={(j) => {
            jump = j
          }}
        />
      </ReaderJumpProvider>,
    )

    expect(() => jump(2)).not.toThrow()
  })

  it('withdraws the handle when the reader unmounts', () => {
    // Navigating off the article unmounts the reader; a jump grabbed earlier
    // must not call into the component that left.
    const handle = vi.fn()
    let jump: JumpToPage = () => {}

    const { rerender } = render(
      <ReaderJumpProvider>
        <Reader handle={handle} />
        <List
          grab={(j) => {
            jump = j
          }}
        />
      </ReaderJumpProvider>,
    )
    rerender(
      <ReaderJumpProvider>
        <List
          grab={(j) => {
            jump = j
          }}
        />
      </ReaderJumpProvider>,
    )

    jump(4)

    expect(handle).not.toHaveBeenCalled()
  })

  it('reaches a reader that registered after the jump was grabbed', () => {
    // The list holds one stable function for its whole life; the reader comes
    // and goes underneath it. This is the case the ref exists for.
    const handle = vi.fn()
    let jump: JumpToPage = () => {}

    const { rerender } = render(
      <ReaderJumpProvider>
        <List
          grab={(j) => {
            jump = j
          }}
        />
      </ReaderJumpProvider>,
    )
    rerender(
      <ReaderJumpProvider>
        <List
          grab={(j) => {
            jump = j
          }}
        />
        <Reader handle={handle} />
      </ReaderJumpProvider>,
    )

    jump(7)

    expect(handle).toHaveBeenCalledWith(7)
  })

  it('is a no-op with no provider at all, at both ends', () => {
    // A unit test rendering one half alone is exactly this situation, and so is
    // the reader whenever no list cares — see the module comment.
    const handle = vi.fn()
    let jump: JumpToPage = () => {}

    expect(() =>
      render(
        <>
          <Reader handle={handle} />
          <List
            grab={(j) => {
              jump = j
            }}
          />
        </>,
      ),
    ).not.toThrow()
    expect(() => jump(1)).not.toThrow()
  })
})
