/**
 * Generate the committed GPG key-distribution artifacts from the single
 * source of truth, public/pgp/nicbk.asc:
 *
 *   - public/.well-known/openpgpkey/hu/<wkd-hash>  binary WKD key (direct method)
 *   - public/.well-known/openpgpkey/policy         empty WKD policy file
 *   - src/gpg/fingerprint.generated.ts             derived fingerprint constant
 *
 * "Derive, don't hand-type": the about page's Fingerprint / Public Key block
 * must reflect the real served key, never an independently-edited string (see
 * research/security-privacy/gpg-key-publishing.md). This script is the single
 * regeneration entry point; because its outputs are committed, the production
 * image needs no gpg and runs no generator.
 *
 * ROTATION PROCEDURE (when the published key changes):
 *   1. Replace public/pgp/nicbk.asc with the new armored public key.
 *   2. Run: node scripts/gen-gpg-artifacts.mjs
 *   3. Commit the changed .asc and every regenerated artifact.
 * No fingerprint or page code is edited by hand. CI's drift check re-runs this
 * generator and `git diff --exit-code`s the outputs, so the committed
 * artifacts can never silently disagree with the current .asc.
 *
 * Determinism: exporting a stored key only re-serializes fixed packets, so the
 * same .asc yields byte-identical outputs run-to-run — the drift check depends
 * on this.
 *
 * Requires the `gpg` CLI (present in dev and on GitHub-hosted CI runners). All
 * gpg work happens in a throwaway keyring, so the developer's real keyring is
 * never touched.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// z-base-32 alphabet used by WKD (GnuPG), deliberately distinct from the
// RFC 4648 base32 alphabet.
const ZBASE32_ALPHABET = 'ybndrfg8ejkmcpqxot1uwisza345h769'

/**
 * z-base-32 encode a byte buffer, no padding, per the WKD specification.
 */
export function zbase32(bytes) {
  let bitBuffer = 0
  let bitCount = 0
  let encoded = ''
  for (const byte of bytes) {
    bitBuffer = (bitBuffer << 8) | byte
    bitCount += 8
    while (bitCount >= 5) {
      encoded += ZBASE32_ALPHABET[(bitBuffer >>> (bitCount - 5)) & 31]
      bitCount -= 5
    }
  }
  if (bitCount > 0) {
    encoded += ZBASE32_ALPHABET[(bitBuffer << (5 - bitCount)) & 31]
  }
  return encoded
}

/**
 * WKD direct-method hash of an email's local part: z-base-32 of the SHA-1 of
 * the lowercased local part. This is what names the hu/<hash> file, and it is
 * what a mail client derives from the address when discovering the key.
 */
export function wkdLocalPartHash(localPart) {
  const digest = createHash('sha1').update(localPart.toLowerCase()).digest()
  return zbase32(digest)
}

/**
 * Run `gpg` against a throwaway keyring, returning its stdout as a Buffer.
 * On failure, surfaces gpg's stderr in the thrown error so a broken key or
 * missing binary is diagnosable.
 */
function gpg(homedir, args, input) {
  try {
    return execFileSync(
      'gpg',
      ['--homedir', homedir, '--batch', '--quiet', '--no-tty', ...args],
      { input, maxBuffer: 10 * 1024 * 1024 },
    )
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString('utf8') : ''
    throw new Error(`gpg ${args.join(' ')} failed:\n${stderr}`, {
      cause: error,
    })
  }
}

/**
 * Parse `gpg --with-colons --list-keys` output for the primary key's
 * fingerprint (the first `fpr` record) and the first user ID's email.
 */
function parseKeyListing(colonText) {
  let fingerprint
  let email
  for (const line of colonText.split('\n')) {
    const fields = line.split(':')
    if (fields[0] === 'fpr' && fingerprint === undefined) {
      fingerprint = fields[9]
    }
    if (fields[0] === 'uid' && email === undefined) {
      const match = /<([^>]+)>/.exec(fields[9] ?? '')
      if (match) {
        email = match[1]
      }
    }
  }
  if (!fingerprint) {
    throw new Error('could not read a fingerprint from the gpg key listing')
  }
  if (!email) {
    throw new Error(
      'could not read an email (user ID) from the gpg key listing',
    )
  }
  return { fingerprint, email }
}

/**
 * Import the just-exported WKD key into a fresh keyring and assert it
 * round-trips to the expected fingerprint — the "correctness against the
 * source key" integrity check, run on every generation and every CI drift run.
 */
function assertKeyRoundTrips(wkdKey, expectedFingerprint) {
  const homedir = mkdtempSync(join(tmpdir(), 'nicbk-gpg-verify-'))
  try {
    gpg(homedir, ['--import'], wkdKey)
    const listing = gpg(homedir, ['--with-colons', '--list-keys']).toString(
      'utf8',
    )
    const { fingerprint } = parseKeyListing(listing)
    if (fingerprint !== expectedFingerprint) {
      throw new Error(
        `exported WKD key round-trips to ${fingerprint}, ` +
          `expected the source key's ${expectedFingerprint}`,
      )
    }
  } finally {
    rmSync(homedir, { recursive: true, force: true })
  }
}

/**
 * Render the generated fingerprint constant module. Kept minimal — pure data
 * with a "do not edit" header — so regeneration never clobbers hand-written
 * logic (there is none here to lose).
 */
function renderFingerprintModule(fingerprint) {
  return `// GENERATED FILE — do not edit by hand.
//
// Produced by scripts/gen-gpg-artifacts.mjs from public/pgp/nicbk.asc, the
// single source of truth for the published GPG key. To change it, swap that
// .asc and re-run the generator (see the script header); CI's drift check
// fails if this constant is edited independently of the key.

/** Full 40-hex-character fingerprint of the published GPG public key. */
export const GPG_FINGERPRINT = '${fingerprint}'
`
}

function main() {
  // Resolve paths here (not at module top level) so importing this file for
  // its pure helpers stays side-effect-free — Vitest imports it under a
  // non-file: URL scheme where fileURLToPath(import.meta.url) would throw.
  const repoRoot = fileURLToPath(new URL('..', import.meta.url))
  const sourceAsc = join(repoRoot, 'public/pgp/nicbk.asc')
  const wkdRoot = join(repoRoot, 'public/.well-known/openpgpkey')
  const fingerprintModule = join(repoRoot, 'src/gpg/fingerprint.generated.ts')

  const homedir = mkdtempSync(join(tmpdir(), 'nicbk-gpg-'))
  try {
    // Import the source key into a throwaway keyring, then read its identity.
    gpg(homedir, ['--import', sourceAsc])
    const listing = gpg(homedir, ['--with-colons', '--list-keys']).toString(
      'utf8',
    )
    const { fingerprint, email } = parseKeyListing(listing)
    const localPart = email.slice(0, email.indexOf('@'))
    const wkdHash = wkdLocalPartHash(localPart)

    // Binary, minimized, single-UID key export — the WKD hu/<hash> file.
    const wkdKey = gpg(homedir, [
      '--export-options',
      'export-minimal',
      '--export-filter',
      `keep-uid=mbox=${email}`,
      '--export',
      fingerprint,
    ])
    assertKeyRoundTrips(wkdKey, fingerprint)

    // Rewrite the WKD tree from scratch so a rotation that changes the email
    // local part cannot leave an orphaned hu/<old-hash> file behind.
    rmSync(wkdRoot, { recursive: true, force: true })
    const huPath = join(wkdRoot, 'hu', wkdHash)
    mkdirSync(dirname(huPath), { recursive: true })
    writeFileSync(huPath, wkdKey)
    writeFileSync(join(wkdRoot, 'policy'), '')

    mkdirSync(dirname(fingerprintModule), { recursive: true })
    writeFileSync(fingerprintModule, renderFingerprintModule(fingerprint))

    console.log(`WKD key    → public/.well-known/openpgpkey/hu/${wkdHash}`)
    console.log('WKD policy → public/.well-known/openpgpkey/policy')
    console.log(
      `fingerprint→ src/gpg/fingerprint.generated.ts (${fingerprint})`,
    )
  } finally {
    rmSync(homedir, { recursive: true, force: true })
  }
}

// Run generation only when executed directly (`node scripts/...`), so unit
// tests can import the pure helpers above without invoking gpg.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
