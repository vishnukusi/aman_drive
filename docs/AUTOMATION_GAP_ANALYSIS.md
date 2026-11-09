# Automation gap analysis: DriveFlow AI

*9 Nov 2026 · written before any automation code was changed · repository at `95e8997`*

Sources read: README, `docs/PROJECT_AUDIT.md`, `docs/FINAL_COMPLETION_REPORT.md`, `docs/DRIVEFLOW_INTEGRATION.md`, every file under `src/`,
both test files, and the full git history (4 commits: `e6b398e` initial, `33cb3af` website, `bb679b0` Vercel config, `95e8997` docs).

## 1. Headline finding

**There is no backend.** Every "automation" in the repository runs in the visitor's browser:

* Enquiries, statuses, notes and vehicle edits live in `localStorage` (`src/store.js`).
* The staff dashboard reads that same browser storage. A phone and a laptop never see each other's enquiries.
* The "login" compares against credentials compiled into the JavaScript bundle and stores `'1'` in `sessionStorage`.
* WhatsApp is a `wa.me` link the customer must press Send on. Nothing is ever sent by the system.

The deployed site (https://aman-drive-gold.vercel.app) is a static build with no API, so staff cannot see a single real enquiry.

## 2. What works, what is partial, what is simulated

| Capability | Status | Where | Notes |
|---|---|---|---|
| Vehicle catalogue (22 cars, published rates) | **Works** (static data) | `src/data/vehicles.js` | Verified against the official site |
| Indicative estimate | **Works** (deterministic) | `src/lib/pricing.js` | Pure, unit-tested; runs only in the browser |
| Field / date validation | **Works** (client only) | `src/lib/validation.js` | Never re-checked on a server; trivially bypassed |
| 6-step booking wizard | **Works** (client only) | `src/customer/Book.jsx` | Saves to `localStorage` |
| One-tap enquiry sheet + home quick enquiry | **Works**, but **no record, no ID** | `src/components/EnquiryForm.jsx` | Opens WhatsApp directly; nothing is stored or tracked |
| Tracking ID | **Partial** | `nextEnquiryId()` in `src/store.js` | Generated **in the browser**, sequential (`DF-1001`, `DF-1002` …), guessable, not unique across devices, no database constraint |
| Enquiry tracking page | **Partial** | `src/customer/Track.jsx` | ID + last 4 digits, but only finds enquiries made in the same browser |
| Status workflow | **Simulated** | `src/config.js` `STATUSES`, `src/store.js` `setStatus()` | 6 free-form statuses; **no transition rules**: any status can jump to any other |
| Event history | **Partial** | `history[]` on each enquiry | Label + time + `by`; no previous/new status fields; editable by anyone with dev tools |
| Staff dashboard (overview, table, detail, notes, vehicle manager) | **Simulated** | `src/admin/*` | Reads browser storage; 7 seeded fake enquiries |
| Staff authentication | **Simulated** | `AdminLogin.jsx` | Password visible in bundle and on screen; no roles |
| "AI" / NLP intake | **Not implemented** | — | No parser, no LLM, no follow-up questions. `src/services/enquiry.js` has a `driveflow` channel that deliberately throws "not connected" |
| WhatsApp automation | **Not implemented** | — | Only `wa.me` links; no Business Platform, no templates, no delivery records |
| Communication log | **Not implemented** | — | |
| Live sync customer ↔ staff | **Not implemented** | — | Only the browser `storage` event between two tabs of one browser |
| Rate limiting, audit log, tenancy | **Not implemented** | — | |

## 3. What was removed or went missing

Git history was checked commit by commit. **Nothing previously implemented has been deleted.** One regression in behaviour exists:

* The website upgrade (`33cb3af`) added the one-tap **Enquire now** sheet and the home **Quick enquiry** form. These hand off straight
  to WhatsApp and **never create an enquiry or a tracking ID**. Before that commit, the only enquiry path was the wizard, which always
  produced an ID. So a customer can now enquire without getting a reference, and staff have no record of it.

## 4. Token-generation investigation

Searched: all four commits' patches (`git log --all -p`), `src/`, `tests/`, `docs/`, README, for `token`, `tokeni[sz]`, `uuid`, `nanoid`,
`crypto.random`, `randomUUID`, `DF-`, `nextEnquiryId`.

| Concept | Evidence | Conclusion |
|---|---|---|
| **A. Enquiry tracking token** | `nextEnquiryId()` (`src/store.js:84`) returns `DF-${max+1}`; README: "an enquiry with a unique ID is saved"; Track page validates `^DF-\d{3,}$`; demo guide step 9 "search the enquiry ID" | **This is the feature.** It exists but is incomplete: client-generated, sequential and guessable, not persisted server-side, no uniqueness constraint, absent from the quick-enquiry paths |
| **B. NLP/LLM tokenization** | No occurrence in any commit. "token" appears only as *design tokens* (CSS) and npm packages (`js-tokens`, `nanoid`) in the lockfile | **Never existed.** Not invented here |

Decision: **restore and complete the tracking-token feature (A)** on the server: random, non-sequential `DF-XXXXXX`, a `UNIQUE` database
constraint with retry on collision, issued only after the row is committed, and attached to every enquiry path including the quick enquiry.
No NLP tokenizer is added in the name of "restoring" one.

## 5. Gaps to close (priority order)

1. **Backend API + database** as the single authoritative enquiry record (create, read, search, status, events, vehicles).
2. **Server-generated tracking ID** after persistence; unique constraint.
3. **State machine** with enforced transitions and an auditable event per transition (previous, new, actor, time, note).
4. **Automated intake** (structured + free-text): parse, normalise, detect missing details, ask follow-up questions, never invent prices or availability.
5. **Real staff authentication** (server-side password hash, signed HttpOnly session, roles) and protection of status changes.
6. **Customer tracking** by reference with privacy (unguessable access key or mobile check; limited fields).
7. **Communication log + WhatsApp adapter** (manual hand-off recorded honestly; Meta Cloud API only when credentials exist; mock in tests).
8. **Live synchronisation** between customer view and dashboard.
9. Rate limiting, audit log, tenant column, error handling.
10. Tests for all of the above, plus one end-to-end journey.

## 6. Constraints that shape the design

* Hosting is Vercel (static + serverless functions). Serverless file systems are ephemeral, so a production database must be hosted.
* Docker is not running on this machine, so a Postgres server cannot be tested locally.
* No LLM API key and no WhatsApp Business credentials have been authorised.
* No client operational data yet: everything must run in a clearly labelled demo mode.
