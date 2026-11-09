# DriveFlow
**A smarter rental enquiry and booking coordination experience, built for Aman Self Drive Car Rentals (Vijayawada).**

> **Concept demonstration by ComputeX.** Not an official or integrated product of Aman Self Drive. No connection to their systems.

## What it does
Customer picks a car → DriveFlow collects dates, pickup/return, destination and contact details → an enquiry with a unique ID is saved → customer sends a prefilled WhatsApp message → staff review it in a dashboard, update the status and reply on WhatsApp → final confirmation is always given by a human.

## Why it fits Aman Self Drive
Their website already sends customers to WhatsApp to book and says availability and the final price are confirmed there. DriveFlow keeps that workflow and only adds structure in front of it: the team receives the car, dates, locations, trip and a price indication in one message instead of piecing them together across several. We have **not** confirmed that the business has any current problem; this is a proposal to test with the owner.

## Features
**Customer site** (mobile-first, official Aman logo, colours and fonts): cinematic hero with layered 3D depth built from Aman's own photos, published business stats, three city pages (`#/locations/vijayawada|hyderabad|vizag`), 22-car fleet with Hatchback / Sedan / SUV / MPV types plus Premium and Family collections, transmission / price filters and sorting, one-tap "Enquire now" sheet that opens WhatsApp with car, city, dates and contact prefilled, six-step trip planner (car, dates, city & pickup/return, trip, contact, review) with indicative estimate, enquiry tracking, Why Aman, Google reviews (as published), About, FAQ from the official FAQ pages, contact with all three offices.
**Staff dashboard** (`/#/admin`): overview cards, searchable/filterable enquiry table, enquiry detail with six manual statuses, confirmation indicator, notes, history, "Open WhatsApp Conversation", vehicle manager (add / edit / hide / rates), and a production roadmap page.

## Run it
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 42 unit tests (pricing, validation, WhatsApp messages, enquiry service, data)
npm run images     # re-download Aman's photos/logo and regenerate public/images (needs network)
npm run build && npm run preview
```
Routes use `#/` so the build works on any static host.

**Demo admin login:** `admin` / `driveflow` (open `/#/admin`, or "Staff dashboard (demo)" in the footer).

Configuration (optional, see `.env.example`): `VITE_WHATSAPP_NUMBER`, `VITE_PHONE_DISPLAY`, `VITE_EMAIL`, `VITE_DEMO_MODE`, `VITE_SITE_URL` (enables canonical, robots and sitemap; without it the build is `noindex`), `VITE_ENQUIRY_CHANNEL`, `VITE_ADMIN_USER`, `VITE_ADMIN_PASS`, `VITE_DELIVERY_ENABLED`. Default WhatsApp number is the one on amanselfdrivecars.com (919581378999). Re-check it against the site before each meeting.

## Stack
React 18, React Router 7 (hash routing), Vite 8, plain CSS with design tokens, no animation or 3D libraries (motion is ~200 lines in `src/lib/motion.js`, all disabled under `prefers-reduced-motion`). `sharp` is a dev-only dependency for the image script. Storage is the browser's `localStorage`; no backend. The staff dashboard is code-split and loaded only on `#/admin`.

## Simulated vs real
| Real in the demo | Simulated / not implemented |
|---|---|
| Catalogue names, photos (hot-linked) and rates from Aman's site | Live fleet availability (**none**; "visible" ≠ available) |
| Date validation, duration and estimate maths | Automatic booking confirmation (**never**; staff only) |
| Enquiry saving, unique IDs, persistence across refresh | Payments |
| Search, filters, status workflow, notes, vehicle edits | WhatsApp Business API / automatic replies (the link only opens WhatsApp; the customer presses Send) |
| `wa.me` links with prefilled text | Any link to the business's systems or real bookings |
| | Real security: the admin login is a client-side gate; storage is per browser, so a phone and a laptop do not share enquiries |

No ID documents or sensitive data are requested. Use fictional test details when presenting.

## Production roadmap
See `/#/admin/roadmap` in the app. Short version: Phase 2 needs Aman's verified fleet and pricing rules, a real database with authentication, and an approved WhatsApp Business account (Meta credentials, templates, opt-in, fees); Phase 3 builds notifications, reminders and reporting on that. None of it can start without the business's permission and data.

## Notes
- Car photos are Aman's own photos, self-hosted as resized WebP in `public/images` (`npm run images`). Hot-linking was dropped because the client's server sends its `.avif` files as `text/plain` + `nosniff`, which browsers refuse to display (7 of 22 cars showed no photo). Written approval from Aman to host the images is still to be obtained (see the completion report).
- Engineering docs: `docs/PROJECT_AUDIT.md` (before), `docs/FINAL_COMPLETION_REPORT.md` (after), `docs/DRIVEFLOW_INTEGRATION.md`.
- Verified facts, conflicts and gaps: `docs/verified-info.md`. Meeting script: `docs/DEMO_GUIDE.md`.
