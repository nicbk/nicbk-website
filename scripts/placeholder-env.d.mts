/**
 * Types for `placeholder-env.mjs`, which is plain JavaScript so the schema
 * generator can run it under bare `node`. This project does not enable
 * `allowJs`, so the TypeScript importers — the Vitest setup files and the
 * Playwright config — need this declaration to see it.
 */
export declare const placeholderEnv: Record<string, string>
