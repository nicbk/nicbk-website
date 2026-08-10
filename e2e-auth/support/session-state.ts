/**
 * Where the signed-in tier keeps the session it signs in for, once.
 *
 * Its own module because exactly two things need to agree on it and they are on
 * opposite sides of the run: `playwright.auth.config.ts`, which hands the file
 * to every spec as `storageState`, and `auth.setup.ts`, which writes it. A
 * literal in both places is a typo away from every spec silently running signed
 * out.
 *
 * Deliberately not committed (`.gitignore`) and deliberately rewritten on every
 * run rather than reused between them: it holds a real session cookie for the
 * stubbed account, and the last spec of a full run deletes that account, so a
 * file left over from yesterday authenticates as nobody.
 */
export const SIGNED_IN_STORAGE_STATE = 'e2e-auth/.auth/signed-in.json'
