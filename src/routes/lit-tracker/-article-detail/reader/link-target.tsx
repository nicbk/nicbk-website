import type { PdfAnnotationObject, PdfLinkAnnoObject } from '@embedpdf/models'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import { createRenderer } from '@embedpdf/plugin-annotation/react'
import { useConfirmationToast } from '~/routes/-shared/components/toast/use-confirmation-toast'
import { useErrorToast } from '~/routes/-shared/components/toast/use-error-toast'
import { linkClickAction } from './link-annotations'
import styles from './link-target.module.css'

/**
 * The reader's own renderer for a paper's links.
 *
 * Handed to every `AnnotationLayer`, where a renderer with the id `link`
 * **replaces** EmbedPDF's built-in one rather than sitting beside it. The
 * built-in's locked form scrolls the reader on an internal link and `window.open`s
 * a URL; neither is what was decided (#22), so the click belongs here.
 *
 * Links are locked (`link-annotations.ts`), so EmbedPDF draws `renderLocked`.
 * `render` draws the same thing so that a link can never fall back to an
 * editable form — if the lock were ever lost, a link would still only be a click
 * target, and the unit test for the lock is what would catch it.
 */
export const LINK_RENDERERS = [
  createRenderer<PdfLinkAnnoObject>({
    id: 'link',
    matches: (annotation: PdfAnnotationObject) =>
      annotation.type === PdfAnnotationSubtype.LINK,
    render: ({ currentObject }) => <LinkTarget link={currentObject} />,
    renderLocked: ({ currentObject }) => <LinkTarget link={currentObject} />,
    interactionDefaults: {
      isDraggable: false,
      isResizable: false,
      isRotatable: false,
    },
    useAppearanceStream: false,
  }),
]

/**
 * The link's hit area: exactly its rect, and nothing drawn.
 *
 * Nothing drawn because the paper already draws its links — a coloured
 * citation, an underlined URL — and a second outline would be the reader
 * decorating the author's typesetting.
 *
 * **The pointer-down is left alone.** A reader starting a text selection on a
 * citation, or dragging one across it, needs that event to reach the page
 * beneath, where the selection plugin listens; only the click — a press and
 * release on the link itself — is answered here.
 */
export function LinkTarget({ link }: { link: PdfLinkAnnoObject }) {
  const confirm = useConfirmationToast()
  const showError = useErrorToast()
  const action = linkClickAction(link.target)

  function handleClick() {
    if (action.kind !== 'copy') {
      // `internal` previews in place in task 3 of #22; until then an internal
      // link is inert, which is strictly better than offering to delete it.
      return
    }
    const clipboard = globalThis.navigator?.clipboard
    if (!clipboard) {
      showError(COPY_FAILED)
      return
    }
    clipboard.writeText(action.text).then(
      () => confirm('link copied'),
      // Refused by permission policy, an unfocused document, or plain HTTP. A
      // copy the reader believes happened and did not is the quiet failure
      // this feature exists to remove.
      () => showError(COPY_FAILED),
    )
  }

  return (
    // A mouse and touch target only, like the link it stands in for: a paper
    // carries a hundred of these, and a hundred tab stops through the citations
    // would bury the reader's own controls. Keyboard access to links is a
    // decision for the preview task, not a side effect of this one.
    // biome-ignore lint/a11y/noStaticElementInteractions: see above
    // biome-ignore lint/a11y/useKeyWithClickEvents: see above
    <div
      className={action.kind === 'none' ? styles.inert : styles.target}
      data-link-action={action.kind}
      onClick={handleClick}
    />
  )
}

const COPY_FAILED = {
  title: 'could not copy the link',
  message: 'this browser refused the clipboard. try again, or select the text.',
}
