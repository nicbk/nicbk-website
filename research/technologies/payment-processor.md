# Payment Processor

Researched: 2026-10-14. Decided: not yet — awaiting the user.

Which payment processor bills the $5/month "paid" role, and how a subscription
drives that role. Answers **R8**, **R9** and **R11** of
[roles-and-billing.md](../requests/2026-10-14/roles-and-billing.md), and the
billing parts of **U4** (changing role from the profile) in
[profile-role-and-quota.md](../requests/2026-10-14/profile-role-and-quota.md).
How the role itself is resolved is in
[../system-architecture/roles-and-administrators.md](../system-architecture/roles-and-administrators.md);
consumer-law duties in
[../security-privacy/operator-liability-and-policies.md](../security-privacy/operator-liability-and-policies.md#charging-money-the-5month-role).
Every question below is collected in
[decisions.md](../requests/2026-10-14/decisions.md).

**This needs an exception to the project's open-source rule.**
[DESIGN.md](../../high-level-guidance/design/DESIGN.md) allows only the
authentication method as an exception. Every processor is a closed, hosted
service (Polar's code is open source, but the merchant-of-record role is a
legal service no self-hosted copy provides). The user must approve the
exception before any option is chosen (question RB1).

**Summary.**

- Every option gives a hosted checkout and a hosted customer portal, so the app
  never touches card data.
- The real choice is **merchant of record** (the vendor is the legal seller and
  files sales tax and VAT; about $4.25 net per $5) or **plain processor**
  (Stripe; about $4.52 net, but the operator is the seller).
- **Tax decides it, not fees.** Non-EU sellers owe EU VAT from the first
  consumer sale; without a merchant of record, selling to EU/UK users means
  VAT registration or blocking them.
- **Recommended: Polar** through its official Better Auth plugin. **Fallback:
  Stripe Billing** with the official `@better-auth/stripe` plugin.

Source caveat: most vendor sites were blocked in the research environment.
Polar facts come from its docs' source in its public GitHub repository, Better
Auth facts from its repository at tag v1.6.33 and npm metadata. **Stripe,
Paddle, Lemon Squeezy, Creem and Dodo facts come from web-search summaries**
and are marked *uncertain* where unconfirmed; re-check them on the vendor page
before deciding.

## Options

### Fees on a $5.00 charge

US card, price tax-exclusive (the merchant of record adds tax on top).

| Option | Fee formula | Fee on $5 | Net per subscriber-month |
|---|---|---|---|
| Stripe Billing + Checkout (operator is seller) | 2.9% + 30¢, plus 0.7% Billing | $0.48 | **$4.52** *(uncertain on exact 2026 figures)* |
| Stripe Managed Payments (Stripe as merchant of record) | Stripe fees + 3.5% | ~$0.655 | ~$4.35 *(uncertain; GA 2026-04-29; eligibility unconfirmed)* |
| **Polar** (new organization) | **5% + $0.50** | $0.75 | **$4.25** |
| Paddle | 5% + 50¢ all-in | $0.75 | $4.25 *(secondary source)* |
| Lemon Squeezy | 5% + 50¢, +0.5% subscriptions | $0.775 | $4.225 *(secondary source)* |
| Creem | 3.9% + 40¢ headline | $0.595 | ~$4.40 *(uncertain; surcharges possible)* |
| Dodo Payments | 4% + 40¢, +0.5% subscriptions | $0.625 | ~$4.375 *(uncertain)* |

**Polar's fee, as verified.** Polar's own blog post
"[Introducing Polar Plans](https://polar.sh/blog/introducing-polar-plans)"
announces 5% + $0.50 for organizations created on or after 2026-05-27, with
existing organizations grandfathered. Polar's published fees page still shows
the older 4% + 40¢. A new organization should plan on 5% + $0.50. Polar's paid
Pro plan (3.8% + 40¢ for $20/month) only pays off above about $1,379 a month
in sales. With 7% sales tax Polar computes its fee on the tax-inclusive total,
about $0.77.

**Payout overhead is extra.** Polar pays out through Stripe Connect Express at
cost: $2 for each month with a payout, plus 0.25% + $0.25 per payout. One
monthly payout costs about half a subscriber-month, so batch withdrawals.
Settlement is delayed 7 days for organizations created on or after 2026-05-12.
Paddle needs $100 accumulated before the first payout.

### Tax and merchant of record

| Option | Merchant of record? | For a solo operator |
|---|---|---|
| Polar, Paddle, Lemon Squeezy, Creem, Dodo, Stripe Managed Payments | Yes | The vendor files and remits US sales tax and EU/UK VAT. Polar uses Stripe Tax and holds an EU OSS number. The operator still owes income tax. Trade-off (stated by Polar): the vendor's volume counts toward tax thresholds, and input VAT cannot be reclaimed |
| Stripe direct | **No** | The operator calculates (Stripe Tax +0.5%, which does not file), registers and remits. EU: non-EU sellers have no threshold. UK: likewise per a vendor guide *(uncertain; confirm with HMRC)*. US: mostly $100,000 or 200 sales per state, far away; California taxes SaaS from 2027-01-01. Otherwise block EU/UK paid sign-ups |

### Better Auth integration (this project is on `^1.6`)

| Option | Plugin | Notes |
|---|---|---|
| **Polar** | `@polar-sh/better-auth`, maintained by Polar, Apache-2.0 | Use **1.8.4** with Better Auth 1.6 (2.x needs 1.7). **Adds no tables**: state lives at Polar; the app keeps its own mirror table. Links by `external_id = user.id`. Webhooks under `/api/auth/polar/webhooks`; `customer.state_changed` carries the whole state, so it is idempotent by nature. Deletes the Polar customer when the user is deleted (whether that ends a live subscription is *uncertain*: cancel first) |
| **Stripe** | `@better-auth/stripe`, official, MIT | Use the `release-1.6` line (1.6.33); plugin and core move together. Adds a `subscription` table and `user.stripeCustomerId`. Webhook handler verifies signatures but does **no event-id dedupe**. Blocks deleting an *organization* with an active subscription, not a user |
| Creem, Dodo | Vendor-maintained plugins | Less documented |
| Paddle | None found | A hand-written route and table, which conflicts with "build on what exists" |
| Lemon Squeezy | Community 0.1.0 package only | Acquired by Stripe in 2024; its own 2026 update points to Stripe Managed Payments *(secondary)* |

The `^1.6` range allows Better Auth 1.7.x on a fresh install (latest 1.7.8), so
the lockfile decides which plugin line fits; check it before choosing.

### Webhooks on a home server

Polar retries 10 times with backoff and **disables the endpoint after 10
consecutive failures** (manual re-enable). Stripe retries for up to 3 days
*(secondary)*. A home outage longer than the retry window leaves billing state
stale, so for any processor: treat webhooks as an accelerator and **reconcile by
polling** the processor's API (on profile open and from a pg-boss cron).

### Lifecycle

| | Polar (from its docs) | Stripe + plugin |
|---|---|---|
| Cancel | At period end by default (reversible), or revoke immediately with no refund. Portal cancel is period-end | Portal cancels at period end (configurable); `status` stays active until the end |
| Failed payment | `past_due`, retries at +2, +7, +14, +21 days, then `canceled`. Configurable grace (0–21 days) before benefits are revoked | Smart Retries (defaults reported inconsistently); access during `past_due` is the app's decision |
| Refunds | Fees not refunded; refunding an order does not cancel the subscription; Polar may refund proactively within 60 days to prevent chargebacks | Dashboard/API; fee not refunded |
| Portal | Hosted, cannot be disabled; Polar's docs say it satisfies California's "cancel the way you signed up" | Customer Portal; sessions expire after 5 minutes |
| Onboarding | Individuals allowed where Stripe Connect Express allows; Stripe Identity (ID + selfie); review up to 14 days; bank in the account's own country (Wise-type accounts often rejected) | Individual or sole proprietor; US needs SSN/ITIN *(secondary)* |

### How a subscription drives the "paid" role (any processor)

1. The processor is the source of truth, **mirrored into Postgres by signed
   webhooks**. Role checks read the mirror, never the browser and never the
   processor on the hot path.
2. Role is derived (admin > paid > regular), not a stored flag — see
   [roles-and-administrators.md](../system-architecture/roles-and-administrators.md).
3. One entitlement rule, with a test: `active`/`trialing` → paid;
   cancel-at-period-end → **paid until the period ends** ("ends on <date>");
   `past_due` → paid during a grace window, then regular; anything ended →
   regular.
4. Webhook discipline: verify the signature on the raw body; insert the event
   id into a `processed_billing_events` table with a unique constraint and stop
   on conflict; ignore events older than the stored object; answer 2xx fast and
   queue the work in pg-boss.
5. **Upgrade (U4):** "Go paid" opens hosted checkout; the role flips when the
   webhook or the reconcile poll lands, not on the redirect.
6. **Downgrade:** the role change deletes nothing by itself. Recommended: the
   account becomes "free and over quota" — read, export and delete allowed, new
   uploads blocked — and any deletion is an explicit user choice. **A failed
   card must never cause data loss.** (Question RB6.)
7. **Account deletion:** cancel an active subscription in `beforeDelete`, or
   the processor keeps billing a deleted user.
8. **Consent:** the upgrade screen says "$5.00 per month, renews automatically
   until you cancel", how to cancel, and what happens to data over quota after
   a downgrade; store the click in a `billing_consents` row (user, terms
   version, text shown, time).
9. **Copy (R11):** describe what the buyer gets (5 GiB, 1 GiB/month) first and
   the operating-cost purpose second, so it reads as a product, not a
   donation. Some merchants of record treat donations as a different product
   class (an inference; Polar's full acceptable-use policy was not readable).

## Recommendation

*A recommendation, not a decision.* **Polar (Starter) through
`@polar-sh/better-auth` 1.8.4**, if the user approves a third-party-service
exception.

Costs and risks: Polar's API and SDK are moving fast (date-versioned API, a new
webhook-secret scheme from 2026-09-08, the new fee model, the 7-day payout
delay), so expect maintenance; payout overhead bites at a handful of
subscribers; first review can take 14 days; Polar holds the subscription state,
so the app keeps its own mirror.

**Fallback:** Stripe Billing + Checkout + Customer Portal with
`@better-auth/stripe` (release-1.6), if the user rejects a merchant of record
or wants the lowest fee. The operator then registers for EU OSS and UK VAT or
blocks EU/UK paid sign-ups.

**Not recommended:** Paddle (no plugin; $100 minimum payout), Lemon Squeezy
(being folded into Stripe), Creem and Dodo (fewer verified facts; Creem is a
possible second look if fees matter), Stripe Managed Payments (new; eligibility
unconfirmed).

## Reasoning

- Tax is the largest solo-operator risk; a merchant of record removes it with
  no company needed. The $0.27 per subscriber over Stripe is the price of not
  doing tax.
- Polar fits "build on what exists" best: an official Better Auth plugin, no
  schema of its own, `user.id` as the link, and webhooks under `/api/auth`.
  Its server is Apache-2.0, which makes it auditable, though the dependency
  remains a hosted service.
- Its lifecycle (period-end cancel, dunning with a grace window, a hosted
  portal, one idempotent state webhook, lookup by external id) covers the
  requirements without bespoke code.

## Questions for the user

Numbered as in [decisions.md](../requests/2026-10-14/decisions.md).

- **RB1.** Approve a paid third-party payment service as an exception to the
  open-source rule? Is Polar's open-source server a tie-breaker, or do cost and
  maturity (Stripe) win?
- **RB2.** Merchant of record (Polar, ~$4.25 net), or be the seller yourself
  (Stripe, ~$4.52) and register for EU/UK VAT or block EU/UK buyers?
- **RB3.** Country of residence, individual or company, bank country and
  currency; is ID-plus-selfie verification acceptable?
- **RB4.** Which countries may buy?
- **RB5.** Does the paid role end at the period's end or at once on cancel? How
  long a grace for failed cards (suggest 7 days; Polar allows up to 21)?
- **RB7.** Refund policy: refund the current month on request within N days?
- **RB9.** Is $5 tax-exclusive or tax-inclusive? An annual plan or free trial?
- **RB10.** Approve product-first wording for R11?
- **RB11.** Payout cadence (quarterly batching suggested); is a 7-day
  settlement delay acceptable?
- **RB12.** Stay on Better Auth 1.6 (plugin 1.8.4) or move to 1.7 (Polar 2.x)?

The over-quota-after-downgrade question (RB6) and admins paying (RB8) are in
[roles-and-administrators.md](../system-architecture/roles-and-administrators.md#questions-for-the-user).

## Sources

Primary or near-primary
- [Polar — Introducing Polar Plans](https://polar.sh/blog/introducing-polar-plans) — 5% + $0.50 for organizations created on or after 2026-05-27; existing ones grandfathered (verified first-hand).
- Polar docs source on GitHub: [fees](https://raw.githubusercontent.com/polarsource/polar/main/docs/merchant-of-record/fees.mdx), [merchant of record](https://raw.githubusercontent.com/polarsource/polar/main/docs/merchant-of-record/introduction.mdx), [supported countries](https://raw.githubusercontent.com/polarsource/polar/main/docs/merchant-of-record/supported-countries.mdx), [account reviews](https://raw.githubusercontent.com/polarsource/polar/main/docs/merchant-of-record/account-reviews.mdx), [acceptable use](https://raw.githubusercontent.com/polarsource/polar/main/docs/merchant-of-record/acceptable-use/introduction.mdx), [accounts](https://raw.githubusercontent.com/polarsource/polar/main/docs/features/finance/accounts.mdx), [failed payments](https://raw.githubusercontent.com/polarsource/polar/main/docs/features/subscriptions/failed-payments.mdx), [manage subscriptions](https://raw.githubusercontent.com/polarsource/polar/main/docs/features/subscriptions/manage.mdx), [refunds](https://raw.githubusercontent.com/polarsource/polar/main/docs/features/refunds.mdx), [customer portal](https://raw.githubusercontent.com/polarsource/polar/main/docs/features/customer-portal/introduction.mdx), [webhook delivery](https://raw.githubusercontent.com/polarsource/polar/main/docs/integrate/webhooks/delivery.mdx), [customer state](https://raw.githubusercontent.com/polarsource/polar/main/docs/integrate/customer-state.mdx), [Better Auth adapter README](https://raw.githubusercontent.com/polarsource/polar/main/clients/adapters/better-auth/README.md), [LICENSE](https://raw.githubusercontent.com/polarsource/polar/main/LICENSE) — plans, payouts, tax, onboarding, lifecycle, webhooks, plugin, Apache-2.0.
- Better Auth v1.6.33: [Stripe plugin docs](https://raw.githubusercontent.com/better-auth/better-auth/v1.6.33/docs/content/docs/plugins/stripe.mdx), [schema.ts](https://raw.githubusercontent.com/better-auth/better-auth/v1.6.33/packages/stripe/src/schema.ts), [routes.ts](https://raw.githubusercontent.com/better-auth/better-auth/v1.6.33/packages/stripe/src/routes.ts), [Polar](https://raw.githubusercontent.com/better-auth/better-auth/v1.6.33/docs/content/docs/plugins/polar.mdx), [Creem](https://raw.githubusercontent.com/better-auth/better-auth/v1.6.33/docs/content/docs/plugins/creem.mdx), [Dodo](https://raw.githubusercontent.com/better-auth/better-auth/v1.6.33/docs/content/docs/plugins/dodopayments.mdx) — plugin tables, endpoints, webhook handling.
- npm registry: [@better-auth/stripe](https://registry.npmjs.org/@better-auth/stripe), [better-auth](https://registry.npmjs.org/better-auth), [@polar-sh/better-auth](https://registry.npmjs.org/@polar-sh/better-auth), [@dodopayments/better-auth](https://registry.npmjs.org/@dodopayments/better-auth), [@creem_io/better-auth](https://registry.npmjs.org/@creem_io/better-auth), [better-auth-lemonsqueezy](https://registry.npmjs.org/better-auth-lemonsqueezy), [@paddle/paddle-node-sdk](https://registry.npmjs.org/@paddle/paddle-node-sdk) — versions, peer ranges, licences.

Secondary (search summaries)
- Stripe: [Checkout policies](https://docs.stripe.com/payments/checkout/customization/policies), [portal](https://docs.stripe.com/customer-management/configure-portal), [portal integration](https://docs.stripe.com/billing/subscriptions/integrating-customer-portal), [Managed Payments](https://docs.stripe.com/managed-payments), [GA announcement](https://x.com/stripe/status/2049532106712453307), [pricing](https://stripe.com/pricing), [flexprice](https://flexprice.io/blog/stripe-pricing-breakdown-2026), [checkoutpage](https://checkoutpage.com/blog/stripe-processing-fees), [sole proprietor](https://support.stripe.com/questions/signing-up-for-stripe-as-a-sole-proprietor-without-employer-id-number), [hookdeck](https://hookdeck.com/webhooks/platforms/guide-to-stripe-webhooks-features-and-best-practices), [smart retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries/pause-on-payment-failure).
- Managed Payments cost: [Dodo blog](https://dodopayments.com/blogs/stripe-managed-payments-fees-explained), [Freemius](https://freemius.com/blog/stripe-merchant-of-record/) (vendor-affiliated).
- Paddle: [payouts](https://www.paddle.com/help/manage/get-paid), [verification](https://www.paddle.com/help/start/account-verification/what-is-account-verification), [webhooks](https://developer.paddle.com/webhooks/about), [cancel](https://developer.paddle.com/build/subscriptions/cancel-subscriptions), [portal](https://developer.paddle.com/concepts/sell/customer-portal), [fees (competitor blog)](https://dodopayments.com/blogs/paddle-fees-explained).
- Lemon Squeezy: [fees](https://docs.lemonsqueezy.com/help/getting-started/fees), [eden.so](https://eden.so/blog/lemon-squeezy-alternatives/), [Dodo review](https://dodopayments.com/blogs/lemonsqueezy-review), [2026 update](https://www.lemonsqueezy.com/blog/2026-update) (title only).
- Creem: [payout accounts](https://docs.creem.io/merchant-of-record/finance/payout-accounts), [payouts](https://docs.creem.io/merchant-of-record/finance/payouts). Dodo: [pricing](https://dodopayments.com/pricing).
- Consumer law: [Jones Day](https://www.jonesday.com/en/insights/2026/05/ftc-revives-clicktocancel-rule-new-risks-for-subscription-businesses), [Steptoe](https://www.steptoe.com/en/news-publications/ftcs-click-to-cancel-rule-vacated-by-eighth-circuit.html), [Gibson Dunn](https://www.gibsondunn.com/ftc-restarts-negative-option-rulemaking-after-eighth-circuit-vacatur-enforcement-under-rosca-continues/), [Cooley](https://www.cooley.com/news/insight/2025/2025-06-04-california-automatic-renewal-law-amendments-take-effect-on-july-1-2025).
- Tax: [ICAEW](https://www.icaew.com/technical/tax/tax-faculty/taxguides/2020/taxguide-2020-new-vat-ecommerce-rules-in-eu-from-1-july-2021-how-will-they-affect-uk-businesses), [EAS project](https://help.easproject.com/hc/en-gb/articles/5371372277791-EU-UK-VAT-registration-guide-2026-which-registrations-you-need-scenario-by-scenario), [Dodo — sales tax by state](https://dodopayments.com/blogs/sales-tax-digital-goods-by-state), [Cozen O'Connor](https://www.cozen.com/news-resources/publications/2026/california-and-colorado-join-the-feast-sales-and-use-tax-to-be-imposed-on-digital-software-and-saas-).
