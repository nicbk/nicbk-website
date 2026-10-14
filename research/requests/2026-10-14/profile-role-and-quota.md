# Request: The Profile Shows and Changes the Role

Source: [as-written.md](./as-written.md): the "We also update the profile
pop-up" bullet and the "In the current app, the profile also shows" bullet,
with all its sub-bullets.
Path: **research → plan → implement**, per the user.
Related:
- [roles-and-billing.md](./roles-and-billing.md);
- [quotas.md](./quotas.md).

Builds on the profile pop-up and account-deletion confirmation from feature #6,
[`authentication`](../../../features/authentication/description.md)
(the user settings modal).

## The user's words

> We also update the profile pop-up to now include the current user role.

> In the current app, the profile also shows the current quota/limits for the
> user in the app given their role.
> * e.g. for now since we have the literature tracker, in the literature
>   tracker the user sees their quota given their role for total storage and
>   network bandwidth.
> * A user can also change their role from the profile pop-up.
> * the change in quota that a user gets is conveyed to them in a clear manner
>   when they select a new role that they wish to change to.
> * furthermore, when changing roles is a destructive operation to their data
>   (e.g. they go down a role under which their current storage usage exceeds
>   the new quota), then the user has to do a confirmation and is explicitly
>   asked if they are sure they want to undertake the destructive operation
>   (similar to the confirmation process for deleting the account).
> * also if the user is going down a role and they have already exceeded other
>   quotas at the lower role, then they are also notified about this as well
>   when asked to confirm if they want to go down in role (e.g. network
>   bandwidth may be exceeded for the lower role)

## Requirements

| ID | Requirement | The user's words |
|---|---|---|
| U1 | The profile pop-up shows the user's **current role**. | "update the profile pop-up to now include the current user role" |
| U2 | **In the current app**, the profile shows the user's **quota and limits** for their role. The display depends on the app the user is in. | "In the current app, the profile also shows the current quota/limits for the user in the app given their role" |
| U3 | In the Literature Tracker, that means **total storage** and **network bandwidth**: usage against the role's limit. | "in the literature tracker the user sees their quota given their role for total storage and network bandwidth" |
| U4 | The user can **change their role from the profile pop-up**. | "A user can also change their role from the profile pop-up" |
| U5 | When they **select a new role**, the **change in quota** is shown **clearly** before they commit. | "the change in quota that a user gets is conveyed to them in a clear manner when they select a new role that they wish to change to" |
| U6 | When a role change is **destructive to their data**, they must **confirm explicitly**. Example: going down to a role whose storage quota is below their current usage. They are asked if they are sure, **like the account-deletion confirmation**. | "when changing roles is a destructive operation to their data (e.g. they go down a role under which their current storage usage exceeds the new quota), then the user has to do a confirmation and is explicitly asked if they are sure they want to undertake the destructive operation (similar to the confirmation process for deleting the account)" |
| U7 | When going down, they are **also told about every other quota already exceeded** at the lower role (e.g. this month's bandwidth), in the same confirmation. | "also if the user is going down a role and they have already exceeded other quotas at the lower role, then they are also notified about this as well when asked to confirm if they want to go down in role (e.g. network bandwidth may be exceeded for the lower role)" |

## Questions the research and plan must answer

- **U6, what exactly is destroyed.** Over the lower quota, which data goes?
  Newest uploads first, oldest first, or does the user choose? Does deletion
  happen at once, at the paid period's end, or after a grace period? The user
  calls it "destructive", so the confirmation must name what will be lost.
- **U4 with billing.** Going up to paid means a checkout with the payment
  processor. Going down means cancelling the subscription. When the role drops
  depends on [roles-and-billing.md](./roles-and-billing.md). Administrator is
  fixed by `.env`, so it is presumably not a choice here. To confirm with the
  user.
- **U2, "in the current app".** Where the profile pop-up opens from (the site
  header, the tracker header) decides which app's quota it shows. Decide what it
  shows outside any app (e.g. on the blog).
- **The account-deletion confirmation** is the model for U6. Read it in the code
  before designing, and reuse it rather than building a second one.
