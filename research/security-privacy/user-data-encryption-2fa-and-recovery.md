# User Data Encryption: 2FA and the Recovery Code

Researched: 2026-11-12, as round-2 follow-up research on top of
[user-data-encryption.md](./user-data-encryption.md) ("Getting the key onto a
second device"), with zero-access encryption (option d, decided by the user as
E1 on 2026-11-12, in
[answers-2026-11-12.md](../requests/2026-10-14/answers-2026-11-12.md)) as a
given. It answers the user's E6. The other round-2 follow-ups (E4, what stays
plaintext under Zero, and E7, re-processing with consent) are in
[user-data-encryption-round-2.md](./user-data-encryption-round-2.md). Questions
left for the user are R2-1 and R2-2 in
[decisions.md](../requests/2026-10-14/decisions.md#round-2-questions-for-the-user-2026-11-12).

Source caveats: Better Auth 1.6.25, `@better-auth/core` 1.6.25 and
`@better-auth/passkey` 1.6.25 were downloaded with `npm pack` and their `dist/`
code was read (the checkout has no `node_modules`); 1.6.34, 1.7.21 and
1.8.0-beta.8 were read to compare. Claims marked *uncertain* could not be
confirmed against a primary source.

## Round 2 (2026-11-12): 2FA, passkeys and the recovery code (E6)

The user asked for optional, seamless 2FA plus a recovery code; whether the
recovery code is still needed once 2FA is set up; and whether anything works
together with Google sign-in or another 2FA integration makes more sense.

### Is the recovery code still needed with 2FA? Yes

2FA and the data key answer different questions:

| | 2FA (authentication) | The data key (zero-access decryption) |
|---|---|---|
| Question | "Is this really the account owner?" | "Can this browser decrypt the library?" |
| Checked by | The server (Better Auth) | Nobody: the browser can unwrap the X25519 private key or it cannot |
| Made of | Secrets the server holds or can verify: Google's ID token, a TOTP seed (stored encrypted under the *server's* secret), backup-code hashes, a passkey's public key | Secrets the server never sees: the recovery code, a passkey's PRF output, a device key in IndexedDB, a key sealed from another device |
| If lost | A server-side path can restore access | Nothing server-side can bring it back (E1, E2) |

Anything the server can verify, the server, or whoever takes it over, could also
use, so no data key can be derived from it. A user who signs in perfectly with
Google plus TOTP on a new laptop still gets only ciphertext until they produce
something that *unwraps the key*. In Better Auth the TOTP seed is
`symmetricEncrypt`ed under the server secret, and backup codes default to
`storeBackupCodes: "encrypted"` under the same secret.

**The exception is a passkey with the PRF extension.** PRF returns a 32-byte
secret computed inside the authenticator that never leaves the client
([Yubico PRF guide](https://developers.yubico.com/WebAuthn/Concepts/PRF_Extension/Developers_Guide_to_PRF.html),
[Corbado](https://www.corbado.com/blog/passkeys-prf-webauthn)), so one gesture
can be both the second factor and the key unlock. Bitwarden ships this
([Bitwarden](https://bitwarden.com/help/login-with-passkeys/)). Strictly, a
synced PRF passkey makes the data as recoverable as the passkey: iCloud
Keychain restores through Apple's HSM escrow, which allows 10 attempts and then
destroys the record
([Apple Platform Security](https://support.apple.com/en-ca/guide/security-pdf/sec3e341e75d/web));
Google Password Manager needs the Google account plus an old device's screen
lock or the GPM PIN
([Google security blog](https://security.googleblog.com/2022/10/SecurityofPasskeysintheGooglePasswordManager.html),
[Google, 2024](https://blog.google/innovation-and-ai/technology/safety-security/google-password-manager-passkeys-update-september-2024/)).

The recovery code is still needed in practice, for five reasons:

1. **PRF output belongs to one credential.** Moving ecosystems (Android to
   iPhone, GPM to 1Password) means a new passkey with a different PRF value,
   and re-wrapping for it needs an unlocked session. Whether PRF secrets survive
   a CXP/CXF export is ***uncertain***; no source says either way
   ([heise](https://heise.de/-10452032),
   [youngju.dev](https://www.youngju.dev/transcribe/2026-07-16-passkey-credential-exchange-half-shipped.en)).
2. **Users delete passkeys**, and deleting the only one would silently delete
   the library with it.
3. **The platforms have their own permanent-loss cases:** Apple's 10-attempt
   escrow destruction; Google says losing every recovery option loses the saved
   passwords ([Google](https://support.google.com/accounts/answer/11350823)).
4. **PRF bugs have lost data:** iOS 18.0–18.3 had hybrid PRF data-loss bugs
   ([Corbado](https://www.corbado.com/blog/passkeys-prf-webauthn)); the
   1Password extension's PRF output has been non-spec-compliant since May 2026
   (FS-5593), with no fix found as of October
   ([1Password community](https://www.1password.community/developers-69/browser-extension-webauthn-prf-extension-not-spec-compliant-24672)).
5. **Some users never register a passkey**, or register one without PRF.

So the recovery code stays **mandatory at key setup**, as round 1 recommended;
a synced PRF passkey makes it a code the user will *probably* never need.
`@better-auth/passkey` records whether a passkey is synced (`backedUp`, from
WebAuthn's BS flag) and names the provider from `aaguid`
(`getAuthenticatorName`, `index.mjs` lines 343–378, 729), so settings can say
"Backed up by iCloud Keychain" truthfully.

**Two different "recovery codes".** Better Auth's *2FA backup codes* (10 codes
of the form `xxxxx-xxxxx`, each usable once) get a user past the 2FA check and
are readable by the server. The *data recovery code* unwraps the key and the
server never sees it. See "Open choice: one recovery code or two" below.

**What 2FA protects under zero-access.** An attacker with the user's Google
account but no unlock method cannot read stored content, but with a session can
still see the plaintext structure, delete papers or the whole account (deletion
needs only a session under a day old), use up the quota, upload into the
account, and, most dangerously, **register their own public key or unlock
method**, after which every new upload is encrypted to the attacker. So 2FA
mainly guards integrity, availability and the key-management actions. **Setting
or replacing the public key, adding or removing an unlock method, regenerating
the recovery code, turning 2FA off and "reset encryption" must all require an
existing unlock method or a fresh second factor, never Google alone.**

### Google sign-in and Google's 2-Step Verification: visible at best, never enforceable

- Google's **Security Bundle** (announced 16 June 2026) adds optional ID-token
  claims `auth_time` and `amr` (methods from `pwd`, `mfa`, `hwk`, `swk`
  (passkey), `sms`, `tel`)
  ([Google blog](https://developers.googleblog.com/en/enhance-security-and-trust-new-session-metadata-in-sign-in-with-google/),
  [docs](https://developers.google.com/identity/siwg/security-bundle);
  [OIDC reference](https://developers.google.com/identity/openid-connect/reference)).
  The app must be published and verified with "Session age claims" and
  "Authentication strength claims" enabled (both off by default), must request
  the claims through the OIDC `claims` parameter, and Google says `amr` "may not
  be present even when requested".
- **"Google does not support Google Account reauth requests"** (same docs
  page): the app cannot force a fresh Google login before a sensitive action.
- `acr` is not documented by Google; older community posts say Google ignores
  it (*uncertain*, likely superseded;
  [Apigee community](https://community.apigee.com/gc/Apigee/How-to-check-if-a-Google-user-have-MFA-enabled/m-p/607462)).
  Only Workspace admins can *enforce* 2SV, for managed accounts.
- Better Auth 1.6.25's Google provider does not forward a `claims` parameter
  (`additionalParams` is fixed to `include_granted_scopes`), and
  `createAuthorizationURL` builds `claims` only with null values. Requesting
  `amr` would mean the `genericOAuth` plugin (`authorizationUrlParams`) or a
  wrapped provider.
- Google 2SV passes anyone who controls the Google account or session, and does
  nothing for the data key.
- Optional later hardening: Cross-Account Protection (RISC) pushes events such
  as "account hijacked" so the app can revoke its sessions; it needs a verified
  app and an endpoint.

**Verdict:** treat Google 2SV as the user's own business, perhaps with a nudge
later; do not count it as the app's 2FA. App-level 2FA is the only factor the
app controls, and the only step-up before sensitive actions.

### Why TOTP is deferred: Better Auth's twoFactor does not cover OAuth sign-ins

The project is on `better-auth` ^1.6.25 (latest 1.7.21, 2026-11-11; the 1.6
line is at 1.6.34).

- **The `twoFactor` plugin does not challenge a Google sign-in.** Its
  after-hook matches only `/sign-in/email`, `/sign-in/username` and
  `/sign-in/phone-number`; the OAuth callback is `/callback/:id`
  (`api/routes/callback.mjs:21`), so a 2FA user signing in with Google gets a
  full session and no challenge. The docs say OAuth and passkey sign-ins are
  "not gated by 2FA by default" and suggest "custom hook handling for those
  endpoints" ([1.6 docs](https://better-auth.com/docs/1.6/plugins/2fa),
  [.md](https://better-auth.com/docs/1.6/plugins/2fa.md)). Unchanged in 1.6.34,
  1.7.21 and 1.8.0-beta.8. 1.6.3 extended enforcement to every path (#9122) and
  1.6.4 reverted it (#9205)
  ([newreleases 1.6.4](https://newreleases.io/project/npm/better-auth/release/1.6.4),
  [1.7.0-beta.2](https://newreleases.io/project/npm/better-auth/release/1.7.0-beta.2)),
  so the behaviour may shift again and must be pinned with a test.
- **Gating Google with TOTP means copying private bookkeeping:** delete the
  session and cookie, `setNewSession(null)`, write `2fa-<id>` and
  `2fa-attempts-<id>` verification rows, set the signed `two_factor` cookie,
  and redirect to a challenge. This is the "intercepting a dependency's input
  makes you its bookkeeper" case in AGENTS.md, and the internal format already
  changed between 1.6 and 1.7 (`readSignInTwoFactorState`). A separate app
  cookie ([dev.to](https://dev.to/zntb/adding-2fa-to-oauth-logins-in-nextjs-16-with-better-auth-2eep))
  leaves a valid session every route must remember to check; not recommended.
- Users without a password need `allowPasswordless: true`.
- Brute-force limits hold despite `disableIpTracking`: besides the per-IP
  limit (skipped here) there are 5 attempts per challenge and a per-account
  lockout (10 failures lock for 15 minutes), both keyed by account.
- TOTP itself: 6 digits, 30 s; enabling returns a `totpURI` and 10 backup
  codes; "trust this device" lasts 30 days by default.
- **Email OTP** adds nothing (the email *is* the Google account). **SMS** needs
  a closed-source paid sender, against DESIGN.md's open-source rule, and is the
  weakest factor. Both rejected.
- CVE-2026-67337 (a 2FA bypass with `session.cookieCache`) was fixed in 1.4.9
  ([Corgea](https://corgea.com/advisories/vulnerabilities/CVE-2026-67337));
  1.6.25 is not affected, but re-check before enabling `cookieCache`.

### The passkey plugin

- `@better-auth/passkey@1.6.25` matches the installed line (peers
  `better-auth ^1.6.25`, SimpleWebAuthn 13, MIT); at 1.7.x it needs
  better-auth ^1.7.21, so the two upgrade together
  ([1.6 passkey docs](https://better-auth.com/docs/1.6/plugins/passkey)).
- **The client can read the PRF output.** `extensions` pass through, and with
  `returnWebAuthnResponse: true` the client returns
  `webauthn.clientExtensionResults` (`client.mjs` lines 12–55). This settles
  round 1's "unconfirmed" item.
- **A passkey is a primary sign-in** that creates its own session; the 2FA
  plugin never sees it. Bitwarden does the same ("Passkeys bypass two-step
  login"). A user-verified passkey is already two factors, and NIST SP
  800-63B-4 accepts syncable passkeys at AAL2
  ([NIST](https://pages.nist.gov/800-63-4/sp800-63b/syncable),
  [Yubico](https://yubico.com/blog/new-nist-guidance-on-passkeys-key-takeaways-for-enterprises)).
- **User verification is not required by default** (`userVerification:
  "preferred"`, `requireUserVerification: false`). Enforce it in
  `authentication.afterVerification` by rejecting when `userVerified` is false.
- **A passkey gesture is a free step-up:** verifying creates a new session with
  a fresh `createdAt`, which satisfies `freshAge` (one day, `create-auth.ts`).
  Registering a passkey needs a fresh session by default.
- Out of the box a passkey cannot be a second factor *after* Google; the design
  below avoids needing that.

### PRF support, late 2026

From Corbado (August 2026 snapshot, updated 29 September 2026,
[Corbado](https://www.corbado.com/blog/passkeys-prf-webauthn)), cross-checked
against mera's live-tested matrix (rows dated 2026-06 to 2026-10,
[mera](https://mera.category.xyz/authenticator-support/)); community
percentages come from small samples.

| Authenticator / browser | PRF | Notes |
|---|---|---|
| iCloud Keychain, iOS/iPadOS 18+, macOS 15+ (Safari 18+, Chrome 132+, Firefox 139+ on macOS) | Yes; hybrid yes | iOS 18.0–18.3 hybrid data-loss bugs, fixed from 18.4 |
| Google Password Manager, Android and signed-in desktop Chrome | Yes; hybrid yes | The most complete; some sources give Chrome 136+ desktop and 142+ Android (*uncertain*) |
| Chrome *profile* passkeys (not saved to GPM) | **No** | `getClientCapabilities()` can still claim PRF |
| Windows Hello, 24H2/25H2 with the February 2026 update | Yes with Chrome/Edge 147+, Firefox 148+ | Older builds none; Chrome/Edge ≤146 return nothing on create |
| Microsoft Password Manager | Create only | Every get with PRF fails |
| Firefox desktop | Yes (148+) | Android 149+ reported; hybrid not measured ([Mozilla bug 1863819](https://bugzilla.mozilla.org/show_bug.cgi?id=1863819)) |
| 1Password | Yes in Corbado's data | Extension output non-spec-compliant in Chrome and Firefox since May 2026 (FS-5593); Safari works |
| Bitwarden (as authenticator) | Unreliable | None on macOS Chrome; 0% iOS Safari; 29% Android |
| Proton Pass, Keeper, Enpass, KeePassDX | Yes | |
| Dashlane, NordPass | No | |
| Samsung Pass | Get only | |
| Security keys (YubiKey 5.2+) | Yes in Chrome and Firefox | Safari 26.4+ partial ([WebKit 311099](https://bugs.webkit.org/show_bug.cgi?id=311099), [WebKit 314934](https://bugs.webkit.org/show_bug.cgi?id=314934)) |

Design consequences: **PRF is an enhancement, not a dependency** (every passkey
must sign in without it, with a fallback unlock); do not trust PRF at
registration, but register and then do one immediate `get` to read the value;
trust the output, not the capability flag (wrap only after a second `get`
returns the same bytes, which catches the 1Password bug); use a fixed
client-set salt such as SHA-256 of `"nicbk.com key-wrap v1"`; hybrid (phone QR)
carries PRF for iCloud Keychain (18.4+) and GPM.

### Recommended: passkey-first, optional 2FA

**A passkey is the optional 2FA, and the same gesture unlocks the library. The
recovery code is mandatory, shown once at encryption setup. No TOTP at first**
(question R2-1). Passkey-first beats TOTP because it is fewer steps than today
(one Face ID or fingerprint instead of the Google round trip), has no codes,
resists phishing, **unlocks the data on a new device** (TOTP never can), avoids
the `twoFactor` bookkeeping, and is open source (WebAuthn, SimpleWebAuthn). TOTP
is an optional phase 2 for a user who wants a factor independent of their
passkey provider.

The flows:

- **A. Key setup (everyone, mandatory, also the migration step).** Continue with
  Google; then "Your library is encrypted so only you can read it. Save your
  recovery code…" shown once with Copy, Download recovery kit and Print, confirmed
  by typing the last group or ticking "I saved it" (planning decides); then
  "Make unlocking automatic on this device? Add a passkey". With PRF: "This
  passkey now signs you in and unlocks your library." Without PRF: "This passkey
  signs you in. On new devices you will still unlock with your recovery code or
  another device." Not now: a device key keeps daily use gesture-free until
  Safari's 7-day storage cap or a sign-out.
- **B. Turning on 2FA (one switch).** Settings → Security: "Require a passkey to
  sign in" (enabled once a passkey exists), the passkey list with provider name
  and "backed up" state, recovery code status ("Saved on 12 Nov 2026 ·
  Regenerate"), optionally a Google 2SV nudge. Turning it on asks for a passkey
  gesture; turning it off, removing the last passkey, regenerating the code or
  resetting encryption needs a passkey gesture or the recovery code.
- **C. Daily sign-in.** "Sign in with passkey" (primary, with autofill) signs
  in and unlocks in one gesture; "Continue with Google" stays. A 2FA user who
  picks Google is sent to "Confirm with your passkey", with "Lost your passkey?
  Use your recovery code." below. **The gate:** one small after-hook on
  `/callback/:id` deletes the just-created session and cookie for a
  "passkey required" user and redirects; it withholds the whole session, and a
  test asserts that no session cookie survives the callback. Checking that the
  passkey belongs to the user Google named, through a short signed hint cookie,
  is *to be decided in planning*.
- **D. A new device.** Synced PRF passkey: signed in and unlocked, nothing
  typed (also by phone QR). Passkey without PRF, or no passkey: signed in, then
  "Unlock your library" by device approval or the recovery code. Afterwards,
  offer "Add a passkey for this device".
- **E. Lost passkey, code at hand.** The code unwraps the key in the browser and
  proves itself to a small custom endpoint, which creates the session; the app
  then forces a new passkey and **rotates the recovery code**.
- **F. Total loss.** The account is reachable through Google, possibly with
  operator help to clear "passkey required" (safe under zero-access, but it
  needs a written verification procedure, because an attacker who gets 2FA
  cleared can delete the library or swap the public key). The data is gone (E2);
  "Reset encryption" deletes the unreadable library and starts a new key pair
  and code, keeping paid status, role and quotas.

### Open choice: one recovery code or two

Better Auth's backup codes are a second code set that the server can read, so
they cannot double as the data recovery code; two codes is one too many for
users. **Proposal: one code**, from which the browser derives two values with
HKDF under different labels: `K_wrap`, which never leaves the browser and
unwraps the private key, and `V_auth`, sent to the server and checked against a
stored hash (an SRP/OPAQUE-lite verifier; the code is high-entropy, so a hash
suffices). HKDF outputs are independent, so `V_auth` reveals nothing about
`K_wrap`. It is a small custom Better Auth plugin endpoint on public plugin APIs
(`createAuthEndpoint`, `setSessionCookie`), and it **replaces** Better Auth's
backup codes instead of adopting them: a deviation from an adopted foundation,
which AGENTS.md says to raise with the user (question R2-2). **The fallback:**
keep the `twoFactor` plugin's backup codes and print both on one recovery kit
with clear labels. Either way the code has at least 128 bits of entropy (for
example 26 base32 characters in groups); no slow KDF is needed.

### Effort and checks for the plan

- The passkey plugin, PRF wrap and unlock, the gate hook, security settings and
  the recovery-code endpoint fit inside round 1's 3–4 weeks of key management.
  TOTP (phase 2) adds about a week, mostly the callback-gate spike and tests.
- Spikes: PRF on the user's own devices (the iPhone, Chrome with GPM, Windows
  Hello); the `/callback/:id` after-hook under TanStack Start with
  `tanstackStartCookies()` last in the plugin list.
- Upgrade `better-auth` and `@better-auth/passkey` together, and re-check
  `signInPaths` at every upgrade.
- Google `amr` only if a nudge or admin gate is wanted (verified app plus
  `genericOAuth`); not recommended now.

## Sources

Better Auth (code read from npm tarballs: better-auth 1.6.25, 1.6.34, 1.7.21, 1.8.0-beta.8; @better-auth/core 1.6.25; @better-auth/passkey 1.6.25)
- `dist/plugins/two-factor/index.mjs`, `verify-two-factor.mjs`, `backup-codes/index.mjs`, `totp/index.mjs`; `dist/utils/password.mjs`; `dist/api/routes/callback.mjs`; `dist/plugins/generic-oauth/routes.mjs`; core `social-providers/google.mjs`, `oauth2/create-authorization-url.mjs`; passkey `dist/index.mjs`, `dist/client.mjs`.
- [1.6 2FA docs](https://better-auth.com/docs/1.6/plugins/2fa), [.md](https://better-auth.com/docs/1.6/plugins/2fa.md); [1.6 passkey docs](https://better-auth.com/docs/1.6/plugins/passkey).
- [newreleases 1.6.4](https://newreleases.io/project/npm/better-auth/release/1.6.4), [1.7.0-beta.2](https://newreleases.io/project/npm/better-auth/release/1.7.0-beta.2) — #9122 and its revert, #9205.
- [Corgea CVE-2026-67337](https://corgea.com/advisories/vulnerabilities/CVE-2026-67337); [dev.to: 2FA on OAuth](https://dev.to/zntb/adding-2fa-to-oauth-logins-in-nextjs-16-with-better-auth-2eep) (not recommended).

Google
- [Security bundle](https://developers.google.com/identity/siwg/security-bundle), [announcement 2026-06-16](https://developers.googleblog.com/en/enhance-security-and-trust-new-session-metadata-in-sign-in-with-google/), [OIDC reference](https://developers.google.com/identity/openid-connect/reference), [Apigee community](https://community.apigee.com/gc/Apigee/How-to-check-if-a-Google-user-have-MFA-enabled/m-p/607462) (*superseded / uncertain*).
- [GPM passkey security](https://security.googleblog.com/2022/10/SecurityofPasskeysintheGooglePasswordManager.html), [GPM PIN 2024](https://blog.google/innovation-and-ai/technology/safety-security/google-password-manager-passkeys-update-september-2024/), [on-device encryption help](https://support.google.com/accounts/answer/11350823).

Passkeys and PRF
- [Corbado (updated 2026-09-29)](https://www.corbado.com/blog/passkeys-prf-webauthn), [mera](https://mera.category.xyz/authenticator-support/), [Yubico PRF guide](https://developers.yubico.com/WebAuthn/Concepts/PRF_Extension/Developers_Guide_to_PRF.html).
- [1Password community FS-5593](https://www.1password.community/developers-69/browser-extension-webauthn-prf-extension-not-spec-compliant-24672), [WebKit 311099](https://bugs.webkit.org/show_bug.cgi?id=311099), [WebKit 314934](https://bugs.webkit.org/show_bug.cgi?id=314934), [Mozilla 1863819](https://bugzilla.mozilla.org/show_bug.cgi?id=1863819).
- [Bitwarden: log in with passkeys](https://bitwarden.com/help/login-with-passkeys/), [Apple escrow](https://support.apple.com/en-ca/guide/security-pdf/sec3e341e75d/web), [heise](https://heise.de/-10452032), [youngju.dev](https://www.youngju.dev/transcribe/2026-07-16-passkey-credential-exchange-half-shipped.en), [NIST syncable](https://pages.nist.gov/800-63-4/sp800-63b/syncable), [Yubico on NIST](https://yubico.com/blog/new-nist-guidance-on-passkeys-key-takeaways-for-enterprises).


Repository
- `src/auth/create-auth.ts` (Google only, `freshAge` of one day, `disableIpTracking`, `tanstackStartCookies` last), `src/auth/auth-client.ts`, `package.json` (better-auth ^1.6.25), `high-level-guidance/design/DESIGN.md` ("every component is open source"; Google is the auth exception).
