# Project audit: Aman Self Drive × DriveFlow

*Phase 0 engineering audit · 9 Nov 2026 · repository `vishnukusi/aman_drive` at commit `e6b398e` ("Initial commit")*

This audit was written **before any code was changed**. Everything below was read from the source or measured, not assumed. Sources:
the full repository (36 tracked files, ~4,400 lines) and the live client site, https://amanselfdrivecars.com/ (home, `/about`, `/contact`, `/faq` and the
three city pages, fetched 9 Nov 2026).

---

## 1. What the repository actually is

The repository is **not a copy of the client's public website**. It is *DriveFlow*: a concept demo built by ComputeX that puts a structured
enquiry flow in front of Aman's existing WhatsApp booking process, plus a demo staff dashboard. The README and every page carry a "Concept
demonstration by ComputeX" disclaimer.

That affects how the brief applies:

* The demo already has a working enquiry engine (pricing, validation, WhatsApp hand-off, enquiry store, staff workflow). We **keep** it and
  build the premium customer experience around it, as the brief asks ("Preserve working code").
* The public site is a separate PHP/HTML site (not in this repository). We do not have or change its code; we use it only as the source of
  verified facts and official brand assets.

## 2. Architecture and technology stack

| Layer | Implementation |
|---|---|
| Framework | React 18.3 (function components, hooks) |
| Routing | `react-router-dom` 7 with **`HashRouter`** (`#/cars`, `#/book` …) so the build works on any static host |
| Build | Vite 8 (`base: './'`), `@vitejs/plugin-react` 4 |
| Styling | One plain CSS file (`src/styles.css`, 266 lines), custom properties, mobile-first media queries |
| State | Hand-written store (`src/store.js`) on `useSyncExternalStore` + `localStorage`; `storage` event keeps tabs in sync |
| Backend | **None.** Enquiries live in the visitor's browser only |
| Tests | `node tests/logic.test.mjs`: 22 assertion tests of pure logic (pricing, validation, WhatsApp message, data integrity) |
| Lint / types | None configured (no ESLint, no TypeScript) |
| Deploy | Static `dist/` folder |

### Directory map

```
index.html                 Vite entry (title/description = DriveFlow demo)
src/main.jsx               HashRouter + StrictMode
src/App.jsx                Route table, scroll-to-top
src/config.js              Business constants, env overrides, status list
src/store.js               localStorage store: enquiries, vehicles, demo admin session
src/data/vehicles.js       22 cars (names, photos, rates from amanselfdrivecars.com)
src/data/faq.js            FAQ with verified / confirm-with-team flags
src/data/seedEnquiries.js  7 simulated enquiries (DF-0993…0999)
src/lib/pricing.js         Duration + indicative estimate (pure)
src/lib/validation.js      Mobile/email/date/step validation (pure)
src/lib/whatsapp.js        Prefilled wa.me messages (pure)
src/components/            ui.jsx (Modal, Field, CarImage, EstimateBox, badges), VehicleCard, VehicleDetails
src/customer/              CustomerLayout, Home, Cars, Book (6-step wizard), Confirmation, Track
src/admin/                 AdminLayout, AdminLogin, Dashboard, Enquiries, EnquiryDetail, VehicleManager, Roadmap
tests/logic.test.mjs       Unit tests
docs/                      verified-info.md, DEMO_GUIDE.md
```

### Routes (all preserved by this upgrade)

| Route | Page |
|---|---|
| `#/` | Home |
| `#/cars` (`?category=&trans=&price=`) | Fleet with filters |
| `#/book` (`?car=<id>`) | 6-step booking request wizard |
| `#/enquiry/:id` | Enquiry hand-off to WhatsApp |
| `#/track` | Look up an enquiry by ID + last 4 digits |
| `#/admin/login`, `#/admin`, `/enquiries`, `/enquiries/:id`, `/vehicles`, `/roadmap` | Demo staff dashboard |
| `*` | Redirect to `#/` |

## 3. Baseline verification (before changes)

| Check | Result |
|---|---|
| `npm install` | **FAILS.** `ERESOLVE`: `vite@^8.3.5` conflicts with the peer range of `@vitejs/plugin-react@^4.3.1` (`vite ^4–^7`). A fresh clone cannot be installed or built |
| `npm run build` | **Cannot run** (`'vite' is not recognized`) because of the install failure |
| `npm test` | **22/22 pass** (pure Node, no dependencies) |
| README accuracy | README says "React Router 6, Vite 5"; `package.json` pins Router 7 and Vite 8 |
| Unused dependency | `vite-plugin-singlefile` is installed but never imported |

## 4. Brand identity (taken from the official site, not invented)

| Element | Official value | Source |
|---|---|---|
| Logo | `Aman_Logo.png`, 150 × 100 PNG: red steering wheel with wings, navy **AMAN**, red "SELF DRIVE CAR RENTALS" | `amanselfdrivecars.com/assets/images/Aman_Logo.png` |
| Primary navy | `#314965` (`--c1`) | `style.css` |
| Brand red | `#c91f2d` (`--c2`) | `style.css` |
| Accent amber | `#ffc001` (`--c3`); `#ffb907` topbar stripe | `style.css` |
| Brand gradient | `linear-gradient(to right, #c91f2d, #314965)` (`--cg`) | `style.css` |
| Deep navies used on the home page | `#0b1b33`, `#10294d` | inline styles |
| WhatsApp green | `#25d366` | inline styles |
| Heading font | **Rajdhani** | `style.css` (`h1–h6`) |
| Body font | **Poppins** | `style.css` (`html, body`) |

**Finding:** the demo does **not** use the official identity. It shows a text-letter "A" placeholder instead of the logo, an orange
(`#f08c00`) accent that is not in the brand, and system fonts. The demo title is "DriveFlow", not the client's name.

## 5. Verified business facts (re-checked 9 Nov 2026)

All 22 cars, 24-hr rates, printed 12-hr rates and the ₹400 extra-hour flags in `src/data/vehicles.js` **match the live site exactly**
(checked car by car). Other facts confirmed on the site:

* Phone / WhatsApp **+91 95813 78999**; email **keerthikumar007@gmail.com** (shown in the site header and footer).
* Three offices with Google Maps links:
  * Vijayawada: MG Rd, Revenue Colony Park, Sidhartha Nagar, Labbipet 520010 (`maps.app.goo.gl/fo599o2rQY3Srcfw7`)
  * Hyderabad: Sri Sai Krishna Nivas, HIG 358, KPHB Phase 6, Kukatpally 500085 (`maps.app.goo.gl/T7Pmeri2mrRmprpV9`)
  * Vizag: 29-13-29/1, Prakasaraopeta, Nehru Nagar, Ram Nagar, Visakhapatnam 530020 (`maps.app.goo.gl/y6BJP6R7YBMYPrha9`)
* Business statistics published by the business itself: 8 years of experience, 2 states, 10 locations, 1,000+ happy customers.
* Four Google reviews shown on the home page with names (Srinivas Kamal, Vamshi Nimmagadda, Rajasekharrao Y, Kranthi Kumar Duggirala), all 5★.
* Why-choose points: one-way travel, sanitized cars, transparent pricing, safe & convenient, real support, simple verification.
* Delivery in Vijayawada (home, hotel, railway station, Gannavaram Airport) or MG Road self-collect; one-way trips between the three cities
  on request; fuel and tolls extra; "Prices include the vehicle and standard insurance".
* Social: facebook.com/vijayawadaselfdrivecars, instagram.com/amanselfdrivecars.

### Policies the demo said were "not published" but now are

`/faq` on the official site **now publishes**: minimum age 24; documents; possible extra charges; late return ₹400/hr (regular) and
₹600/hr (7-seaters); renter pays 60 % of damage estimate; a cancellation refund schedule (50 % ≥24 h, 25 % ≥6 h, 10 % ≥2 h, none <2 h).
`docs/verified-info.md` is out of date on this point.

### Conflicts that need client confirmation

1. **Late-return rate for 7-seaters:** `/faq` says ₹600/hr; every 7-seater card on the home page says "Extra hour ₹400".
2. **Documents:** the home page lists a live selfie and a refundable deposit; `/faq` lists Aadhaar, deposit "as applicable" and a booking confirmation.
3. **Hours:** the Hyderabad page says "Open 8 AM–9 PM daily"; no hours are given for Vijayawada or Vizag; directories differ.
4. **Fleet by city:** the site publishes one fleet and one price list; it does not say whether every car is available in all three cities.
5. **Footer copyright year** on the live site is 2025.

## 6. Feature inventory and classification

| Feature | Status | Notes |
|---|---|---|
| 22-car catalogue with official names, photos, rates | **Completed and verified** | Re-checked against live site |
| Fleet filters (type, transmission, price band) | **Completed and verified** (by code reading) | No sort; no Premium / Family groupings asked for in the brief |
| Vehicle details modal | Completed, unverified in browser | |
| 6-step booking wizard with validation | **Completed and verified** (unit tests cover validation) | No **pickup city** step: only Vijayawada handover options, although the business runs three cities |
| Indicative estimate | **Completed and verified** (unit tests) | Correctly labelled indicative |
| WhatsApp prefilled hand-off | **Completed and verified** (unit tests) | Message lacks city |
| Enquiry tracking | Implemented but unverified | Browser-local only (documented) |
| Staff dashboard, status workflow, notes, vehicle manager, roadmap | Implemented but unverified | Demo-only client-side gate |
| Official logo / favicon | **Not implemented** | Placeholder "A" |
| About section | **Not implemented** | |
| Locations (3 cities) | **Not implemented** | Only Vijayawada address in footer |
| Why Choose Aman | **Not implemented** | |
| Customer reviews | **Not implemented** | Real reviews exist on the live site |
| FAQ | Partially implemented | `<details>` accordion; policies from `/faq` missing |
| Contact (phone, WhatsApp, email, all offices, maps) | Partially implemented | No email, no Hyderabad/Vizag |
| Footer | Partially implemented | No socials, no locations |
| Premium visual / 3D / animation | **Not implemented** | No motion at all |
| SEO metadata, OG, structured data, robots, sitemap | **Not implemented** | Title/description describe the demo |
| Code splitting | **Not implemented** | Admin code ships to every visitor |
| Live availability, payments, WhatsApp Business API | Not implemented (by design) | Must not be claimed |
| Hours, delivery charges, deposit amounts | **Requires client confirmation** | |

## 7. UI / UX issues

1. No official logo or brand colours; generic look, not a "premium showroom".
2. Navigation lacks About, Locations, Fleet, Contact; the FAQ link sets `location.hash` and uses a 60 ms `setTimeout` to scroll.
3. The mobile menu has no FAQ link and stays open on route change only because each link closes it manually.
4. **Misleading confirmation copy.** The confirmation page says *"Your booking request has been received"* although nothing has been sent
   to the business yet; the request only reaches Aman when the customer presses Send in WhatsApp. This contradicts the brief's rule against
   implying a booking or receipt that has not happened.
5. No one-tap "Enquire on WhatsApp" for a single car; every path goes through the six-step wizard.
6. The FAQ accordion has no animation and uses `+`/`–` glyphs only.
7. The `hero-img` caption "Photo: Aman Self Drive website" exposes the demo's sourcing to customers.

## 8. Responsive issues (from CSS review; to be confirmed in browser in Phase 5)

* Wide admin tables use horizontal scrolling inside `.table-wrap` (acceptable).
* The floating WhatsApp button can cover the last footer line on small phones (no bottom padding reserved).
* The `.kv` grid keeps a 100 px label column on 320 px screens, which is tight but not overflowing.

## 9. Performance issues

* All 22 car photos are **hot-linked** from amanselfdrivecars.com (500 × 350 JPEG up to 1600 × 1200 JPEG at 373 KB) with no `width`/`height`,
  so cards can shift during load (CLS).
* **Seven `.avif` photos are served by the client's server as `Content-Type: text/plain` with `X-Content-Type-Options: nosniff`.**
  Browsers may refuse to render them, in which case the card falls back to a text label (to be confirmed in browser).
* No code splitting: the admin dashboard is bundled for every customer.
* No font strategy (system fonts are fast, but the brand fonts are missing).

## 10. Security and privacy review

| Item | Finding | Severity |
|---|---|---|
| Demo admin credentials | `VITE_ADMIN_USER/PASS` are compiled into the client bundle and **printed on the login screen**. Acceptable only as a labelled demo gate; never real security | Medium (documented) |
| Secrets / API keys | None found in source or `.env.example` | OK |
| External links | All `target="_blank"` links use `rel="noreferrer"` (implies `noopener`) | OK |
| Input validation | Mobile, email, dates, required fields validated; React escapes output | OK |
| Personal data | Name, mobile, optional email stored in `localStorage`; ID documents explicitly not collected | OK for demo; needs a privacy notice in production |
| Enquiry privacy | Confirmation page only opens in the creating session; tracking requires ID + last 4 digits with a non-enumerating error | OK |
| Third-party scripts | None | OK |

## 11. Existing integrations

| Integration | Status |
|---|---|
| WhatsApp | `wa.me` click-to-chat links with prefilled text, verified by unit tests. **Not** a WhatsApp Business API |
| Phone | `tel:` links |
| Google Maps | One short link (Vijayawada) |
| Images | Hot-linked from the client's server |
| Back end / CRM / fleet system | None |

## 12. Dependencies

Runtime: `react`, `react-dom`, `react-router-dom`, all needed. Dev: `vite`, `@vitejs/plugin-react` (version conflict), `vite-plugin-singlefile` (unused, to be removed).

## 13. Technology decision for the 3D / motion layer

* There is **no genuine 3D model** of any Aman car, and the brief forbids fake or poorly rendered models. Three.js / React Three Fiber
  would add roughly 150 KB+ gzip for no authentic content, so they are **not used**.
* The hero instead uses the client's **own fleet photography** (Thar 4×4 with the Aman watermark; Vijayawada barrage city image) in layered
  CSS 3D space (`perspective`, `translateZ`) with pointer parallax on fine pointers only.
* Scroll reveals, counters, card tilt and magnetic CTAs are written in ~150 lines of plain React + `IntersectionObserver` +
  `requestAnimationFrame`. GSAP and Framer Motion are not needed for this scope. **Zero new runtime dependencies.**
* Every effect is disabled under `prefers-reduced-motion` and, for tilt and parallax, on coarse (touch) pointers.

## 14. Recommended implementation sequence

1. **Fix the install** (`@vitejs/plugin-react` → 6.x, which supports Vite 8), remove the unused plugin, correct the README.
2. **Design tokens** from the official palette and fonts; official logo in nav, footer and favicon.
3. **Information architecture:** add About, Locations (with city pages), Why Choose, Reviews, Contact sections; keep every existing route.
4. **Booking honesty fix:** reword the confirmation page; add a pickup-city step and city in the WhatsApp message; add a one-tap per-car WhatsApp enquiry.
5. **Fleet:** Premium / Family collections, sort, kilometre allowance on every card, image dimensions to prevent layout shift.
6. **Motion:** hero depth and parallax, scroll reveals, counters, tilt; all honour reduced-motion.
7. **Performance:** lazy-load the admin bundle, preconnect + `display=swap` fonts, eager hero image with `fetchpriority`.
8. **SEO:** title, description, Open Graph, canonical (configurable), JSON-LD `AutoRental` with verified facts only, `robots.txt`, `sitemap.xml`.
9. **DriveFlow readiness:** a typed enquiry contract and gateway module separating deterministic booking logic from any future AI layer.
10. **Verify:** unit tests, production build, browser checks at 375 / 768 / 1440 px, Lighthouse.

## 15. Decisions requiring client approval (tracked through the project)

| # | Decision | Default used until approved |
|---|---|---|
| D1 | Permission to self-host car photos (instead of hot-linking) | Keep hot-linking client images |
| D2 | Whether the public build shows the "concept demo" notice | Shown when `VITE_DEMO_MODE` is not `false` (default on) |
| D3 | Late-return rate for 7-seaters (₹400 vs ₹600) | Show the rate printed on each car card; FAQ quotes `/faq` with a "confirm" note |
| D4 | Which cars are available in Hyderabad and Vizag | Same catalogue shown; "availability confirmed on WhatsApp" |
| D5 | Opening hours per city | Not stated |
| D6 | Which cars count as "Premium" | Rule: published 24-hr rate ≥ ₹4,500 |
| D7 | Canonical domain and hosting for this build | No canonical unless `VITE_SITE_URL` is set |
| D8 | WhatsApp Business API and any DriveFlow AI go-live | Not connected; no claims made |
