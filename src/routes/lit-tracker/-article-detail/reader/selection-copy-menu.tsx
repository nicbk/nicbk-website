import type { SelectionSelectionMenuProps } from '@embedpdf/plugin-selection/react'
import { Check, Copy, X } from 'lucide-react'
import type { CopyState } from './use-selection-copy'
import styles from './selection-copy-menu.module.css'

/**
 * What a reader can do with a passage they have selected. Today: copy it.
 *
 * **Anchored to the selection, for the reason its sibling is anchored to a
 * mark.** `annotation-selection-menu.tsx` makes the argument in full — a control
 * that acts on *this* thing belongs beside it, and the toolbar is about the
 * document. The two menus are deliberately built the same way, from the same
 * EmbedPDF mechanism, so a reader meets one affordance in two places rather than
 * two affordances.
 *
 * **The button is not the only way in.** ⌘C does the same thing (see
 * `use-reader-copy-shortcut.ts`), because it is what a reader tries first. This
 * exists because nothing otherwise says copying is possible: the selection is
 * drawn as overlay rectangles over a canvas, and it looks like a browser text
 * selection while behaving like nothing at all.
 */

interface SelectionCopyMenuProps extends SelectionSelectionMenuProps {
  /** Whether this PDF permits its text to be extracted. See `copy-permission.ts`. */
  canCopy: boolean
  state: CopyState
  onCopy: () => void
}

const LABELS: Record<CopyState, string> = {
  idle: 'copy',
  copied: 'copied',
  failed: 'could not copy',
}

const ICONS: Record<CopyState, typeof Copy> = {
  idle: Copy,
  copied: Check,
  failed: X,
}

export function SelectionCopyMenu({
  selected,
  menuWrapperProps,
  canCopy,
  state,
  onCopy,
}: SelectionCopyMenuProps) {
  // EmbedPDF renders this for the selection layer whether or not there is one.
  if (!selected) {
    return null
  }

  const Icon = canCopy ? ICONS[state] : X
  const label = canCopy ? LABELS[state] : 'this pdf does not allow copying'

  return (
    <div {...menuWrapperProps}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: not an interaction — this stops one, exactly as the annotation menu does; see the comment there. */}
      <div
        className={styles.menu}
        /*
         * The press must not reach the page, which would begin a new selection
         * and unmount this before its click landed. The annotation menu learned
         * this the hard way; the same guard, for the same reason.
         */
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.button}
          /*
           * Disabled rather than hidden when the document forbids extraction.
           * A reader who cannot find the control assumes the reader is missing
           * it; a reader who finds it greyed out with a reason knows it is the
           * paper. It is also the only surface that can carry that sentence —
           * nothing else in the reader knows the permission was refused.
           */
          disabled={!canCopy}
          // The label truncates over a narrow selection; the tooltip is where
          // the refusal's full sentence stays reachable by pointer, as the
          // accessible name keeps it for assistive tech.
          title={label}
          onClick={onCopy}
        >
          <Icon className={styles.icon} aria-hidden="true" />
          {/*
            The word is visible, not only announced. This is a floating control
            over a document, so an icon alone would have to be guessed — and the
            state it reports ("copied", "could not copy") is the whole point of
            pressing it.
          */}
          <span className={styles.label}>{label}</span>
        </button>
      </div>
    </div>
  )
}
