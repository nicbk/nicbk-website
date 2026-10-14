# Request: Storage and Bandwidth Quotas

Source: [as-written.md](./as-written.md): the two "Regular users" bullets, the
"Upon reaching such an account limit" bullet, and the administrator
no-limit bullet.
Path: **research → plan → implement**, per the user.
Related:
- [roles-and-billing.md](./roles-and-billing.md) for the roles these limits
  belong to;
- [profile-role-and-quota.md](./profile-role-and-quota.md) for showing the
  limits and changing roles.

## The user's words

> Regular users (with no role) should have total stored uploads limited to 25
> MiB.

> Furthermore, the regular users should have total network bandwidth limited to
> 50 MiB per month.

> Upon reaching such an account limit, then the user should have a pop-up that
> they reached the free account limits and to support the service operating
> costs then they can upgrade to the "paid" role in order to support the service
> operating costs and have limits raised to 5 GiB total stored uploads along
> with total network bandwidth of 1 GiB per month.

> Administrator accounts have no limit on storage or network bandwidth

## The limits

| Role | Total stored uploads | Network bandwidth |
|---|---|---|
| Regular (no role) | **25 MiB** | **50 MiB per month** |
| Paid ($5/month) | **5 GiB** | **1 GiB per month** |
| Administrator | **no limit** | **no limit** |

The units are binary (MiB, GiB), as the user wrote them.

## Requirements

| ID | Requirement | The user's words |
|---|---|---|
| Q1 | A regular user's **total stored uploads** are capped at 25 MiB. This is the sum over everything stored, not a per-file limit (the per-file upload cap is 50 MB today). | "total stored uploads limited to 25 MiB" |
| Q2 | A regular user's **total network bandwidth** is capped at 50 MiB **per month**. | "total network bandwidth limited to 50 MiB per month" |
| Q3 | On **reaching a limit**, the user sees a **pop-up**. | "Upon reaching such an account limit, then the user should have a pop-up" |
| Q4 | The pop-up says they have reached the **free account limits**. | "that they reached the free account limits" |
| Q5 | The pop-up invites them to **upgrade to "paid"** to **support the service's operating costs**. | "to support the service operating costs then they can upgrade to the "paid" role in order to support the service operating costs" |
| Q6 | The pop-up states the **raised limits**: 5 GiB stored and 1 GiB/month bandwidth. | "have limits raised to 5 GiB total stored uploads along with total network bandwidth of 1 GiB per month" |
| Q7 | Administrators are **never limited**. | "Administrator accounts have no limit on storage or network bandwidth" |
| Q8 | Usage is **per app** where shown. In the Literature Tracker, the user sees their storage and bandwidth quota for their role (see [profile-role-and-quota.md](./profile-role-and-quota.md)). | "in the literature tracker the user sees their quota given their role for total storage and network bandwidth" |

## Questions the research must answer

- **What counts as "network bandwidth"**:
  - PDF downloads, including the 304 revalidations from #21;
  - uploads;
  - Zero sync traffic;
  - page and asset loads;
  - API calls.

  Measured where: the app server, the proxy, or Caddy? Only traffic the app
  can attribute to a signed-in user can be counted.
- **Per month**: the calendar month for regular users, or the billing period
  (the admin bullet says "current billing month") for paid users? When does it
  reset?
- **What "reaching" a limit does**:
  - storage: refuse the upload that would exceed it, with the pop-up;
  - bandwidth: block further downloads until the month resets, or only warn.

  The user's wording names the pop-up but not the block.
- **Whether quotas are site-wide or per app** when there is more than one app.
  The user's wording: limits are per role, and shown "in the current app".
- **Enforcement must be on the server**, not only in the pop-up. Concurrent
  uploads must not race past the cap.
- **Encryption interaction**
  ([data-privacy-and-hardening.md](./data-privacy-and-hardening.md)): sizes
  are of what is stored, and ciphertext is measurable.
