import { createFileRoute } from '@tanstack/react-router'
import { SiteShell } from '~/routes/-shared/components/site-shell/site-shell'
import { signInSearchSchema } from './-sign-in-page/search-schema'
import { SignInPage } from './-sign-in-page/sign-in-page'

/**
 * `/sign-in` — the site-wide sign-in entry point, shared by every
 * sub-application that needs auth rather than owned by any one of them
 * (research/ui-ux/pages/site-wide/pages/sign-in.md). That is why it sits at the
 * route root instead of inside the `(personal-site)` group: the personal site
 * has no protected pages, and the users who arrive here are on their way to the
 * Lit Tracker.
 *
 * Being outside that group means it renders `SiteShell` itself — the same
 * header and focusable `<main>` the group's layout supplies, and the same way
 * the root-level 404 and error pages get it (`__root.tsx`).
 *
 * `validateSearch` makes the return-to destination and the OAuth error code
 * first-class URL state, which is what lets Better Auth hand control back to
 * this page after a failed round trip with nothing shared between them but the
 * URL. `head()` sets the page's own title and description — and unlike the blog
 * post pages, which title themselves alone, this one keeps the site name in the
 * tab: sign-in is the page where a user most needs to be certain whose site
 * they are handing a Google account to.
 */
export const Route = createFileRoute('/sign-in')({
  validateSearch: signInSearchSchema,
  head: () => ({
    meta: [
      { title: 'Sign in · Nicolás Kennedy' },
      {
        name: 'description',
        content: 'Sign in with Google to use the academic literature tracker.',
      },
    ],
  }),
  component: SignInRoute,
})

function SignInRoute() {
  const { returnTo, error } = Route.useSearch()
  return (
    <SiteShell>
      <SignInPage returnTo={returnTo} error={error} />
    </SiteShell>
  )
}
