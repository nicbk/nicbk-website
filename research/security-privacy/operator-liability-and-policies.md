# Operator Liability and Site Policies

Researched: 2026-10-14. Decided: not yet — awaiting the user.

> **This is research, not legal advice.** It summarises statutes, cases and
> commentary found on the web on 2026-10-14 so the user can decide, and can
> tell when to pay a lawyer. Points where a lawyer is warranted are marked
> **[lawyer]**. Claims resting on secondary sources only are marked
> *(uncertain)*. Primary statute sites were blocked in the research
> environment; statute text came from govinfo.gov copies and quotations in
> search results.

What actually protects a small, personally run service from liability for what
its users upload, and which policies it needs before serving the public and
charging money. Answers **P3** and **P4**, the legal parts of **P6** (terms,
privacy policy, abuse contact, age and consent), and the site-wide scope rule
of **P2**, all from
[data-privacy-and-hardening.md](../requests/2026-10-14/data-privacy-and-hardening.md);
plus the consumer-law side of the $5/month paid role (**R8**,
[roles-and-billing.md](../requests/2026-10-14/roles-and-billing.md)). Most
answers assume the operator is in the United States, which is unconfirmed
(question L1). Encryption itself is in
[user-data-encryption.md](./user-data-encryption.md); the payment processor in
[../technologies/payment-processor.md](../technologies/payment-processor.md).

**Summary.**

- **P3 is broadly right.** Private, never-shared storage is the biggest
  practical protection: nothing public to find, so nothing to send a notice
  about, and useless for distributing pirated material.
- **US law already imposes no duty to monitor** (DMCA §512(m), CSAM reporting
  §2258A(f), Section 230). Duties are triggered by *knowledge*. So
  **encryption adds little legal protection** for the operator (P4). Decide
  encryption on its privacy value to users.
- **What protects the operator:** no sharing; not looking; a registered DMCA
  agent; an abuse contact with a written process; NCMEC registration and a CSAM
  runbook; and good Terms. Half a day of writing and $6 every 3 years.
- **One pending risk:** the STOP CSAM Act could make encryption evidence of
  "recklessness". Not law as of this date. **[lawyer]** if enacted.
- **Charging money** brings ROSCA and California's Automatic Renewal Law:
  express consent, online cancellation, stored consent records.

## Options

### What protects the operator (P4)

| Option | Protection gained | Cost |
|---|---|---|
| **A. No sharing + legal hygiene** (DMCA agent, Terms, Privacy Policy, abuse contact, NCMEC registration, CSAM runbook, admins see aggregates only) | Most of what is available: out of UK OSA scope, nothing public to distribute, safe harbor in place, knowledge-triggered duties handled | Half a day of writing; $6 per 3 years; a P.O. box or agent if a home address must stay private |
| **B. A + end-to-end encryption** | Small legal increment (cannot be compelled to read; breach-notice relief); a real *user* privacy gain | Large (see [user-data-encryption.md](./user-data-encryption.md)); could become a liability argument under STOP CSAM |
| **C. A + server-side scanning** (hash-matching) | Would detect known CSAM | Not required by US law; contradicts encryption; hash lists need vetting by NCMEC or Microsoft; creates knowledge and so duties; disproportionate for an academic-PDF locker |

### Copyright: the DMCA §512(c) safe harbor (P3)

A provider storing material "at the direction of a user" is protected if it:
has no actual or "red flag" knowledge and no duty to investigate (*Viacom*,
*Veoh*); removes material expeditiously on a valid notice; gets no financial
benefit directly attributable to infringement it can control (*Ellison*: a
benefit is "direct" if infringement is a **draw**; a flat $5 storage fee not
marketed for piracy is unlikely to be one, *uncertain*, no flat-fee case found);
**registers a designated agent** ($6 per designation, renewed every 3 years, a
P.O. box needs a free waiver); and adopts and reasonably implements a
**repeat-infringer policy** (*Perfect 10 v. CCBill*). §512(m): no duty to
monitor.

- **Private storage still qualifies** (*Capitol Records v. MP3tunes* applied
  §512(c) to private lockers). Automated processing such as GROBID stays
  "by reason of storage" (*Veoh*).
- **Practical exposure falls sharply**: a notice must let the provider locate
  the material, and a rightsholder cannot see a private upload.
- **Underlying liability narrowed further.** *Cox Communications v. Sony Music
  Entertainment* was decided on 2026-03-25, 9–0: contributory liability needs
  intent (inducement, or a service tailored to infringement); knowledge is not
  enough. How lower courts apply it to storage services is *uncertain*.
- **The caveat on P3:** it holds only while no feature lets one user's upload
  reach another user. Any sharing makes the service a distribution channel and
  brings in the UK Online Safety Act. Write this into the site-wide policy
  (P2): **a feature that lets one user's content reach another user is a
  legal-scope change, not just a feature.**
- **With encryption,** takedown still works by account or article id, but the
  operator cannot verify a notice. That does not matter under §512; the user's
  remedy is a counter-notice (§512(g)). The Terms should say content may be
  removed on notices the operator cannot verify. MEGA, an encrypted host,
  removes content on valid notices ([techcentral](https://www.techcentral.ie/mega-already-fielding-150-copyright-infringement-warnings/)).

### CSAM (P4)

- **Duty (18 U.S.C. §2258A):** on **actual knowledge** of apparent CSAM, report
  to NCMEC's CyberTipline "as soon as reasonably possible". §2258A(f): no duty to
  monitor or search. In July 2026 a federal judge dismissed a suit against
  Apple for not scanning iCloud, on Section 230 grounds.
- **REPORT Act (2024):** preserve reported material for **1 year** (was 90
  days), securely; fines for knowing failure to report are $600,000 / $850,000
  for providers under 100M monthly users.
- **Registration:** whether §2258A itself requires ESP registration is
  *uncertain*. Illinois requires covered providers with Illinois ties to give
  NCMEC an agent contact (effective 2026-01-01). Practical step: register once
  with NCMEC (free) so a report can be filed fast.
- **Runbook if ever suspected (handling advice is standard practice,
  [lawyer]):** do not open, copy or forward the file beyond what is needed;
  file a CyberTipline report; preserve the report and account data for 1 year,
  access-restricted; disable the account without tipping off the user. With
  encryption, report what is known (account data, identifiers, the reporter's
  description).
- **STOP CSAM Act (S.1829):** added to the Senate's FY2027 NDAA text on
  2026-07-14 per Sen. Hawley; final text and passage unknown. In its 2025 form
  it creates civil suits against services that "recklessly" host CSAM, and per
  EFF lets encryption be introduced as evidence. The one development that could
  make encryption a liability. Realistic risk for a tiny, no-sharing PDF locker
  is low. **[lawyer]** if enacted. EARN IT: lapsed; no current version confirmed
  *(uncertain)*. TAKE IT DOWN Act (in force 2026-05-19): covers public
  forums for user content; a private locker is very likely not covered
  *(uncertain)*.

### Section 230 and legal process

- Section 230 shields the operator from being treated as publisher of user
  uploads. It does not cover federal criminal law (incl. child exploitation) or
  intellectual property (hence §512). Encryption does not change it.
- Encryption limits *what* can be produced to a subpoena or warrant, not the
  duty to respond. Account data, IP logs, timestamps and payment records are
  still produced. A §2703(f) preservation request lasts 90 days, renewable once.

### Non-US users

- **GDPR:** applies if the service "offers" to people in the EU. Free sign-ups
  on an English, USD site are a grey zone; selling the paid tier to EU
  residents leans towards "offering". If it applies: a privacy notice, a lawful
  basis, access/export/deletion rights, processor agreements, 72-hour breach
  notice to the regulator. An Art. 27 EU representative is hard to avoid
  *(uncertain)*. Encryption can remove the duty to notify *users* of a breach
  (Art. 34(3)(a)), not the regulator. **[lawyer]** if EU use grows.
- **UK Online Safety Act:** covers "user-to-user" services where content "may
  be encountered by another user". A strictly private locker appears to fall
  outside *(the researcher's reading, uncertain)*. Any sharing brings it in;
  Ofcom has fined a US site with no UK presence.
- **EU DSA:** every hosting service must run a notice-and-action mechanism
  (Art. 16), regardless of size. The same notice form that serves the DMCA can
  serve it.

### Policies a small operator needs regardless

| Item | Minimum |
|---|---|
| **Terms of Service** | 13+ (18+ or parental consent for paid, a minor point, [lawyer]); acceptable use (no infringing, illegal or CSAM content); operator may remove content and suspend accounts, including on notices it cannot verify; repeat-infringer policy; "as is", limitation of liability; data may be lost (and with encryption a lost key is unrecoverable); governing law; paid-plan terms |
| **Privacy Policy** | What is collected (Google name, email, avatar, account id; uploads; annotations; IP and session data); third parties: Google, the payment processor, **Semantic Scholar** (receives titles/DOIs, which tells it what the user reads), AWS (the relay); retention, deletion, export; security measures. CCPA's thresholds are not met, but FTC Act §5 holds the operator to what the policy promises |
| **DMCA agent and abuse contact** | Registered agent; a page with the agent and a notice form; one abuse address (also serves DSA Art. 16); a log of notices and actions without content |
| **NCMEC registration** | Register once; keep the runbook above |
| **Deletion and export** | See [production-hardening.md](./production-hardening.md) |
| **Breach response** | Who to notify and by when (GDPR 72 h; US states "without unreasonable delay") |
| **Consent at sign-up** | A 13+ checkbox with the Terms; record which Terms/Privacy version each user accepted and when. COPPA applies only on actual knowledge of under-13 users |
| **Templates** | Basecamp's policies are CC BY 4.0; Automattic's Legalmattic is CC BY-SA. Adapting one fits the open-source preference |

### Charging money (the $5/month role)

- The FTC's click-to-cancel rule was vacated on 2025-07-08; the FTC restarted
  rulemaking on 2026-03-11 with no draft text. **ROSCA still applies:**
  disclose material terms before billing, get express informed consent to the
  recurring charge, give a simple way to stop it.
- **California ARL (AB 2863, from 2025-07-01):** express affirmative consent,
  kept 3 years (or 1 year after termination, if longer); online cancellation
  through the same medium; an annual reminder; notice before price changes.
  Designing to California is the usual approach.
- Do not market the paid tier in a way that suggests storing books or
  paywalled content (the *Ellison* "draw" test).
- EU consumers' 14-day withdrawal right for digital services *(uncertain)*; a
  merchant-of-record usually handles it.

## Recommendation

*A recommendation, not legal advice.*

1. **Adopt option A now, site-wide (P2):** "no user's content is ever visible to
   another user" becomes a written design rule; any future sharing feature
   triggers a review of DMCA, UK OSA, TAKE IT DOWN and DSA duties.
2. Register a DMCA agent; publish `/legal/terms`, `/legal/privacy` and
   `/legal/copyright` (agent, notice form, repeat-infringer policy) and an abuse
   address; register with NCMEC; write the one-page abuse and CSAM runbook; log
   notices and actions without content.
3. Adapt Basecamp's CC BY 4.0 policies; name Google, the payment processor,
   Semantic Scholar and AWS; require 13+ (18+ for paid); record the accepted
   Terms version.
4. Before the paid role launches: one-click online cancellation, stored consent
   records, confirmation and annual reminder emails.
5. **Decide encryption on its privacy merits for users, not as operator
   protection.** If adopted, say so in the policies, and keep watching STOP CSAM.
6. **Get a lawyer** for: a one-time review of Terms and Privacy before charging;
   any CSAM discovery, subpoena or preservation request; STOP CSAM if enacted;
   EU representative questions; whether to form an LLC.

## Reasoning

- Every duty found is triggered by knowledge or by features (sharing, audience,
  charging), not by whether content is encrypted. So the cheap controls on
  features and process buy almost all the protection.
- Keeping "no sharing" as a site-wide rule keeps the site outside the UK OSA
  and the TAKE IT DOWN Act and keeps DMCA notices rare, for every future app.

## Questions for the user

Numbered as in [decisions.md](../requests/2026-10-14/decisions.md).

- **L1.** Where is the operator legally based (US state, or elsewhere)?
- **L2.** Will any feature ever let one user's content be seen by another user?
- **L3.** Will EU/UK users be accepted, and the paid tier sold to them?
- **L4.** Is a home address acceptable as the public DMCA agent address, or a
  P.O. box / registered agent?
- **L5.** Form an LLC and/or pay for a short legal review before the paid role?
- **L6.** Is telling Semantic Scholar what users upload acceptable, or should
  enrichment become opt-in?
- **L7.** Adopt option A (the legal hygiene list) now?
- **L8.** Which monitored mailbox handles abuse, DMCA and security reports?
- **L9.** Require 13+ at sign-up, and 18+ (or parental consent) for paid?

## Sources

Copyright / DMCA
- [copyright.gov DMCA directory FAQ](https://www.copyright.gov/dmca-directory/faq.html), [renewal tutorial](https://www.copyright.gov/dmca-directory/transcripts/renew.pdf), [§512 pages](https://www.copyright.gov/512/) — $6 fee; 3-year renewal; P.O. box waiver.
- [digital-law-online — §512(m)](https://digital-law-online.info/lpdi1.0/treatise37.html) — no duty to monitor.
- [Fenwick — Viacom v. YouTube](https://www.fenwick.com/insights/publications/copyright-alert-viacom-v-youtube-google-second-circuit-reinstates-viacoms-copyright-lawsuit-but-largely-affirms-pro-online-service-provider-holdings), [Wolters Kluwer — 512 study](https://legalblogs.wolterskluwer.com/copyright-blog/the-us-copyright-office-section-512-study-why-the-entertainment-industry-is-claiming-victory/) — red-flag knowledge.
- [Orrick — Veoh](https://www.orrick.com/Insights/2013/03/The-Ninth-Circuit-Clarifies-Safe-Harbor-Rules-in-Veoh-Victory) — control of specific infringement; automated processing.
- [Loeb — MP3tunes](https://www.loeb.com/en/insights/publications/2011/09/capitol-records-inc-v-mp3tunes-llc) — private lockers qualify.
- [EFF ILT — Ellison](https://ilt.eff.org/Ellison_v.html), [Perfect 10 v. CCBill](https://ilt.eff.org/Perfect_10%2C_Inc._v.html), [Jones IP](https://www.jonesipl.com/article/dmca-safe-harbor-weak-repeat-infringer-policies/) — "draw" test; repeat-infringer policy.
- [Faegre Drinker — Cox v. Sony](https://www.faegredrinker.com/zh/insights/publications/2026/3/supreme-court-decides-cox-communications-v-sony-music-entertainment) — decided 2026-03-25, 9–0; contributory liability requires intent.
- [Mondaq — Cox reframes the DMCA](https://www.mondaq.com/unitedstates/copyright/1767298/supreme-court-narrows-contributory-copyright-liability-and-reframes-the-dmca-landscape-cox-communications-inc-v-sony-music-entertainment) — commentary.
- [techcentral.ie — MEGA](https://www.techcentral.ie/mega-already-fielding-150-copyright-infringement-warnings/) — an encrypted host removes content on notices.

CSAM
- [govinfo — 18 U.S.C. §2258A](https://www.govinfo.gov/content/pkg/USCODE-2023-title18/html/USCODE-2023-title18-partI-chap110-sec2258A.htm), [customsmobile (current text)](https://www.customsmobile.com/uscode/title18_partI_chapter110_section2258A) — reporting duty; (f) no duty to search.
- [REPORT Act text](https://www.congress.gov/118/plaws/publ59/PLAW-118publ59.htm), [govregs notes](https://www.govregs.com/uscode/title18_partI_chapter110_section2258A_notes), [Orrick](https://www.orrick.com/en/Insights/2024/01/REPORT-Act-Would-Expand-Online-Service-Provider-Obligations-Related-to-Child-Sex-Abuse-Material), [WSGR](https://wsgr.com/en/insights/new-minor-safety-obligations-for-online-services-report-act-expands-child-sexual-exploitation-reporting-requirements.html) — 1-year preservation; penalties.
- [Illinois 325 ILCS 47/10](https://ilga.gov/legislation/ilcs/documents/032500470K10.htm) — NCMEC agent registration.
- [chetson.com](https://www.chetson.com/obligation-to-report-suspected-child-sex-abuse-material/) — registered vs reporting ESPs; [28 CFR 81.12](https://www.ecfr.gov/current/title-28/chapter-I/part-81/subpart-B/section-81.12).
- [BNN Bloomberg](https://www.bnnbloomberg.ca/business/company-news/2026/07/14/judge-dismisses-lawsuit-against-apple-over-alleged-child-sexual-abuse-material-on-icloud/), [Bloomberg Law](https://news.bloomberglaw.com/ip-law/apple-again-defeats-suit-over-icloud-child-sexual-abuse-material) — Apple iCloud suit dismissed, July 2026.
- [Sen. Hawley](https://www.hawley.senate.gov/hawley-negotiates-inclusion-of-stop-csam-act-in-senate-ndaa/) — STOP CSAM added to the Senate FY2027 NDAA, 2026-07-14.
- [EFF 2025](https://www.eff.org/deeplinks/2025/06/oppose-stop-csam-protecting-kids-shouldnt-mean-breaking-tools-keep-us-safe), [EFF 2023](https://www.eff.org/deeplinks/2023/05/stop-csam-act-improved-still-problematic), [CBO](https://www.cbo.gov/publication/61842), [policysoup](https://policysoup.com/bills/s1829-119), [KY3](https://www.ky3.com/2026/08/10/your-side-federal-legislators-work-bill-hold-big-tech-companies-accountable-child-sexual-abuse-material/), [CDT](https://cdt.org/insights/cdt-urges-congress-to-include-the-bipartisan-encryption-amendment-in-the-final-ndaa/) — STOP CSAM content and status.
- [Reclaim The Net — EARN IT](https://reclaimthenet.org/bill/earn-it-act), [CDT — EARN IT](https://cdt.org/insights/earn-it-act-threatens-privacy-protections-free-expression/) — history.
- [WilmerHale](https://wilmerhale.com/en/insights/client-alerts/20260615-the-take-it-down-act-goes-live), [Wiley](https://www.wiley.law/alert-May-19-Deadline-for-TAKE-IT-DOWN-Act-Compliance-Is-Your-Company-Prepared) — TAKE IT DOWN covered platforms.

Section 230 and legal process
- [govinfo — 47 U.S.C. §230](https://www.govinfo.gov/content/pkg/USCODE-2020-title47/html/USCODE-2020-title47-chap5-subchapII-partI-sec230.htm), [CRS IF12584](https://www.everycrsreport.com/reports/IF12584.html) — scope and carve-outs.
- [Pfefferkorn, USENIX Enigma 2022](https://www.usenix.org/conference/enigma2022/presentation/pfefferkorn), [Lawyer Monthly](https://www.lawyer-monthly.com/2025/11/x-chat-encryption-legal-analysis/), [Signal](https://signal.org/bigbrother/district-of-columbia/), [Lavabit](https://giga.law/daily-news/2013/10/02/snowdens-e-mail-provider-received-search-warrant), [ACLU](https://www.aclu.org/news/privacy-technology/government-cannot-force-e-mail-companies-copy-and-save-your) — encryption and legal process; preservation.
- [Alston](https://www.alston.com/en/insights/publications/2016/12/icyber-alerti-2016-breach-roundup-part-i-us-state), [Bricker](https://www.bricker.com/hitech-law/tennessee-amends-data-breach-notification-law-removes-exemption-for-encryption) — state breach-law encryption safe harbors (2016–17 sources; check current law).

Non-US
- [GDPR Art. 27](https://gdpr-info.eu/art-27-gdpr/), [Art. 34](https://gdpr-text.com/read/article-34/) — representative; encryption exemption from user notice.
- [OSA s.3](https://www.legislation.gov.uk/ukpga/2023/50/section/3), [Kingsley Napley](https://www.kingsleynapley.co.uk/our-insights/articles/is-your-online-business-caught-by-the-online-safety-act/), [CMS](https://cms.law/en/gbr/legal-updates/online-safety-act-illegal-content-duties-are-now-in-force), [Ofcom — Transfer.it](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/megas-compliance-assurances-in-respect-of-transfer.it-to-take-measures-to-prevent-users-from-encountering-or-sharing-child-sexual-abuse-material-csam), [Express & Star](https://www.expressandstar.com/uk-news/2026/03/19/4chan-fined-450000-by-ofcom-for-not-protecting-children-from-pornography) — OSA scope and enforcement.
- [presencis — DSA Art. 16](https://presencis.com/regulations/dsa/article-16/), [Art. 6](https://presencis.com/regulations/dsa/article-6/) — notice-and-action for all hosts.

US privacy, children, subscriptions
- [Federal Register — COPPA Rule](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule), [BBB Programs](https://bbbprograms.org/media/insights/blog/coppa-amended) — actual-knowledge standard.
- [Feroot — CCPA thresholds](https://www.feroot.com/blog/ccpa-applicability-website-california-law/).
- [Fenwick — rule vacated](https://www.fenwick.com/insights/publications/eighth-circuit-vacates-ftcs-click-to-cancel-rule), [Sidley](https://www.sidley.com/en/insights/newsupdates/2026/02/us-ftc-signals-renewed-interest-in-click-to-cancel-rulemaking), [Womble](https://www.womblebonddickinson.com/us/node/15872) — FTC rule status; ROSCA.
- [Barnes & Thornburg](https://btlaw.com/en/insights/alerts/2025/california-expands-automatic-renewal-law-new-requirements-now-in-effect), [Fenwick — California ARL](https://fenwick.com/insights/publications/california-tightens-requirements-for-automatically-renewing-subscriptions) — AB 2863.

Templates
- [basecamp/policies](https://github.com/basecamp/policies) (CC BY 4.0), [WP Tavern — Legalmattic](https://wptavern.com/how-to-automatically-create-terms-of-service-and-privacy-policy-documents) (CC BY-SA).
