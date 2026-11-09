# DriveFlow automation architecture (as built)

*9 Nov 2026 · describes the code in this repository, not a plan*

```
Customer website (React, Vite)                      Staff dashboard (/#/admin, same React app, lazy-loaded)
  ├─ Quick enquiry form / car-card sheet               ├─ Overview (KPIs, pipeline, sources, WhatsApp stats)
  ├─ "Describe your trip" free-text intake              ├─ Enquiry inbox (search, status/city filters)
  ├─ 6-step trip planner                                 ├─ Enquiry workspace (actions, intake, WhatsApp, notes, audit)
  └─ Tracking page /#/track/DF-XXXXXX                   └─ Fleet catalogue
            │   fetch("api/…")  same origin                      │  HttpOnly session cookie
            └──────────────────────┬─────────────────────────────┘
                                   ▼
                server/app.js   one request handler (Node http req/res)
                  · JSON-only POST/PATCH (blocks cross-site form posts) · 20 KB body limit · rate limits · security headers
                                   │
      ┌────────────────────────────┼─────────────────────────────────────────────┐
      ▼                            ▼                                             ▼
 server/intake.js            server/service.js                              server/security.js
 rule-based NLP:             createEnquiry → reference (server/ids.js)       scrypt passwords, HMAC-signed sessions,
 extract · validate ·        runPipeline (automated transitions)             roles admin/staff/viewer, rate limiter
 missing fields · questions  transition() ← server/workflow.js (state machine)
 · suggestions · estimate    supplyDetails · staffMessage · summary · search
 (src/lib/pricing.js)        changesAfter (live-sync feed) · audit
                                   │                          │
                                   ▼                          ▼
                       server/db.js  libSQL           server/whatsapp.js
                       enquiries · enquiry_events ·   manual (wa.me hand-off) · meta (Cloud API) · mock
                       communications · staff_users ·
                       vehicles · changes · audit_log
```

## Runtimes

| Where | How the API runs | Database |
|---|---|---|
| Local development | `npm run api` → `server/dev-server.mjs` on :8787; Vite proxies `/api` (dev and preview) | `file:./data/driveflow.db` (git-ignored) |
| Tests | `node --test tests/server/*.test.mjs` starts the handler on a random port | in-memory libSQL |
| Vercel (prepared, not live) | `api/index.js` serverless function; `vercel.json` rewrites `/api/(.*)` to it | must be hosted libSQL (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`). Without it the API answers **503 not configured** and the website falls back to its offline mode |

## Why these choices

* **Kept the stack.** React + Vite unchanged. The backend is plain Node modules with one dependency, `@libsql/client`; no framework.
* **libSQL:** the same SQL dialect runs as a local file (fully testable here) and as a hosted database. Docker/Postgres were unavailable for testing on this machine.
* **Polling, not WebSockets/SSE.** Serverless functions cannot hold long connections. Staff pages poll `GET /api/staff/changes?after=<seq>` every 4 s and refetch only when the sequence moved; the tracking page polls every 6 s. Polling pauses when the tab is hidden.
* **No LLM.** None was authorised. The intake is deterministic and explainable; `parseMessage()` is the single place an LLM could later be added, and its output would still pass `validateDraft()`.

## Separation of concerns

| Concern | Module | Notes |
|---|---|---|
| Understanding text | `server/intake.js` `parseMessage` | Never sets price, availability or status |
| Business rules | `server/intake.js` `validateDraft`, `server/workflow.js` | Deterministic; the same rules for every source |
| Pricing | `src/lib/pricing.js` | Published rates only; always "indicative" |
| State changes | `server/service.js` `transition` | Atomic batch: update with version check + event + change-feed row |
| Communication | `server/whatsapp.js` | Returns a record; never throws on provider errors |
| Identity & access | `server/security.js` | Server-side only |

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | public | DB kind, demo mode, intake engine, WhatsApp provider |
| GET | `/api/vehicles` | public | Visible catalogue |
| POST | `/api/intake/preview` | public, 60/min | What the intake understands (nothing saved) |
| POST | `/api/enquiries` | public, 8/10 min | Create → reference, access key, timeline, questions |
| GET | `/api/track/:ref?k=` or `?last4=` | key or digits, 120/min | Limited customer view + timeline |
| POST | `/api/track/lookup` | digits, 10/10 min | Same, by reference + last 4 digits |
| POST | `/api/track/:ref/details` | key or digits | Customer supplies missing details |
| POST | `/api/staff/login`, `/logout`; GET `/me` | — / session | Sessions (12 h, HttpOnly, SameSite=Strict) |
| GET | `/api/staff/summary`, `/enquiries`, `/enquiries/:ref`, `/changes`, `/vehicles`, `/statuses` | any role | Dashboard data |
| POST | `/api/staff/enquiries/:ref/transition`, `/notes`, `/messages` | admin, staff | Writes |
| PATCH | `/api/staff/vehicles/:id` | admin | Rates / visibility |
| POST | `/api/staff/demo/reset`; GET `/api/staff/audit` | admin | Demo reset (demo mode only); audit log |

Errors are always `{ error: { code, message, fields? } }` with 400/401/403/404/405/409/413/415/422/429/503/500.

## Data model

* `enquiries`: one row per enquiry; `reference UNIQUE`, `CHECK(status IN …)`, `version` for optimistic locking, `tenant_id`,
  `is_demo`, `access_key_hash` (SHA-256; the key itself is never stored), `intake_json` and `estimate_json`.
* `enquiry_events`: append-only log (`created`, `status`, `details`, `note`, `communication`), with from/to status, actor, note, data, time.
* `communications`: every WhatsApp attempt with its honest status (`handoff_link`, `not_configured`, `sent`, `failed`, `simulated`).
* `staff_users` (`UNIQUE(tenant_id, username)`, role check), `vehicles`, `changes` (live-sync sequence), `audit_log`.

## Security controls

Server-side validation of every field; prices and IDs from the browser are ignored; scrypt password hashes; HMAC-signed, HttpOnly,
SameSite=Strict session cookie; role checks (viewer is read-only); JSON-only writes; body size limit; per-IP rate limits (per instance on
serverless); access key or mobile check for tracking with an identical error for wrong digits and unknown references; customer view
masks the mobile number and omits the surname; parameterised SQL throughout; `SESSION_SECRET` mandatory in production; audit log for
logins, failed logins, vehicle edits and demo resets.
