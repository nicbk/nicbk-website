import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'

/**
 * The channel between the sidebar's lists and the reader they steer — the
 * annotations list, and the contents list (features/a-paper-shows-its-contents).
 *
 * The two cannot reach each other by props: the sidebar renders in the shell's
 * rail, which is a *sibling* of the page (`route.tsx` explains the layout), and
 * the reader is deep inside the page. The route layout is the only level that
 * can see both — the same reason the collection's search params are validated
 * there — so that is where this provider mounts, and #10's Citations tab will
 * need state at exactly this level for the same reason when it swaps the main
 * content area.
 *
 * The handle is a **ref, not state**, because nothing renders from it: the
 * reader offers its scroll surface, the list calls it, and a re-render on
 * registration would be a re-render nobody uses. Both hooks tolerate a missing
 * provider — without one, registering records a handle nobody can call and
 * jumping calls a handle nobody registered, and each of those is correctly
 * nothing. That is the situation of every unit test that renders one half
 * alone, and of the reader whenever no list is mounted.
 *
 * **It carries one thing back, too: where the reader is** — its reading line,
 * which the contents list marks the section of. That travels the same way for
 * the same reason, and it is a store rather than state for a reason of its own:
 * it changes on every scroll frame, and only a reader of it that *selects*
 * something which changed should re-render (`useReadingLine`).
 */

/**
 * Moves the reader to a page, addressed as the stored 0-based `page_index` —
 * and, given a `top` in page points, to that point on it, which the reader
 * places just below its toolbar (`reader/go-to.ts`).
 */
export type JumpToPage = (pageIndex: number, top?: number | null) => void

/**
 * Where the reader is reading: a 0-based page and a point down it, in
 * top-left page points. Which point on the screen counts is the reader's to
 * decide (`reader/reading-line.ts`); the channel only carries it.
 */
export interface ReadingLine {
  pageIndex: number
  top: number
}

interface ReaderJumpContextValue {
  jumpToPage: JumpToPage
  register: (handle: JumpToPage | null) => void
  reportLine: (line: ReadingLine | null) => void
  subscribeLine: (listener: () => void) => () => void
  currentLine: () => ReadingLine | null
}

const ReaderJumpContext = createContext<ReaderJumpContextValue | null>(null)

interface ReaderJumpProviderProps {
  children: ReactNode
}

export function ReaderJumpProvider({ children }: ReaderJumpProviderProps) {
  const handle = useRef<JumpToPage | null>(null)

  const register = useCallback((next: JumpToPage | null) => {
    handle.current = next
  }, [])

  // Stable across the reader mounting and unmounting, so a list that grabbed
  // this before the paper finished loading still steers the reader afterwards.
  // Arguments are passed on as given, so a page-only jump stays page-only.
  const jumpToPage = useCallback<JumpToPage>((...target) => {
    handle.current?.(...target)
  }, [])

  // The reading line: the latest value, and who to tell when it changes.
  const line = useRef<ReadingLine | null>(null)
  const listeners = useRef(new Set<() => void>())

  const reportLine = useCallback((next: ReadingLine | null) => {
    line.current = next
    for (const listener of listeners.current) {
      listener()
    }
  }, [])

  const subscribeLine = useCallback((listener: () => void) => {
    listeners.current.add(listener)
    return () => {
      listeners.current.delete(listener)
    }
  }, [])

  const currentLine = useCallback(() => line.current, [])

  const value = useMemo(
    () => ({ jumpToPage, register, reportLine, subscribeLine, currentLine }),
    [jumpToPage, register, reportLine, subscribeLine, currentLine],
  )

  return (
    <ReaderJumpContext.Provider value={value}>
      {children}
    </ReaderJumpContext.Provider>
  )
}

/** The reader's side: offer a way to its pages while mounted, withdraw it after. */
export function useRegisterReaderJump(handle: JumpToPage | null): void {
  const context = useContext(ReaderJumpContext)
  const register = context?.register

  useEffect(() => {
    if (!register || !handle) {
      return
    }
    register(handle)
    return () => register(null)
  }, [register, handle])
}

/** The list's side: a call that moves the reader, or does nothing without one. */
export function useReaderJump(): JumpToPage {
  const context = useContext(ReaderJumpContext)
  const none = useCallback<JumpToPage>(() => {}, [])
  return context?.jumpToPage ?? none
}

/**
 * The reader's side of the line: a call that reports where it is reading, or
 * `null` once it is not (unmounted, or hidden behind another view).
 */
export function useReadingLineReporter(): (line: ReadingLine | null) => void {
  const context = useContext(ReaderJumpContext)
  const none = useCallback(() => {}, [])
  return context?.reportLine ?? none
}

/** A subscription to nothing, for a list rendered without a provider. */
function subscribeToNothing(): () => void {
  return () => {}
}

/**
 * A list's side of the line: what `select` makes of it, re-rendering only when
 * that changes.
 *
 * **Select something small.** The line moves on every scroll frame; a selector
 * that returns a number (the index of the section in view) re-renders the list
 * when the section changes, where returning the line itself would re-render it
 * sixty times a second. `select` is called with `null` while no reader reports.
 */
export function useReadingLine<T>(select: (line: ReadingLine | null) => T): T {
  const context = useContext(ReaderJumpContext)
  const snapshot = () => select(context?.currentLine() ?? null)
  return useSyncExternalStore(
    context?.subscribeLine ?? subscribeToNothing,
    snapshot,
    snapshot,
  )
}
