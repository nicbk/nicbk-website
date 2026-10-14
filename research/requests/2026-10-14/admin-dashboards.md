# Request: Administrator Dashboards

Source: [as-written.md](./as-written.md): the two "Administrator accounts
should have a new dashboard page" and "From the literature tracker app
administrators" bullets, with the privacy sub-bullet.
Path: **research → plan → implement**, per the user.
Related:
- [roles-and-billing.md](./roles-and-billing.md), which defines
  administrators;
- [data-privacy-and-hardening.md](./data-privacy-and-hardening.md), the
  privacy constraint these dashboards must respect.

## The user's words

> Administrator accounts should have a new dashboard page (accessible via a tab
> at the top navbar) which for now gives registered account information and
> statistics across the nicbk-website platform. (for now the one application we
> have is the literature tracker, and the blog articles are statically written
> for now so we don't manage those on the dashboard either)

> From the literature tracker app administrators also have an in-app dashboard
> page view where they can look at user-specific statistics (amount of data
> stored by the user in the app and the amount of total network bandwidth used
> by the user in the app in the current billing month as well).
> * and, given our user privacy constraints, we are unable to view specific user
>   data such as the documents the user has uploaded or any associated data such
>   as annotations, tags, etc; administrators only have access to these overall
>   non-specific stats.

## Requirements

### The site dashboard

| ID | Requirement | The user's words |
|---|---|---|
| D1 | A **new dashboard page** for administrators only. | "Administrator accounts should have a new dashboard page" |
| D2 | Reached by a **tab in the top navbar**, the site header. Shown only to administrators. | "accessible via a tab at the top navbar" |
| D3 | For now it shows **registered account information** and **platform-wide statistics** for nicbk-website. | "gives registered account information and statistics across the nicbk-website platform" |
| D4 | It does **not manage blog posts**. They are static files. The only app today is the Literature Tracker. | "the blog articles are statically written for now so we don't manage those on the dashboard either" |

### The Literature Tracker's dashboard

| ID | Requirement | The user's words |
|---|---|---|
| D5 | Inside the Literature Tracker, administrators get an **in-app dashboard page**. | "From the literature tracker app administrators also have an in-app dashboard page view" |
| D6 | It shows **per-user statistics**: data stored by each user in the app, and network bandwidth used by each user in the app in the **current billing month**. | "user-specific statistics (amount of data stored by the user in the app and the amount of total network bandwidth used by the user in the app in the current billing month as well)" |

### Privacy

| ID | Requirement | The user's words |
|---|---|---|
| D7 | Administrators **cannot view any user's content**: no documents, annotations, tags, or other data tied to them. Only these **overall, non-specific statistics**. This must hold by construction (cf. [data-privacy-and-hardening.md](./data-privacy-and-hardening.md)), not only because the dashboard hides it. | "we are unable to view specific user data such as the documents the user has uploaded or any associated data such as annotations, tags, etc; administrators only have access to these overall non-specific stats" |

## Questions the research and plan must answer

- **D3, what "registered account information" may include** within D7:
  - Reading: the account list (identifier, name, email, sign-up date, role,
    last active) and platform totals (accounts, by role, storage, bandwidth,
    paying users).
  - Whether email and name are acceptable is a privacy decision to confirm
    with the user.
- **D6 with D7.** Per-user byte counts are the stats the user named. A count of
  papers per user may already say too much. The plan lists exactly which fields
  appear.
- **The "current billing month"** for a regular user with no billing period.
  See [quotas.md](./quotas.md).
- **Server-side authorization.** Admin queries must check the `.env`-designated
  identity on the server
  ([roles-and-billing.md](./roles-and-billing.md), R3–R5). Hiding the tab is
  not access control.
- **Admin actions.** Are there any beyond viewing: changing a user's role,
  deleting an account, resetting a quota? The user described viewing only.
  Nothing more is assumed.
