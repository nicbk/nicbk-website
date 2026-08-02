import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { requireAuth } from '~/auth/require-auth'
import { SiteShell } from '~/routes/-shared/components/site-shell/site-shell'
import { UserSettings } from '~/routes/-shared/components/user-settings/user-settings'
import styles from './user-settings-probe.module.css'

/**
 * TEST-ONLY mount point for the user-settings modal. It exists because the
 * modal ships before anything that opens it: the avatar trigger lives in the
 * Lit-Tracker header and arrives with #7, so without this there would be no
 * running page on which to exercise focus trapping, theming, or the delete
 * flow against a real server. Same idea, and the same gating, as
 * `/error-probe` next door.
 *
 * It is inert in production:
 *
 * - Gated behind the build-time flag `VITE_E2E_USER_SETTINGS_PROBE`, which
 *   only the sign-in e2e's server sets (scripts/e2e-auth-server.mjs). Vite
 *   inlines `import.meta.env` at build time, so a production build has it
 *   unset and this route always takes the `notFound()` branch — the shipped
 *   bundle doesn't even contain the flag.
 * - Unset (i.e. always, in production): `/user-settings-probe` renders the
 *   ordinary 404 page, indistinguishable from any other unknown URL.
 *
 * When it *is* enabled it is still behind the route guard, so it is also the
 * first real consumer of `requireAuth` — a signed-out visitor is redirected to
 * `/sign-in` and carried back here afterwards, exactly as a Lit-Tracker page
 * will be.
 *
 * Kept at the routes root (outside the `(personal-site)` group) because it is
 * not part of the personal site; it borrows the shared shell the same way the
 * sign-in page does.
 */
export const Route = createFileRoute('/user-settings-probe')({
  beforeLoad: async (context) => {
    // biome-ignore lint/complexity/useLiteralKeys: vite/client's ImportMetaEnv exposes custom keys only via its index signature, which noPropertyAccessFromIndexSignature forbids reading with dot access
    if (import.meta.env['VITE_E2E_USER_SETTINGS_PROBE'] !== '1') {
      throw notFound()
    }
    return { auth: await requireAuth(context) }
  },
  component: UserSettingsProbe,
})

function UserSettingsProbe() {
  const { auth } = Route.useRouteContext()
  const navigate = useNavigate()

  // Both actions leave nothing signed in behind them, so the probe goes home
  // rather than sitting on a guarded page with a session that no longer
  // exists.
  const leave = () => void navigate({ to: '/' })

  return (
    <SiteShell>
      <div className={styles.page}>
        <h1 className={styles.title}>user settings probe</h1>
        <p className={styles.explanation}>
          A test-only page that mounts the shared account-settings modal until
          the Lit-Tracker header supplies its avatar trigger.
        </p>
        <UserSettings
          email={auth.user.email}
          triggerLabel="Account settings"
          triggerClassName={styles.trigger}
          onSignedOut={leave}
          onDeleted={leave}
        >
          account
        </UserSettings>
      </div>
    </SiteShell>
  )
}
