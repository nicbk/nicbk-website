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

/**
 * Whether this PDF permits marks to be added to it.
 *
 * **A separate question from copying, and a separate flag.** A paper may permit
 * one and refuse the other, and the annotation plugin checks this one the same
 * silent way before creating anything
 * (`plugin-annotation/dist/index.js:5272`) — so offering the marking actions on
 * a paper that forbids them would be four controls that do nothing.
 *
 * Unlike the copy control, which stays visible and explains itself, these are
 * simply absent: there are four of them, the explanation would not fit beside a
 * selection, and a reader who never sees a control does not wonder why pressing
 * it did nothing.
 */
export function canAddAnnotations(permissions: number | undefined): boolean {
  const effective = permissions ?? PdfPermissionFlag.AllowAll
  return (effective & PdfPermissionFlag.ModifyAnnotations) !== 0
}
