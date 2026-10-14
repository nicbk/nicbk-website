# The Requests of 2026-10-14, As Written

The user's message of 2026-10-14, copied exactly, with nothing corrected or
reordered. It is the source every other file in this folder is checked
against. When an itemized file and this one disagree, this one wins, and the
itemized file is the one to fix.

---

* let's make the outline list collapsible (oftentimes the outline is hierarchical, and as currently shown, all headings are listed linearly which is too much on certain documents. Instead, the outline should be fully collapsed when accessed for the first time. Then, similar to how the scroll position in the page is preserved, let's also preserve the current collapse state of the outline for future accesses of the document.

* As other people start using my app publically, let's start to ensure certain safeguards on user data and privacy:
  * (since the literature tracker is the current public facing app then this is where we discuss the following safeguards; but the guidance we decide upon will also apply to future features and apps I build on my website).
  * we already have separate document stores for different users; thus we can prevent DMCA type issues so that users don't upload pirated documents that are publically accessible by other users.
  * But, I want to add data privacy restrictions, which furthermore protects me from users uploading illicit content:
    * e.g. is it possible for us to use client-side encrypted data (which can still be accessed across multiple devices?)
  * any other considerations for hardening the app/adding things to the design for a production general users.
  * furthermore, for existing users and data, we should create a job which automatically and seamlessly transitions existing user data into the new hardened scheme (where after the transition is done then we can remove the old unencrypted functions and then remove the transition job)
* well-defined periodic backup job that exports all nicbk-website information sufficient to immediately re-launch the platform idempotently from the backup checkpoint in case something happens to the currently running node(s).
* Design an administrator role for nicbk-website:
defined by hardcoded identifiers in the .env file (referencing BetterAuth accounts that are designated to be administrators). Note that we should reference unique IDs, not IDs that re-appear if an account is deleted then re-created (otherwise it may be possible to designate a current user as an admin, then they remove their account, then someone else creates an account with the same identifier as used in the .env file and then gains administrator status automatically).
* Then, let's also design a "paid" account role which bills at $5/month (we can research the best payment processor to use to hook into this).
* Regular users (with no role) should have total stored uploads limited to 25 MiB.
* Furthermore, the regular users should have total network bandwidth limited to 50 MiB per month.
* Upon reaching such an account limit, then the user should have a pop-up that they reached the free account limits and to support the service operating costs then they can upgrade to the "paid" role in order to support the service operating costs and have limits raised to 5 GiB total stored uploads along with total network bandwidth of 1 GiB per month.
* We also update the profile pop-up to now include the current user role.
* In the current app, the profile also shows the current quota/limits for the user in the app given their role.
  * e.g. for now since we have the literature tracker, in the literature tracker the user sees their quota given their role for total storage and network bandwidth.
  * A user can also change their role from the profile pop-up.
  * the change in quota that a user gets is conveyed to them in a clear manner when they select a new role that they wish to change to.
  * furthermore, when changing roles is a destructive operation to their data (e.g. they go down a role under which their current storage usage exceeds the new quota), then the user has to do a confirmation and is explicitly asked if they are sure they want to undertake the destructive operation (similar to the confirmation process for deleting the account).
  * also if the user is going down a role and they have already exceeded other quotas at the lower role, then they are also notified about this as well when asked to confirm if they want to go down in role (e.g. network bandwidth may be exceeded for the lower role)
* Administrator accounts have no limit on storage or network bandwidth
* Administrator accounts should have a new dashboard page (accessible via a tab at the top navbar) which for now gives registered account information and statistics across the nicbk-website platform. (for now the one application we have is the literature tracker, and the blog articles are statically written for now so we don't manage those on the dashboard either)
* From the literature tracker app administrators also have an in-app dashboard page view where they can look at user-specific statistics (amount of data stored by the user in the app and the amount of total network bandwidth used by the user in the app in the current billing month as well).
  * and, given our user privacy constraints, we are unable to view specific user data such as the documents the user has uploaded or any associated data such as annotations, tags, etc; administrators only have access to these overall non-specific stats.

For the first feature on collapsible outline, we can plan the feature for that directly.
For all the new features on user data, backups, roles, and admin dashboards, we will need to do a research phase for those features first, and then after that we plan the features, then finally we implement.
To ensure that you retrieve each detail (every bullet point I wrote is imporant), make sure you record down every feature in detail of how I wrote it in the research folder before we continue so that we have a starting point safe from compactions from which we can do research->features->implementation as necessary.
