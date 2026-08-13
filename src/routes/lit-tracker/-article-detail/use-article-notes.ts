import { useEffect, useRef, useState } from 'react'

/**
 * How long after the last keystroke the notes are written.
 *
 * Deliberately far longer than the 250ms the collection's search bar uses. That
 * one mirrors typing into the URL for feedback, where a lag is felt; this is a
 * database write of prose, where 250ms means a row per word — and where nothing
 * about the reader's experience improves by saving mid-sentence. A second is
 * short enough that closing the tab straight after typing still saves, and long
 * enough that a paragraph is a handful of writes rather than fifty.
 */
export const NOTES_DEBOUNCE_MS = 1000

interface UseArticleNotesOptions {
  /** The stored value, from sync. `null` and `''` both mean "no notes". */
  synced: string | null
  /** Called with the whole new value once the reader pauses. */
  onSave: (notes: string) => void
}

/**
 * The notes field's text, and when it is written.
 *
 * Two jobs, and the second is the one worth the file.
 *
 * **It does not clobber what is being typed.** The field is bound to a column
 * that also arrives by sync, so the naive binding — value straight from the
 * synced row — loses characters the moment the reader's own debounced write
 * comes back, and loses whole sentences if the same article is open in a second
 * window. The rule here is that **a synced value is only adopted while nothing
 * is pending**: an unwritten edit is what "the reader is busy" means, so an
 * incoming value lands on an idle field and is ignored by a busy one. That is
 * the decided editing-vs-non-editing rule
 * (research/ui-ux/design-system.md) applied to the one field on this site it was
 * written for.
 *
 * The cost, stated: two windows editing the same notes at once is last-writer
 * -wins, and the loser's text is replaced when they stop typing. Nothing here
 * merges, because merging prose needs a CRDT and this is one person's notebook.
 *
 * **It does not write on every keystroke.** `NOTES_DEBOUNCE_MS` after the last
 * one, and once more on unmount if anything is still pending — otherwise
 * switching tabs within a second of typing would silently drop the tail.
 *
 * The hook takes no article id and needs none: `NotesPanel` is keyed by the
 * article, so a different paper is a different field by construction, and the
 * unmount flush that entails writes the old text through the old article's own
 * `onSave`.
 */
export function useArticleNotes({ synced, onSave }: UseArticleNotesOptions) {
  const [draft, setDraft] = useState(synced ?? '')
  /** The edit waiting to be written, or `null` when the field is idle. */
  const [pending, setPending] = useState<string | null>(null)

  /**
   * Both held in refs because the unmount flush below must read the latest
   * values without re-subscribing — an effect that re-ran on every keystroke
   * would run its cleanup on every keystroke, which is exactly the flush it is
   * there to perform once.
   */
  const pendingRef = useRef<string | null>(null)
  const save = useRef(onSave)
  save.current = onSave

  /**
   * Adopt the synced value while the field is idle.
   *
   * This is what makes the field live — a note written in another window shows
   * up here — and it is deliberately conditional on nothing being pending. It
   * also covers the first render for an article whose row arrives after the
   * component mounts, which on a cold load is the usual case.
   */
  useEffect(() => {
    if (pending === null) {
      setDraft(synced ?? '')
    }
  }, [synced, pending])

  /** The debounce itself. Re-armed by each keystroke, because `pending` changes. */
  useEffect(() => {
    if (pending === null) {
      return
    }
    const timer = setTimeout(() => {
      pendingRef.current = null
      setPending(null)
      save.current(pending)
    }, NOTES_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [pending])

  /**
   * Flush on unmount, so a reader who types and immediately navigates away — or
   * switches to another tab in this sidebar — keeps what they wrote.
   *
   * Empty dependencies on purpose: this must run exactly at teardown, reading
   * whatever was pending at that moment through the ref.
   */
  useEffect(
    () => () => {
      if (pendingRef.current !== null) {
        save.current(pendingRef.current)
      }
    },
    [],
  )

  function change(value: string) {
    pendingRef.current = value
    setPending(value)
    setDraft(value)
  }

  return { notes: draft, onNotesChange: change }
}
