import type { AnnotationCapability } from '@embedpdf/plugin-annotation'
import { useEffect } from 'react'
import { isMarginSized, marginTextBoxFrom } from './margin-text-box'

/** The engine's id for the text box tool. */
const FREE_TEXT_TOOL_ID = 'freeText'

/**
 * Resizes the engine's text box to fit a margin
 * (features/a-note-fits-the-margin).
 *
 * **Imperative, like the highlight box, and for the same reason turned around.**
 * That tool has to be added because the plugin will not inherit a new id from a
 * built-in; this one has to be *replaced* because the plugin's `tools` config
 * would overwrite the whole `defaults` object rather than add a size to it
 * (`margin-text-box.ts`). Both need the resolved tool, and only a mounted plugin
 * has one.
 *
 * Idempotent through the sizes themselves rather than through the id, which is
 * the engine's own and always present: re-running on an already-resized tool
 * would replace a tool that may be active at that moment.
 */
export function useMarginTextBox(
  annotations: AnnotationCapability | null,
): void {
  useEffect(() => {
    if (!annotations) {
      return
    }
    const freeText = annotations.getTool(FREE_TEXT_TOOL_ID)
    if (!freeText || isMarginSized(freeText)) {
      return
    }
    annotations.addTool(marginTextBoxFrom(freeText))
  }, [annotations])
}
