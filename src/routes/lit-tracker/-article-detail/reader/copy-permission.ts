import { PdfPermissionFlag } from '@embedpdf/models'

/**
 * Whether this PDF permits its text to be extracted.
 *
 * **A PDF can forbid copying, and EmbedPDF honours that silently.** The
 * selection plugin checks the flag before it does anything, logs at debug level
 * and returns — no error, no event, nothing for a caller to react to. So a copy
 * control on such a paper would highlight under the cursor and do nothing at
 * all, which is the failure mode this project has already been bitten by once
 * (see `annotation-selection-menu.tsx`). Asking the same question the plugin
 * asks, before offering the control, is what lets the reader be told instead.
 *
 * The rule is the engine's own, reproduced rather than imported because it is
 * not exported: a document's permission bitmask is checked against the
 * `CopyContents` flag, and a document that declares no permissions permits
 * everything. The layers this deliberately skips — per-document and global
 * overrides — are configuration this reader does not set; if it ever does, this
 * is the function that has to learn about them.
 */
export function canCopyText(permissions: number | undefined): boolean {
  const effective = permissions ?? PdfPermissionFlag.AllowAll
  return (effective & PdfPermissionFlag.CopyContents) !== 0
}
