# Enquiry lifecycle

Source of truth: `server/workflow.js`. The API refuses any transition not listed here (HTTP 422), checks the record version (HTTP 409 if
someone else changed it first) and writes an event for every change: enquiry, previous status, new status, actor, time, note.

## Statuses

| Status | Staff label | Customer sees | Meaning |
|---|---|---|---|
| `RECEIVED` | Received | Enquiry received | Saved; reference issued |
| `PROCESSING` | Processing | Being processed | Automated intake is running |
| `DETAILS_PENDING` | Details pending | More details needed | Car, city or dates missing; customer can add them on the tracking page |
| `STAFF_REVIEW` | Staff review | With the Aman team | Complete; a person checks availability and price |
| `QUOTE_READY` | Quote ready | Quote ready | Staff entered a quote amount |
| `APPROVED` | Approved | Approved, awaiting confirmation | Customer accepted; documents and deposit still to verify |
| `BOOKING_CONFIRMED` | Booking confirmed | Booking confirmed | Confirmed by staff, with a note |
| `REJECTED` | Not available | Not available | Terminal |
| `CANCELLED` | Cancelled | Cancelled | Terminal |

## Allowed transitions and actors

Happy path: `RECEIVED → PROCESSING → STAFF_REVIEW → QUOTE_READY → APPROVED → BOOKING_CONFIRMED` (the first two steps are automatic).

| From | To | Who |
|---|---|---|
| RECEIVED | PROCESSING | system |
| RECEIVED | CANCELLED | staff |
| PROCESSING | STAFF_REVIEW, DETAILS_PENDING | system |
| DETAILS_PENDING | PROCESSING | system, customer |
| DETAILS_PENDING | STAFF_REVIEW, CANCELLED | staff |
| STAFF_REVIEW | QUOTE_READY, REJECTED, DETAILS_PENDING, CANCELLED | staff |
| QUOTE_READY | APPROVED, REJECTED, STAFF_REVIEW, CANCELLED | staff |
| APPROVED | BOOKING_CONFIRMED, CANCELLED | staff |
| BOOKING_CONFIRMED | CANCELLED | staff |
| REJECTED, CANCELLED | none | |

"staff" means a signed-in `admin` or `staff` user. `viewer` users can read but get 403 on every write.

## Requirements per transition

* `QUOTE_READY`: a whole-rupee quote amount (prefilled in the UI from the published-rate estimate; staff enter the real price).
* `REJECTED`, `CANCELLED`, `DETAILS_PENDING` (by staff), `BOOKING_CONFIRMED`: a note of at least 3 characters.

## What runs automatically

On creation (`createEnquiry`): the row and its `created` event are written in one transaction, the reference is returned only after that
commit, then the pipeline runs `RECEIVED → PROCESSING → STAFF_REVIEW` (complete) or `→ DETAILS_PENDING` (something missing), and an
`enquiry_received` WhatsApp notification is attempted (recorded as `not_configured` while no Business API exists).

When the customer adds details: a `details` event, then `DETAILS_PENDING → PROCESSING` (customer) and the pipeline again.

Nothing after `STAFF_REVIEW` is automatic. No component sets availability, a final price or a confirmation on its own.

## Timeline shown to people

Customer and staff views group statuses into five stages: Enquiry received → Automated intake → Staff review → Quote / response →
Final decision. A stage shows as done only if its events actually happened.

## Tracking references

`DF-` + 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L), random, `UNIQUE` in the database, retried on collision.
Customer access: a 128-bit access key in the private tracking link (`/#/track/DF-XXXXXX?k=…`, only its hash is stored), or the last 4
digits of the mobile number.
