# Business information: verified, assumed, missing

Source checked: https://amanselfdrivecars.com/ (home page, read 30 Oct 2026) plus public directory listings that matched the same phone number.
Note: the specific URL in the brief (`/affordable-self-drive-cars-in-vijayawada`) could not be fetched directly in the build environment; the live site's own home page and Vijayawada links were used instead (it links to `/self_drive_cars_in_vijayawada`). Please re-open the site once before the meeting to confirm nothing has changed.

## Verified on the official website
| Item | What the site says |
|---|---|
| Business | Aman Self Drive Car Rentals, 8 years in business, Vijayawada (home city), Hyderabad, Vizag |
| WhatsApp / phone | +91 95813 78999 (`wa.me/+919581378999` links on the site) |
| Vijayawada office | MG Rd, Revenue Colony Park, Sidhartha Nagar, Labbipet, Vijayawada 520010 |
| Fleet and 24-hr rates (400 km) | 22 cars listed, from ₹1,500 (Wagon R CNG, Tigor) to ₹15,000 (Fortuner Automatic). Full list in `src/data/vehicles.js` |
| 12-hr rates (200 km) | Printed only for some cars (Creta ₹2,000, Venue ₹2,000, Grand Vitara ₹2,500, Thar ₹3,000, Exter/Punch/Glanza ₹1,500) |
| Extra hour | ₹400 on most cars |
| Extras | Fuel and tolls are extra |
| Vijayawada delivery | Home, hotel, railway station, Gannavaram Airport; or collect from MG Road office |
| One-way trips | Vijayawada, Hyderabad, Vizag, on request |
| Documents | Licence at least 1 year old, government photo ID, live selfie, refundable deposit (amount depends on car) |
| Booking process | Choose car and city, share documents, get final price and pickup details on WhatsApp, inspect and drive |
| Availability | Site says to confirm availability on WhatsApp before booking |
| Images | Car photos hosted at amanselfdrivecars.com/assets/images (hot-linked, not copied) |

## Conflicting / not confirmed
- **Support hours:** the brief says about 6 AM–9 PM with WhatsApp 24/7. Public listings show 6 AM–9 PM (Justdial) and 8 AM–9 PM (a page on Aman's own site) and 9 AM–9 PM (another directory). DriveFlow therefore **does not state hours**; the FAQ says "please contact Aman Self Drive for confirmation".
- **Office address:** directories list other addresses (Currency Nagar, Machavaram, Moghalrajpuram). The address on Aman's own site is used.

## Not published, so NOT claimed anywhere in the app
Deposit amounts, fuel policy, insurance terms, kilometre overage charges, cancellation and refund rules, minimum age, delivery charges, one-way charges, weekly/monthly pricing, live availability.
Anything touching these says "Please contact Aman Self Drive for confirmation."

## Assumptions made in the demo
- **Category and seats** (Hatchback / Sedan / SUV / MPV, 4–7 seats) are generic for each model, not read from the site. The UI marks seats with an asterisk. Individual fleet cars may differ.
- **Transmission and fuel** are shown only when the site's wording includes them (e.g. "AT & MT", "Automatic", "CNG", "Diesel"); otherwise "not stated".
- **Estimates** apply: 24-hr slots at the listed rate; a part-day takes the 12-hr rate if one is printed (first 12 hours only), otherwise the cheaper of extra hours at ₹400 or another 24-hr slot. How Aman actually bills overruns is unknown, so every estimate is labelled indicative and final price is staff-confirmed.
- **Reviews:** the site shows Google reviews; DriveFlow does not reproduce any testimonials.

## Simulated data
Seven enquiries (`DF-0993` to `DF-0999`) with fictional names ("Demo Customer A…") and 90000-00xxx numbers, tagged "Simulated" everywhere.

---

## Re-check on 9 Nov 2026 (website upgrade)
- All 22 cars, 24-hr rates, printed 12-hr rates and ₹400 extra-hour flags re-checked car by car: **no changes**.
- Added from the official site: email (keerthikumar007@gmail.com), Hyderabad and Vizag office addresses and Google Maps links, social links,
  the business's own stats (8 years, 2 states, 10 locations, 1,000+ customers), four Google reviews with names, "Why choose" points, About text.
- **The section "Not published, so NOT claimed" above is now partly out of date.** `amanselfdrivecars.com/faq` publishes: minimum age 24,
  late return ₹400/hr (regular) and ₹600/hr (7-seaters), 60 % of damage estimate payable, and a cancellation refund schedule. The site's FAQ
  now quotes these with their source. Still unpublished: deposit amounts, delivery charges, one-way charges, live availability.
- Conflicts needing the client: 7-seater late-return rate (₹600 on /faq vs ₹400 on car cards); document list (home vs /faq); opening hours
  (8 AM–9 PM is printed only on the Hyderabad page). Full list: `docs/FINAL_COMPLETION_REPORT.md`.
