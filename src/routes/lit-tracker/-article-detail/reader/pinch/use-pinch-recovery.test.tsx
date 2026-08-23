import type {
  SelectionCapability,
  SelectionRangeX,
} from '@embedpdf/plugin-selection'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePinchRecovery } from './use-pinch-recovery'

/**
 * Undoing what the first finger did before anyone knew it was half of a pinch.
 *
 * Two repairs, and the interesting one is the selection: EmbedPDF's text
 * handler clears on *every* pointer-down, so a finger landing to pinch throws
 * away the passage the reader had — which is precisely what the user asked not
 * to happen. It cannot be prevented (a press cannot know a second finger is
 * coming), so it is remembered and put back.
 */

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

/** A passage, as the plugin models one. */
const PASSAGE = {
  start: { page: 0, index: 12 },
  end: { page: 0, index: 31 },
} as unknown as SelectionRangeX

/** The selection plugin, as far as this needs one. */
function pluginWith(selected: SelectionRangeX | null) {
  const state = { selection: selected }
  return {
    plugin: {
      getState: () => state,
      setSelection: vi.fn(),
    } as unknown as SelectionCapability,
    /** What the library itself does on the press that starts a pinch. */
    clearAsTheLibraryWould: () => {
      state.selection = null
    },
    /** Something else claiming the selection between the two fingers. */
    selectInstead: (range: SelectionRangeX) => {
      state.selection = range
    },
  }
}

/** A finger, as the browser raises it. */
function finger(
  type: string,
  pointerId: number,
  target: EventTarget = window,
): void {
  target.dispatchEvent(
    new PointerEvent(type, { pointerType: 'touch', pointerId, bubbles: true }),
  )
}

function renderRecovery(selection: SelectionCapability | null) {
  function Reader() {
    usePinchRecovery({ documentId: ARTICLE_ID, selection })
    return null
  }
  return render(<Reader />)
}

/** What the press landed on — the page image, in the reader. */
let paper: HTMLDivElement

beforeEach(() => {
  paper = document.createElement('div')
  document.body.append(paper)
  vi.clearAllMocks()
})

describe('usePinchRecovery', () => {
  it('puts back the passage the pinch’s first finger cleared', () => {
    const { plugin, clearAsTheLibraryWould } = pluginWith(PASSAGE)
    renderRecovery(plugin)

    finger('pointerdown', 1, paper)
    clearAsTheLibraryWould()
    finger('pointerdown', 2, paper)

    expect(plugin.setSelection).toHaveBeenCalledWith(PASSAGE, ARTICLE_ID)
  })

  it('does nothing when a single finger presses', () => {
    // Which is a tap, and a tap on the paper is *meant* to clear a selection.
    const { plugin, clearAsTheLibraryWould } = pluginWith(PASSAGE)
    renderRecovery(plugin)

    finger('pointerdown', 1, paper)
    clearAsTheLibraryWould()

    expect(plugin.setSelection).not.toHaveBeenCalled()
  })

  it('leaves a selection made between the two fingers alone', () => {
    /*
     * Only what the pinch itself destroyed. If something is selected when the
     * second finger lands, putting the older passage back would be this reader
     * deciding it knew better than the reader.
     */
    const newer = {
      start: { page: 1, index: 0 },
      end: { page: 1, index: 4 },
    } as unknown as SelectionRangeX
    const { plugin, clearAsTheLibraryWould, selectInstead } =
      pluginWith(PASSAGE)
    renderRecovery(plugin)

    finger('pointerdown', 1, paper)
    clearAsTheLibraryWould()
    selectInstead(newer)
    finger('pointerdown', 2, paper)

    expect(plugin.setSelection).not.toHaveBeenCalled()
  })

  it('invents nothing when there was nothing selected', () => {
    const { plugin } = pluginWith(null)
    renderRecovery(plugin)

    finger('pointerdown', 1, paper)
    finger('pointerdown', 2, paper)

    expect(plugin.setSelection).not.toHaveBeenCalled()
  })

  it('remembers what was selected as the finger landed, not what is now', () => {
    /*
     * The ordering the whole repair rests on. This listens at the window on the
     * capture phase, which runs window-inward, and the manager's listeners are
     * on the page element at the inward end — so the snapshot is taken before
     * the plugin is handed the same press. Read a moment later and the answer is
     * always "nothing", because by then it has cleared.
     */
    const { plugin, clearAsTheLibraryWould } = pluginWith(PASSAGE)
    renderRecovery(plugin)

    finger('pointerdown', 1, paper)
    clearAsTheLibraryWould()
    // A second gesture entirely: nothing was selected when this finger landed.
    finger('pointerup', 1, paper)
    finger('pointerdown', 2, paper)
    finger('pointerdown', 3, paper)

    expect(plugin.setSelection).not.toHaveBeenCalled()
  })

  it('tells the live tool its pointer was cancelled', () => {
    /*
     * The other repair, and the same one the click that puts a mark down needs:
     * a tool clears what a press started only on pointer-up or pointer-cancel.
     * The pinch takes its lift away from nobody — but the tool must not go on
     * drawing with a finger that is now half of a zoom.
     */
    const cancels = vi.fn()
    document.body.addEventListener('pointercancel', cancels)
    const { plugin } = pluginWith(null)
    renderRecovery(plugin)

    finger('pointerdown', 9, paper)
    finger('pointerdown', 10, paper)

    expect(cancels).toHaveBeenCalledTimes(1)
    const [event] = cancels.mock.calls[0] as [PointerEvent]
    // Aimed at what the *first* finger landed on, carrying its id: the plugin
    // releases the capture from the element the cancel arrives on, and an id
    // that element never captured throws inside the plugin.
    expect(event.target).toBe(paper)
    expect(event.pointerId).toBe(9)
  })

  it('survives a plugin that is not there yet', () => {
    // The capability arrives a tick after the first render, and a reader can
    // pinch a paper that is still opening.
    const cancels = vi.fn()
    document.body.addEventListener('pointercancel', cancels)
    renderRecovery(null)

    finger('pointerdown', 1, paper)
    finger('pointerdown', 2, paper)

    // The tool is still told — that repair needs no plugin — and nothing throws.
    expect(cancels).toHaveBeenCalledTimes(1)
  })
})
