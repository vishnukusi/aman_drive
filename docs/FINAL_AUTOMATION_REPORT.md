# Final automation report: DriveFlow AI for Aman Self Drive

*9 Nov 2026 · every result below was produced by running it in this session · gap analysis written first: `docs/AUTOMATION_GAP_ANALYSIS.md`*

## 1. Existing functionality audited

Four commits, all of `src/`, both test files and every doc were read. Headline: **there was no backend.** Enquiries, statuses, the
"login" and the dashboard all lived in each visitor's `localStorage`; the live site's staff could not see a single real enquiry.
The catalogue, pricing maths, validation and WhatsApp link builders worked and were kept. Details: gap analysis §2.

## 2. Missing functionality discovered

Server-side persistence; server-issued references; enforced workflow; event history with previous/new status; real staff auth and roles;
privacy-safe customer tracking; any natural-language intake; communication records; live sync between customer and staff views;
rate limiting and audit log. One regression: the one-tap **Enquire now** and home **Quick enquiry** (added in `33cb3af`) created no
record and no tracking ID at all.

## 3. Token-generation investigation and conclusion

Searched every patch in history, the source, tests and docs for `token`, `tokeni[sz]`, `uuid`, `nanoid`, `crypto.random`, `DF-`, `nextEnquiryId`.

* **Tracking token (A): confirmed as the intended feature.** `nextEnquiryId()` produced browser-side, sequential, guessable `DF-1001`
  IDs with no uniqueness guarantee, and the quick-enquiry paths produced none.
* **NLP tokenization (B): never existed.** "token" appears only as CSS *design tokens* and npm package names. Nothing was invented.

Restored and completed (A): random `DF-XXXXXX` from a 31-symbol unambiguous alphabet, `UNIQUE` in the database with retry on collision,
returned **only after the transaction commits**, on every enquiry path, shown on the receipt, tracking page and dashboard, searchable,
kept through every status change, included in WhatsApp templates.

## 4. Features delivered

| Feature | Where |
|---|---|
| DriveFlow API + libSQL database (single authoritative record) | `server/`, `api/index.js` |
| Server-issued tracking references + private customer access keys | `server/ids.js`, `server/service.js` |
| Automated intake: free-text extraction (car, city, dates incl. "this Saturday for 3 days", duration, destination, name, mobile, preferences), missing-field questions, car suggestions, business facts, indicative estimate | `server/intake.js` |
| Enforced 9-status state machine with actor rules, requirements, optimistic locking, audit events | `server/workflow.js`, `transition()` |
| Automated pipeline: Received → Processing → Staff review / Details pending | `runPipeline()` |
| Customer can complete missing details; pipeline re-runs | `supplyDetails()`, tracking page form |
| Customer tracking `/#/track/DF-XXXXXX` (key or last-4 digits; masked data; live) | `src/customer/Track.jsx` |
| "Describe your trip" assistant and backend-connected quick form, car sheet and trip planner | `IntakeAssistant.jsx`, `EnquiryForm.jsx`, `Book.jsx` |
| Staff dashboard on the API: KPIs, pipeline, sources, WhatsApp stats, inbox with search and filters, enquiry workspace (actions, intake panel, WhatsApp, notes, audit trail), fleet manager | `src/admin/*` |
| Staff auth: scrypt, signed HttpOnly sessions, roles admin/staff/viewer | `server/security.js` |
| WhatsApp adapter: honest manual hand-off, Meta Cloud API (mock-tested), mock | `server/whatsapp.js` |
| Live sync: change-feed polling | `/api/staff/changes`, `src/admin/live.jsx`, tracking page |
| Demo mode: fictional enquiries created through the real workflow, labelled everywhere; reset | `seedDemoEnquiries()` |
| Graceful fallback: with no API reachable (e.g. today's static Vercel site) the website keeps its previous WhatsApp-only behaviour and says it is offline | `useBackend()` |

## 5. Backend modifications

New: `server/app.js` (routing, JSON, limits, headers, errors), `db.js` (schema, constraints), `ids.js`, `intake.js`, `security.js`,
`service.js`, `whatsapp.js`, `workflow.js`, `dev-server.mjs`; `api/index.js` (Vercel function); `vercel.json` rewrite for `/api/*`.
Dependency added: `@libsql/client@0.18.0`. Scripts: `npm run api`; `npm test` now also runs `node --test tests/server/*.test.mjs`.

## 6. Frontend modifications

New: `src/api/client.js`, `src/components/EnquiryReceipt.jsx`, `src/components/IntakeAssistant.jsx`, `src/admin/live.jsx`, `src/admin/parts.jsx`.
Rewritten on the API: `src/admin/{AdminLogin,AdminLayout,Dashboard,Enquiries,EnquiryDetail,VehicleManager}.jsx`, `src/customer/Track.jsx`.
Updated: `EnquiryForm.jsx`, `Book.jsx`, `Home.jsx`, `App.jsx` (route `track/:ref`), `Logo.jsx` (explicit height; fixed an oversized logo
in the admin header), `Roadmap.jsx`, `styles.css`, `vite.config.js` (dev/preview proxy). Removed the client-side `VITE_ADMIN_*`
credentials (staff sign-in is now server-side only).

## 7. WhatsApp integration status

**Not live.** No Business API credentials are authorised. Manual mode records automatic notifications as `not_configured` and staff
template clicks as `handoff_link` (a link a person must send). The Meta Cloud API adapter is implemented and passes mocked tests
(template payload, retry on 503, opt-in refusal) but has **never been run against Meta**. See `docs/WHATSAPP_INTEGRATION.md`.

## 8. Dashboard synchronisation status

Working locally: customer pages, tracking page and dashboard read the same database rows. Verified in the browser: a staff quote made
in the dashboard appeared on the customer's open tracking page within one polling cycle (about 6 s) without reloading.

## 9. Database changes

Tables `enquiries`, `enquiry_events`, `communications`, `staff_users`, `vehicles`, `changes`, `audit_log` (`server/db.js`), with
`UNIQUE(reference)`, `UNIQUE(tenant_id, username)`, status and role `CHECK` constraints, `tenant_id` on every row, and indexes on
status and update time. Created idempotently on start-up.

## 10. Tests and actual results

| Suite | Command | Result |
|---|---|---|
| Original logic tests | `node tests/logic.test.mjs` | **22 passed** |
| Website enquiry tests | `node tests/enquiry.test.mjs` | **20 passed** |
| Backend API, workflow, auth, privacy, WhatsApp, E2E | `node --test tests/server/api.test.mjs` | **25 passed** |
| Intake engine (fixed clock) | `node --test tests/server/intake.test.mjs` | **8 passed** |
| **Total** | `npm test` | **75 passed, 0 failed** |
| Production build | `npm run build` | **passed** (main JS 296 KB, 92 KB gzip; admin code split) |

The backend tests cover enquiry creation, reference format and randomness, the **UNIQUE constraint rejecting duplicates**, retry on
collision, ignoring client-sent IDs and prices, invalid and past dates, missing fields, unknown car/city, bad JSON, wrong content type,
oversized bodies, rate limiting, tracking privacy (no access without key or digits; masked data; identical errors), customer details
completion, sessions (required, tamper-proof, HttpOnly/SameSite), viewer read-only, valid/invalid transitions, transition requirements,
optimistic-lock conflicts, system-only transitions, terminal states, full event history, summary counts, search by reference, change
feed, demo labelling, WhatsApp manual/meta/opt-in, and one complete end-to-end journey.

### Browser evidence (local dev, API on :8787)

1. Home → **Describe your trip**: *"Hi, need an automatic SUV in Hyderabad this Saturday for 3 days, family trip to Srisailam"* →
   extracted Hyderabad, Sat 14 Nov → Tue 17 Nov 2026, Srisailam, outstation; asked only for the car; suggested cars with published rates.
2. **Send enquiry** → saved; server issued **DF-TCY4JV**, status *More details needed*.
3. Private tracking link → stages Received ✓, Automated intake (current); full mobile masked.
4. Customer chose Grand Vitara Automatic → pipeline re-ran → *With the Aman team*, indicative ₹10,500 (3 × ₹3,500).
5. Staff signed in (demo `staff`) → dashboard KPIs from the database; DF-TCY4JV first in recent activity with source "Free text".
6. Enquiry workspace showed the original sentence, extracted fields, allowed actions only, and the audit trail including
   *"Enquiry received: not configured"* for WhatsApp.
7. **Prepare quote** (prefilled ₹10,500) → *Quote ready* → the customer's open tracking page updated by itself to *Quote ready, ₹10,500*.
8. **Quote ready** WhatsApp button → prepared message + `wa.me/91<customer>` link (not opened, nothing sent) → recorded as hand-off.
9. **Mark approved** → **Mark booking confirmed** without a note was refused by the server; with a note it succeeded; only *Cancel* remained.
10. Fresh tab across six routes: no console errors or warnings. 375 px width: no horizontal overflow on home + intake, tracking lookup,
    tracking page or staff login.

## 11. Remaining limitations

* **Not deployed.** https://aman-drive-gold.vercel.app is still the static site from `95e8997`; it has no database, so it stays in offline
  mode. Going live needs a hosted libSQL database plus `DATABASE_URL`, `DATABASE_AUTH_TOKEN` and `SESSION_SECRET` on Vercel (client/owner approval to provision).
* **No LLM.** Intake is rule-based: it handles the phrasings tested above and others like them, not arbitrary language.
* **WhatsApp automation not live** (above). No inbound webhook.
* Rate limits are per server instance; on serverless they limit bursts, not global quotas.
* Polling, not push: updates appear within 4–6 s.
* Dev-only: restarting the local API signs everyone out (random dev session secret).
* Demo staff password is documented for the demo; production must set `DEMO_MODE=false` and `STAFF_ADMIN_PASSWORD`.
* The legacy browser-only store remains only as the offline fallback; it is not shared with the dashboard.
* Real phones and Safari were not tested.

## 12. Ready for the video phase?

Locally, yes: every acceptance criterion in the brief was met and verified, except live WhatsApp delivery, which is honestly a
hand-off. For a public video URL, the deployment step (database provisioning) must happen first.
