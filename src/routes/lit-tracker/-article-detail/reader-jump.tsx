import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'

/**
 * The channel between the annotations list and the reader it steers.
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
 */

/** Moves the reader to a page, addressed as the stored 0-based `page_index`. */
export type JumpToPage = (pageIndex: number) => void

interface ReaderJumpContextValue {
  jumpToPage: JumpToPage
  register: (handle: JumpToPage | null) => void
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
  const jumpToPage = useCallback<JumpToPage>((pageIndex) => {
    handle.current?.(pageIndex)
  }, [])

  const value = useMemo(
    () => ({ jumpToPage, register }),
    [jumpToPage, register],
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
