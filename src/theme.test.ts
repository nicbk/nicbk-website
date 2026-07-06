import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resolveTheme,
  THEME_STORAGE_KEY,
  themeInitScript,
  toggleTheme,
} from './theme'

describe('resolveTheme', () => {
  it('returns the OS preference when nothing is stored', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
  })

  it('returns the stored override regardless of OS preference', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('ignores garbage stored values and falls back to the OS preference', () => {
    expect(resolveTheme('blorp', true)).toBe('dark')
    expect(resolveTheme('', false)).toBe('light')
  })
})

describe('toggleTheme', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    window.localStorage.clear()
  })

  it('flips the data-theme attribute and persists the choice', () => {
    expect(toggleTheme()).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    expect(toggleTheme()).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })
})

describe('themeInitScript', () => {
  it('embeds the shared resolver and applies a theme when evaluated', () => {
    // jsdom has no matchMedia; the script only reads `.matches` from it.
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    document.documentElement.removeAttribute('data-theme')

    // Evaluate the inline script exactly as a browser would in <head>.
    // biome-ignore lint/security/noGlobalEval: deliberately exercising the real inline script
    eval(themeInitScript)

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
