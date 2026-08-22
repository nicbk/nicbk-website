import type { InteractionMode } from '@embedpdf/plugin-interaction-manager'

/**
 * What the reader is doing when it is not drawing: reading.
 *
 * This replaces EmbedPDF's own default interaction mode, and the whole of the
 * change is one flag — but the flag is the difference between a paper that
 * scrolls under a thumb and one that does not.
 *
 * **What `wantsRawTouch` actually does, since its name says otherwise.** The
 * interaction manager attaches touch listeners only when `PointerEvent` is
 * undefined, which on any current browser it never is — so the flag routes no
 * touch anywhere. Its one real effect is this line, in the pointer provider:
 *
 * ```js
 * element.style.touchAction = attachedWithRawTouch ? 'none' : ''
 * ```
 *
 * and `attachedWithRawTouch` resolves `wantsRawTouch !== false`. The library's
 * own default mode leaves the flag unset, so it reads as `true`, so **every page
 * carries `touch-action: none`** and the browser is forbidden from scrolling the
 * document at all. That is the reported defect, and it is a regression against
 * research/ui-ux/design-system.md's 2026-08-09 rule that hiding scrollbars
 * leaves scrolling itself untouched — "wheel, trackpad, keyboard, and touch all
 * work".
 *
 * Declining raw touch clears the inline value, which lets the stylesheet decide
 * instead. What it decides, and why the pages do not simply become `auto`, is in
 * `pdf-reader.module.css` beside `.pageLayers`.
 *
 * **It keeps EmbedPDF's own id, deliberately.** Registering a mode of this
 * reader's own and making it the default would read as more honest about
 * ownership, and would silently break text selection with a mouse: the selection
 * plugin seeds its per-mode configuration with the string `'pointerMode'`
 * hard-coded, so a differently-named default is a default with no selection
 * enabled. Replacing the entry is safe because `registerMode` is a plain
 * `Map.set` — every other plugin's registration against this id keeps working,
 * which is exactly the point.
 *
 * Every other field repeats what the library registers, because this replaces
 * that registration rather than patching it.
 */
export const READING_MODE: InteractionMode = {
  id: 'pointerMode',
  scope: 'page',
  exclusive: false,
  cursor: 'auto',
  /**
   * The one field that differs, and the reason this module exists.
   *
   * A tool's own mode leaves this unset — the annotation plugin registers one
   * per tool — so choosing a tool puts `touch-action: none` back and a
   * one-finger drag draws again. That is the decided model: reading is the
   * plain gesture, and picking up a tool is what claims the finger.
   */
  wantsRawTouch: false,
}
