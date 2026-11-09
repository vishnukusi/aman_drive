# Deployment report: Aman Self Drive preview

*9 Nov 2026 · COMPUTEX development preview. **Not** an official launch and not a replacement for amanselfdrivecars.com.*

| # | Item | Value |
|---|---|---|
| 1 | Provider | **Vercel** (Hobby plan, account `chandrashekar-kadagala`, project `aman-drive`) |
| 2 | Live preview URL | **https://aman-drive-gold.vercel.app** |
| 3 | GitHub repository | https://github.com/vishnukusi/aman_drive |
| 4 | Branch | `main` |
| 5 | Commits | `33cb3af` feat: complete Aman Self Drive premium website experience · `bb679b0` chore: add Vercel config · this report's commit (see `git log`) |
| 6 | Build | Passed: locally (`npm run build`, Vite 8.3.5) and on Vercel (`npm ci && npm run build`, "Build Completed … Deployment completed … Ready") |
| 7 | Tests | `npm test`: **42 passed, 0 failed** (22 + 20) |
| 8 | Deployment status | **Ready** (production) |

## Configuration

* `vercel.json`: Vite preset, `npm ci`, `npm run build`, output `dist`; headers `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`; `assets/*` cached for 1 year (content-hashed file names).
* `.vercelignore` keeps `.env*` (except `.env.example`), `node_modules`, `dist` and `.vercel` out of uploads.
* **No environment variables are set on Vercel.** Defaults apply: preview mode on, no `VITE_SITE_URL`, so the build is `noindex` and `robots.txt` is `Disallow: /`.
* Hash routing (`#/…`) means no rewrite rules are needed; unknown routes redirect to home in the app.
* The CLI's `vercel link` wrote a short-lived `VERCEL_OIDC_TOKEN` to `.env.local`; that file is git-ignored and excluded from uploads.

## 9. Browser verification of the live URL (built-in browser; Claude in Chrome was not connected)

| Check | Result |
|---|---|
| HTTP | `/` 200 `text/html`; logo 200 `image/png`; car and city WebP 200 `image/webp`; `robots.txt` 200 (`Disallow: /`); `sitemap.xml` 404 (expected: none in preview builds) |
| Headers | `X-Robots-Tag: noindex, nofollow` present; hashed JS `Cache-Control: public, max-age=31536000, immutable` |
| Preview protection | "Preview build" banner shown; `<meta name="robots" content="noindex, nofollow">` present |
| Logo / fonts | Official logo loads at native 150 × 100; Poppins and Rajdhani loaded |
| Routes | `#/`, `#/cars`, three city pages, `#/book`, `#/track`, `#/admin/login` load; unknown route redirects to `#/` |
| Images | Home 13/13, Fleet **24/24**, each city page 25/25, planner 24/24, all decoded |
| Filters / sort | All 22 → SUVs 10 → SUV + Automatic 4 → cleared 22; Premium = Seltos, XUV 500, Innova Crysta, Thar, Fortuner; price high→low starts ₹15,000, ₹5,000 |
| FAQ | 11 items; opening one closes the previous one |
| Contact | `tel:+919581378999`, WhatsApp, `mailto:keerthikumar007@gmail.com`, three official Google Maps links |
| Footer | Fleet, planner, tracking, FAQ, blog, three city pages, phone, WhatsApp, email, maps, official site, demo dashboard link |
| Form validation | Empty submit: 4 field errors; invalid mobile rejected |
| WhatsApp | Link to `wa.me/919581378999` with car, city, dates, name and mobile, no price claim. `window.open` was stubbed; **nothing was sent** |
| Booking planner | Swift, Hyderabad through all steps → `DF-1001`, "Your enquiry is ready to send", message includes `City: Hyderabad` and the KPHB office (stored only in the test browser) |
| Responsive | 375 × 812, 768 × 1024, 1440 × 900: **0 px horizontal overflow** on every route checked; mobile menu opens with 9 links |
| Console | No errors |

Not verified: real iOS/Android devices, and animation smoothness in a foreground window (the test browser pane was hidden, so CSS animations were throttled).

## Automatic deployment: not yet active

`vercel git connect https://github.com/vishnukusi/aman_drive.git` failed: *"Failed to connect vishnukusi/aman_drive to project … make sure you have access to the repository"*.
The repository belongs to the GitHub account **vishnukusi**, and Vercel's GitHub App has no access to it from the `chandrashekar-kadagala` Vercel account.

To enable push-to-deploy, either:
1. **The repo owner** (vishnukusi) installs the Vercel GitHub App on `aman_drive` and grants access to the Vercel account (Vercel → Project `aman-drive` → Settings → Git → Connect Git Repository); or
2. Import the repo in Vercel from a GitHub account that has admin access to `vishnukusi/aman_drive`.

Until then, deploy manually from the project folder:

```bash
npx vercel@65.12.1 deploy --prod
```

Once connected: every push to `main` builds and deploys to `https://aman-drive-gold.vercel.app`; pushes to other branches get preview URLs.

## 10. Outstanding client approvals

| # | Decision | Status on this deployment |
|---|---|---|
| D1 | Permission to host Aman's car and city photos | **Not yet given.** Photos are the client's own, displayed on a `noindex` preview, and are also in the public GitHub repo. Remove or replace them if Aman declines |
| D2 | Removing the preview notice / using this as the official site | Not given: notice kept, `noindex` kept, no custom domain, no DNS change |
| D3 | 7-seater late-return rate ₹400 vs ₹600 | Unresolved: FAQ shows both and says "confirm with the team" |
| D4 | Car availability in Hyderabad and Vizag | Unresolved: "confirmed on WhatsApp" |
| D5–D10 | Hours, Premium rule, domain, DriveFlow/WhatsApp API, documents list, privacy notice | See `docs/FINAL_COMPLETION_REPORT.md` |
