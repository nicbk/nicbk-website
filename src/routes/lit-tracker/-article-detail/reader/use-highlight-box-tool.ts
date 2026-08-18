import type { AnnotationCapability } from '@embedpdf/plugin-annotation'
import { useEffect } from 'react'
import {
  HIGHLIGHT_BOX_TOOL_ID,
  highlightBoxToolFrom,
} from './highlight-box-tool'

/**
 * Puts the highlight box in the engine's tool list.
 *
 * **The one tool this reader adds imperatively**, and not by preference — the
 * other twelve are EmbedPDF's own and need no registering at all. A tool needs a
 * pointer handler to turn a drag into a shape, the plugin does not export the
 * square's, and a new id in the plugin's `tools` config is added as-is rather
 * than inheriting from a built-in. So the base has to be read back out of a
 * mounted plugin, which can only happen here. `highlight-box-tool.ts` holds the
 * part that is a decision; this holds the part that is a lifecycle.
 *
 * Idempotent, because it must be: the effect re-runs whenever the capability
 * identity changes, and `addTool` on an id the plugin already has would replace
 * a tool that may be active at that moment.
 */
export function useHighlightBoxTool(
  annotations: AnnotationCapability | null,
): void {
  useEffect(() => {
    if (!annotations || annotations.getTool(HIGHLIGHT_BOX_TOOL_ID)) {
      return
    }
    const square = annotations.getTool('square')
    if (!square) {
      // Unreachable with the stock plugin, and silence is right if it ever
      // happens: the menu simply offers a tool that does not activate, which is
      // what `annotation-tools.test.ts` exists to catch before it ships.
      return
    }
    annotations.addTool(highlightBoxToolFrom(square))
  }, [annotations])
}
