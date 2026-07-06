/**
 * Light/dark theming, entirely outside React.
 *
 * The theme is a `data-theme` attribute on <html>, set before first paint
 * by an inline script in the document head (`themeInitScript` below), so
 * the first painted frame is always the correct theme — no flash. The CSS
 * custom properties in src/styles/colors.css key off the attribute; React
 * never holds theme state. See
 * research/coding-conventions/state-management-conventions.md.
 */

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'theme'

/**
 * Resolves the effective theme from a stored preference (if any) and the
 * OS preference. Shared by the pre-paint inline script (embedded via
 * toString below) and the toggle — keep it pure and self-contained: no
 * references to outer-scope values, or the embedded copy would break.
 */
export function resolveTheme(
  stored: string | null,
  prefersDark: boolean,
): Theme {
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  return prefersDark ? 'dark' : 'light'
}

/**
 * Flips the current theme, applies it to <html>, and persists it. After a
 * manual toggle the stored choice wins over the OS setting on future
 * visits (see resolveTheme).
 */
export function toggleTheme(): Theme {
  const current = document.documentElement.getAttribute('data-theme')
  const next: Theme = current === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Storage can be unavailable (private mode, blocked) — the toggle
    // still applies for the current page view.
  }
  return next
}

/**
 * The pre-paint inline script. Embeds resolveTheme's compiled source so the
 * script and the toggle share one implementation (unit-tested directly).
 * Must stay dependency-free and synchronous — it runs blocking, in <head>,
 * before first paint.
 */
export const themeInitScript = `(function () {
  var resolve = ${resolveTheme.toString()};
  var stored = null;
  try {
    stored = window.localStorage.getItem('${THEME_STORAGE_KEY}');
  } catch (e) {}
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', resolve(stored, prefersDark));
})();`
