# Operator Liability and Site Policies: Round 2

Researched: 2026-11-12. Follow-up research on top of
[operator-liability-and-policies.md](./operator-liability-and-policies.md)
(round 1, 2026-10-14), which it does not repeat; it corrects one point there
(see [The public address](#the-public-address-l4-a-correction)).

> **This is research, not legal advice.** Points where a lawyer is warranted
> are marked **[lawyer]**. Claims resting on secondary or vendor sources are
> marked *(uncertain)*. Most cost figures come from formation-service and
> affiliate blogs, which disagree with one another; check them on the state or
> vendor site. Sources are linked inline.

Context from the user's answers
([answers-2026-11-12.md](../requests/2026-10-14/answers-2026-11-12.md)): a US
operator, state not given (L1), who wants written procedures for DMCA notices
and CSAM; zero-access encryption, so plaintext exists only in memory while an
upload is processed (E1, E3); no sharing between users (L2); Polar as merchant
of record; no home address in public (L4); near-zero revenue (L5). Polar's own
KYC of the **owner** (ID and selfie through Stripe Identity) applies whether the
seller is an individual or an LLC; an LLC adds a business-verification step that
still names the owner. Questions left for the user are R2-5 to R2-7 in
[decisions.md](../requests/2026-10-14/decisions.md#round-2-questions-for-the-user-2026-11-12).

## Screening uploads for CSAM and DMCA (E3)

**Recommendation: do not scan at launch** (question R2-5). No US law requires it
(§2258A(f): nothing "shall be construed to require a provider to … monitor …
or affirmatively search, screen, or scan",
[policyrisk](https://policyrisk.com/us-code/title/18/section/2258A); §512(m),
[LII](https://www.law.cornell.edu/uscode/text/17/512)); the threat model for a
no-sharing academic-PDF locker is weak; and scanning brings knowledge-triggered
duties plus a quarantine store outside zero-access. Instead:

1. **Register with NCMEC as an ESP** now
   ([esp.ncmec.org/registration](https://esp.ncmec.org/registration), or
   `espteam@ncmec.org`, per third-party guides:
   [dev.to](https://dev.to/sentinelsafety/ncmec-mandatory-reporting-for-online-platforms-what-developers-need-to-know-4k74),
   [Coop docs](https://docs.roost.tools/coop/1.0/integrations/ncmec.html)), so
   a report takes minutes.
2. **Apply to the Tech Coalition's Pathways programme** now: it is free, and
   its answer settles whether a one-person operator is eligible.
3. Write the two runbooks below; add a Terms clause on prohibited content and
   removal on unverifiable notices, and a Privacy Policy line that the operator
   does not scan but acts on reports and legal process; accept **only PDFs**
   (magic bytes and a parse, which GROBID needs anyway); keep the upload size
   caps.
4. **Design the upload stage so a scanning step can be added** (extract the
   embedded images, then PDQ or PhotoDNA) without touching storage.
5. **Turn scanning on** (PhotoDNA via Pathways, or self-hosted HMA with an
   NCMEC list) if any of these happen: any sharing feature (L2); accepting
   non-PDF images or video; a CSAM report about the service; STOP CSAM or a
   similar "reckless" standard becoming law; growth to a real public user base.
6. **[lawyer]** a one-hour review of the runbooks once written, ideally with the
   Terms review round 1 already recommends.

The screening options open to a tiny operator:

| Option | Access and cost | Fit for this app |
|---|---|---|
| **Microsoft PhotoDNA Cloud Service** | Free "for qualified customers", vetted case by case for "trusted online service providers"; **still images only**; Microsoft sends NCMEC aggregate match counts ([FAQ](https://www.microsoft.com/en-us/photodna/faq), [terms](https://www.microsoft.com/en-us/photodna/termsofuse)) | Plausible, but sends image hashes or images to Microsoft; whether one person passes vetting is *uncertain* |
| **Tech Coalition Pathways → PhotoDNA sublicense** | Free, "especially for startups and small-to-medium-sized platforms" hosting user content; members excluded ([Pathways](https://technologycoalition.org/programs/pathways/), [PhotoDNA licensing](https://technologycoalition.org/news/the-tech-coalition-empowers-industry-to-combat-online-child-sexual-abuse-with-expanded-photodna-licensing/), [OpenAI guidance pointing to it](https://developers.openai.com/api/docs/guides/csam-guidance)) | **Best fit.** Eligibility of an individual, not a company, is *uncertain*; an LLC might help |
| **Cloudflare CSAM Scanning Tool** | Free; fuzzy-hashes images in content served through Cloudflare's cache; operators "are still expected to … file their own reports" ([docs](https://developers.cloudflare.com/cache/reference/csam-scanning/), [blog 2025](https://blog.cloudflare.com/a-simpler-path-to-a-safer-internet-an-update-to-our-csam-scanning-tool/)) | **Does not work here:** stored objects are ciphertext, uploads are uncached POSTs; not documented for PDFs or R2 |
| **Thorn Safer** | About $30,720 a year for 1M queries a month; Vendr median about $51k ([AWS](https://aws.amazon.com/marketplace/pp/prodview-dfwekn4bx4ake), [Vendr](https://www.vendr.com/marketplace/thorn)); no small tier found *(uncertain; ask Thorn)* | Disproportionate |
| **Meta PDQ / TMK+PDQF + HMA** | Code free ([ThreatExchange](https://github.com/facebook/ThreatExchange)); **lists are not**: ThreatExchange data needs a business application, NCMEC lists need ESP registration plus Hash Sharing API credentials ([Coop NCMEC](https://docs.roost.tools/coop/1.0/integrations/ncmec.html), [NCMEC hash sharing](https://hashsharing.ncmec.org/npo)) | Self-hostable, so no third party sees images; **an algorithm without a vetted list detects nothing** |
| **ROOST Coop** | Free open-source review console with HMA and CyberTipline reporting; still needs NCMEC credentials ([ROOST](https://roost.tools/), [child safety](https://docs.roost.tools/coop/1.0/user/child-safety.html)) | Built for teams; too heavy for one person and zero sharing |
| **Project Arachnid Shield (C3P)** | Free API for "a legitimate business purpose" ([Project Arachnid](https://projectarachnid.ca/), [contact](https://projectarachnid.ca/en/contact/), [unofficial Rust SDK](https://lib.rs/crates/arachnid-shield)) | Sends image bytes to a Canadian third party; sits badly with zero-access |

**PDFs.** None of these documents PDF support; all hash images. The pipeline
already parses each PDF in memory, so embedded image XObjects could be
extracted (poppler's `pdfimages` or PyMuPDF) and hashed. Perceptual hashes
tolerate re-compression and resizing but not crops, tiling or composites, and
hashing rendered pages would not match known images; coverage is partial and
**untested** *(the researcher's reading; no source found)*. Exact hashes of a
whole PDF match only identical files.

**What finding something triggers.** Report "as soon as reasonably possible
after obtaining actual knowledge" (§2258A(a)(1)); preserve the report's contents
for **1 year** "in a secure location", consistent with the NIST Cybersecurity
Framework (§2258A(h), as amended by the REPORT Act,
[P.L. 118-59](https://www.congress.gov/118/plaws/publ59/PLAW-118publ59.htm));
knowing and wilful failure to report costs up to $600,000, then $850,000, for
providers under 100M monthly users (§2258A(e)). Whether a hash match alone is
"actual knowledge" is not settled by the statute; large providers report on hash
matches without viewing, the facts of *Wilson* *(uncertain)*. §2258B shields
reporting and preserving unless the misconduct is intentional or reckless and
expects access to images to be minimised
([LII](https://www.law.cornell.edu/uscode/text/18/2258B)); its wording after the
REPORT Act should be checked *(uncertain)*.

**Scanning raises a small operator's risk** by creating knowledge and so the
duties above, a 1-year preservation store and a quarantine outside zero-access;
false positives become reports about innocent users; it must be disclosed and
qualifies the "nobody can read it" promise (FTC Act §5); hashes or bytes go to a
third party; and it is ongoing work for one person. **It lowers risk** by
stopping known CSAM before it becomes undiscoverable ciphertext, by answering a
future "reckless hosting" standard (STOP CSAM, S.1829, was added to the Senate
FY2027 NDAA text in July 2026; the final outcome was not checked, so re-check
before launch **[lawyer]**), and as evidence of good faith. Net for this app (no
sharing, academic PDFs, one operator, offences that require *knowing* conduct):
**lower without scanning today**, until a trigger above occurs.

## The Fourth Amendment split, in short

- A provider's scan is a *private search* only while the provider acts on its
  own. If the government required or directed it, the provider could become a
  government agent and each scan would need a warrant: one reason §2258A(f)
  disclaims any duty, and why *Ackerman* (10th Cir. 2016) treating NCMEC as a
  government entity mattered *(the researcher's summary of the doctrine)*.
- Courts split on whether police may open a file a provider flagged by hash but
  never viewed. **Warrant needed:** *United States v. Wilson*, 13 F.4th 961
  (9th Cir. 2021) ([Justia](https://law.justia.com/cases/federal/appellate-courts/ca9/18-50440/18-50440-2021-09-21.html),
  [EFF](https://www.eff.org/deeplinks/2021/09/us-v-wilson-ninth-circuit-reaffirms-fourth-amendment-protection-electronic));
  *Maher*, 120 F.4th 297 (2d Cir. 2024); *United States v. Lowers* (4th Cir.,
  March 2026, divided panel) ([opinion](https://www.ca4.uscourts.gov/opinions/244546.P.pdf),
  [Bloomberg Law](https://news.bloomberglaw.com/litigation/cloud-file-search-needs-warrant-circuit-says-in-widening-split),
  [CRS LSB11420](https://www.everycrsreport.com/reports/LSB11420.html)).
  **Opening allowed:** the 5th (*Reddick*), 6th (*Miller*) and 11th Circuits
  ([fourthamendment.com](https://fourthamendment.com/?p=64420)). No Supreme
  Court grant was found *(uncertain)*.
- **For the operator** it decides whether evidence survives a prosecution, not
  the operator's own liability. The operator's choice is simply **not to
  view**: the CyberTipline report records whether the ESP viewed the file, and
  law enforcement can get a warrant. Viewing to "confirm" is handling
  contraband and buys nothing.

## Runbook: a DMCA notice

Basis: [17 U.S.C. §512](https://www.law.cornell.edu/uscode/text/17/512).

1. **Before launch:** register the agent ($6, every 3 years,
   [FAQ](https://www.copyright.gov/dmca-directory/faq.html)); publish
   `/legal/copyright` with the agent's details (§512(c)(2)), the notice
   elements, the counter-notice process and the repeat-infringer policy; one
   monitored address (L8).
2. **Check the notice** for the §512(c)(3)(A) elements: signature; the work;
   the material, with information "reasonably sufficient to … locate" it;
   contact details; a good-faith statement; an accuracy statement under penalty
   of perjury. If it gives the work, locator and contact but lacks the rest,
   **reply promptly** asking for it (§512(c)(3)(B)(ii)).
3. **Locate under zero-access.** The operator cannot search content, and with
   the round-2 E4 split titles are sealed too, so a notice is actionable only
   when it names something the server can resolve: an account email, an article
   id, an upload time, a URL the user exposed. Otherwise reply that the material
   cannot be located and ask for identifiers. Record that the operator cannot
   verify content (under §512 it need not). **Do not** keep plaintext hashes of
   uploads to match notices; that breaks the zero-access promise.
4. **Remove expeditiously** (§512(c)(1)(C)): hours to a couple of business days
   *(no statutory number; uncertain)*. **Disable access rather than
   hard-delete:** mark the article removed and keep the ciphertext inaccessible
   to the user, because §512(g)(2) asks the provider to **restore** the material
   10–14 business days after a valid counter-notice unless the claimant sues, and
   hard deletion gives up the §512(g)(1) protection against the user's own
   claim. Hard-delete once the window has passed with no counter-notice, for
   example 30 days after notifying the user *(design choice)*.
5. **Notify the user promptly** (§512(g)(2)(A)): what was removed, the notice
   (redacting the complainant only where appropriate), and how to counter-notify.
6. **Counter-notice** (§512(g)(3)): signature; the material; a statement under
   penalty of perjury of mistake or misidentification; name, address and phone;
   consent to federal jurisdiction. Forward it to the complainant; **restore
   after 10–14 business days** unless told a suit was filed.
7. **Repeat infringers** (§512(i)(1)(A); *Perfect 10 v. CCBill*): count valid,
   uncontested notices per account, for example terminate at 3 within 12 months
   *(policy choice)*. Termination deletes ciphertext the user cannot recover;
   the Terms must say so.
8. **Log** notice, date, action, user notice, counter-notice and outcome, with
   no content. Knowingly false notices expose their sender (§512(f)).
9. **[lawyer]** if a notice threatens suit, names the operator personally, or
   claims the service is built for infringement (the *Cox v. Sony* intent
   standard in round 1).

## Runbook: CSAM discovered or reported

Handling advice is standard industry practice; **[lawyer] at step 1 if
possible.**

0. **Before launch:** NCMEC ESP registration (above); keep this runbook and a
   lawyer's name on file.
1. **Never view.** Do not open, download, copy, screenshot or forward the
   material or any link to it, and never send it to anyone but NCMEC or law
   enforcement: not a lawyer, not a friend, not yourself. If a report arrives
   with an attachment or link, do not open it; report the email.
2. **Report to the NCMEC CyberTipline "as soon as reasonably possible"** with
   what is known: account id, email and Google name; upload timestamps and IPs;
   object ids and sizes; how the operator learned of it; and that the operator
   **did not view** the file and **cannot decrypt it**. Whether NCMEC accepts a
   report with no file as complete is *uncertain*; its ESP team can say.
3. **Preserve for 1 year** (§2258A(h)): the account record, logs, payment
   identifiers and the ciphertext objects, access-restricted, and exempt from
   the dormant-account and quota jobs (E5, RB6). Longer if law enforcement asks
   (a §2703(f) letter can extend it).
4. **Disable the account** (login, upload, download), do not delete, and do not
   tell the user why. No source requires silence, but it avoids tipping off a
   suspect *(standard practice)*.
5. **Contact a lawyer** before answering law enforcement beyond acknowledging,
   and before deleting anything after the year.
6. **Keep a minimal log** with no content: dates, report id, actions.
7. **If scanning is ever added and matches at upload:** do not store it under
   the user's key; write it to a quarantine store encrypted to an **operator**
   key, for the 1-year duty only, with NIST CSF-aligned controls; report with
   the file attached, unviewed; reject the upload with a generic error.

Under zero-access the operator can always disable or delete by id, preserve
ciphertext and hand over metadata, but can never inspect content after upload,
confirm a report or give NCMEC the file. The only moment content can be checked
is the in-memory upload window (E3). This is consistent with §2258A(f) and
Section 230; the open risk is STOP CSAM.

## The public address (L4): a correction

The DMCA directory asks for two addresses
([37 CFR 201.38](https://www.law.cornell.edu/cfr/text/37/201.38),
[FAQ](https://www.copyright.gov/dmca-directory/faq.html),
[designate-an-agent tutorial](https://www.copyright.gov/dmca-directory/transcripts/designate-an-agent.pdf)):

- The **designated agent's** address may be a "street address or post office
  box". **No waiver is needed.**
- The **service provider's own** address must be a "physical street address
  (not a post office box)". A waiver, requested free at
  `poboxwaiver@copyright.gov`, is granted only for "exceptional circumstances"
  such as a "demonstrable threat to an individual's personal safety or security"
  ([waiver rule 2020](https://www.govinfo.gov/content/pkg/FR-2020-02-27/html/2020-03260.htm));
  a wish for privacy is unlikely to meet that bar *(uncertain)*.
- **Both are published.** For a sole proprietor the service provider is the
  person, so their street address goes in the public directory unless waived.
  The agent can be a third party (one agent per provider).
- *Correction to round 1:* "a P.O. box needs a free waiver" is true only of the
  provider's address; corrected where it appears in
  [operator-liability-and-policies.md](./operator-liability-and-policies.md).

| Route | Cost | Notes |
|---|---|---|
| USPS P.O. box for the agent | About $21–$100+ per 6 months ([fedratecalc](https://fedratecalc.com/po-box-cost/)) *(uncertain; check locally)* | Solves only the agent field |
| **Virtual mailbox or CMRA** (iPostal1, Anytime Mailbox, UPS Store): a street address plus a PMB number | About $5–$20 a month basic, $20–$40 for better locations ([businessanywhere](https://businessanywhere.io/ipostal1-vs-anytime-mailbox-which-virtual-mailbox-wins/), [shoeboxed](https://www.shoeboxed.com/blog/physical-address-com-review)) *(vendor and affiliate figures)* | Works for both fields in practice. **Whether the Office accepts a CMRA address as a "physical street address" is not addressed in the rule or FAQ** *(uncertain)*. USPS Form 1583 with ID: the CMRA knows you, the public does not |
| Commercial registered agent | About $125 a year ([rho](https://www.rho.co/blog/best-registered-agent-services)) *(affiliate)* | For receiving legal service for an **entity**; many restrict use as a business or mailing address |
| Third-party DMCA agent service | About $60 to $100–$200+ a year ([Plagiarism Today](https://www.plagiarismtoday.com/2024/08/07/5-things-ive-learned-being-a-dmca-agent-for-100s-of-sites/), [Brach Eichler](https://bracheichler.com/?p=282), [Vondran](https://vondranlegal.com/why-you-should-have-a-law-firm-serve-as-your-dmca-agent/)) | Covers the agent field and filters notices; the provider address is still needed |
| P.O. box waiver | Free | Only with a demonstrable safety threat |
| An LLC with a commercial address | See the LLC section | The provider becomes the LLC; same CMRA uncertainty |

**One address can serve everything.** CAN-SPAM accepts a street address, a
USPS P.O. box or a CMRA private mailbox
([FTC](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business));
California Civil Code §1789.3 asks for name, address and phone
([text](https://california.public.law/codes/civil_code_section_1789.3)), and
whether Polar as merchant of record or the operator is the "provider" is
*uncertain*; US privacy policies need contact information, not a street address
*(uncertain)*; GDPR Art. 13 matters only if EU use grows (L3).
**Recommendation:** one virtual mailbox or CMRA street address (about $10–$20 a
month) as both DMCA addresses and as the contact address in the Terms, Privacy
Policy and emails, after **confirming with the Copyright Office, or a lawyer,
that a CMRA address is accepted** (acceptance is unconfirmed; question R2-6). Cheapest
fallback: a P.O. box for the agent plus a waiver request.

## Should the operator form an LLC? (L5)

**How complicated:** a few hours, mostly online. Choose the state (normally the
**home state**: an LLC formed elsewhere must usually also register as a foreign
LLC at home and pay both, so Wyoming, New Mexico or Delaware save a resident of
another state nothing,
[howtostartanllc](https://howtostartanllc.com/cost-to-form-an-llc/llc-annual-fees-by-state),
[llcuniversity](https://www.llcuniversity.com/llc-annual-fees-by-state/)); name
check and Articles of Organization; a registered agent (yourself, which puts the
home address on the public record, or about $50–$300 a year, $125 typical); a
short operating agreement; a free EIN, which banks usually want
([Wolters Kluwer](https://www.wolterskluwer.com/en/expert-insights/how-to-get-an-employer-identification-number),
[llcuniversity](https://www.llcuniversity.com/irs/ein-for-llc/)); a business bank
account, with Polar payouts, cloud bills, the domain and the DMCA registration
re-pointed to the LLC; then any annual report, separate finances, and unchanged
federal tax (a disregarded single-member LLC files on Schedule C; some states add
their own, such as California's Form 568). FinCEN BOI reports are no longer
needed: a final rule effective 2026-08-14 exempts US companies
([MoFo](https://www.mofo.com/resources/insights/260820-fincen-ends-beneficial-ownership-reporting),
[Ballard Spahr](https://www.ballardspahr.com/insights/alerts-and-articles/2026/08/fincen-permanently-exempts-us-entities-and-persons-from-beneficial-ownership-reporting)).

**Costs** (approximate; check the state's site):

| | One-time | Annual |
|---|---|---|
| Typical state | $50–$200 filing (average about $130; $35 Montana to $500 Massachusetts) | $0–$100 report fee, plus an agent if used (about $125) |
| New Mexico | $50 | **$0** |
| Wyoming | $100 | $60 minimum |
| Delaware | About $110 | **$300** franchise tax plus a mandatory Delaware agent |
| Massachusetts | $500 | **$500** |
| New York | $200 plus newspaper **publication**, about $75–$2,000 by county ([ZenBusiness](https://www.zenbusiness.com/new-york-filing-fees/), [statebusinesscompliance](https://www.statebusinesscompliance.com/blog/new-york-llc-publication-requirement-2026-1-500-manhattan-cost-vs-150-upstate-county-by-county-fee-b)) | $9 biennial |
| California | $70 | **$800 minimum franchise tax every year, even with no revenue** ([vjmglobal](https://www.vjmglobal.com/feeds/blog/california-llc-annual-franchise-tax-2026)); SB 122 cuts the **first year to $400** for tax years 2027–2029 ([FTB](https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2026/08.html), [CalMatters](https://calmatters.digitaldemocracy.org/bills/ca_202520260sb122), [Grant Thornton](https://www.grantthornton.com/insights/alerts/tax/2026/salt/a-e/ca-enacts-software-tax-rules-07-21)); plus $20 every 2 years |
| Foreign registration at home | Often $50–$300 *(varies, unverified)* | Plus the home state's fee |

So the range for a resident runs from about **$50 once and $0 a year** (New
Mexico, own agent) to about **$800–$900 a year** (California), or roughly
$1,000+ in the first year with a Manhattan publication in New York. Formation
services ($0–$300) are optional.

**What it protects:** personal assets from the **LLC's** debts, contracts and
vicarious liability, if run properly. **Not:** personal criminal liability; the
operator's **own torts and personal participation** (people who personally take
part in infringement are routinely named,
[Boardman Clark](https://www.boardmanclark.com/publications/business-minute/llcs-may-not-protect-members-for-personal-acts),
[Nolo](https://www.nolo.com/legal-encyclopedia/limited-liability-protection-llcs-a-50-state-guide.html));
personal guarantees; personal taxes. For a one-person service almost every act
is the operator's own, so the shield is thinner than expected *(the researcher's
reading; **[lawyer]**)*. Commingling, undercapitalisation or missing records can
pierce it, and single-member LLCs get extra scrutiny
([Wolters Kluwer 2026](https://www.wolterskluwer.com/en/expert-insights/piercing-the-veil-of-small-business-what-the-owners-of-llcs-and-corporations-need-to-know),
[ZenBusiness](https://www.zenbusiness.com/blog/piercing-corporate-veil)); some
states give single members weaker charging-order protection *(state-specific;
uncertain)*. For this app: DMCA claims are answered by §512, not an LLC; CSAM
duties are criminal or regulatory; a user's data-loss or breach claim is where an
LLC helps, as do the Terms.

**Alternatives:** stay a sole proprietor ($0) with the processes above; cyber
or tech E&O insurance at about $400–$1,500+ a year
([Insureon](https://www.insureon.com/blog/small-business-cyber-insurance-trends),
[security.org](https://www.security.org/insurance/cyber/cost/)) *(vendor data)*,
which pays defence costs an LLC never does; a personal umbrella usually
excludes business pursuits
([CoverageCat](https://www.coveragecat.com/insurance-types/umbrella/personal-umbrella-and-business-activities),
[IRMI](https://www.irmi.com/articles/expert-commentary/insuring-the-home-based-business-part-2)).
**Polar** lets US individuals sell
([supported countries](https://polar.sh/docs/merchant-of-record/supported-countries));
the owner completes KYC (ID and selfie via Stripe Identity) either way
([account reviews](https://polar.sh/docs/merchant-of-record/account-reviews)), an
LLC adds a business-verification step and a bank account in its name, and Polar
handles sales tax and VAT either way.

**Recommendation (not legal advice):** **no LLC now.** At near-zero revenue and
no external users, the protection that matters comes from no sharing, the DMCA
agent, the CSAM runbook and Terms with a limitation of liability, for about $6
plus a mailbox. **When the paid tier opens to the public, form one in the home
state if it costs roughly $100 a year or less**, with a separate bank account and
everything signed in the LLC's name; in California, Massachusetts or New York,
defer until revenue clearly covers the cost (forming in California in 2027–2029
lowers the first year to $400). **The user's state of residence is the fact that
changes this answer most** (question R2-7). **[lawyer]:** a one-hour home-state
consult on entity choice, charging-order protection and the Terms' liability cap,
combinable with the Terms and Privacy review.
