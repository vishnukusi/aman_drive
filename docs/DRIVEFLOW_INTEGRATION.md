# DriveFlow AI: integration readiness

**Status: not connected.** No AI assistant runs on this website, and nothing on the site says one does. This document describes the seam
that is already in place so DriveFlow can be connected later without rewriting the customer experience.

## Where the seam is

`src/services/enquiry.js` is the only place the UI hands an enquiry to "someone else":

| Function | Purpose |
|---|---|
| `createDraft(input, vehicles)` | Normalises any enquiry (one-tap sheet, home quick enquiry, future chat) into one canonical `EnquiryDraft` |
| `missingFields(draft)` | Deterministic list of what is still needed. An AI may **phrase** the follow-up question; it may not decide what is required |
| `submitEnquiry(input, vehicles, { channel })` | Validates, then delivers through the active channel. Always returns `confirmed: false` |
| `activeChannel()` | `whatsapp-link` (default) or `driveflow` via `VITE_ENQUIRY_CHANNEL` |

### EnquiryDraft

```js
{
  vehicleId, vehicleName,      // from the published catalogue only
  city,                        // 'vijayawada' | 'hyderabad' | 'vizag'
  pickupDate, returnDate,      // ISO dates
  destination, notes,          // free text, length-limited
  name, mobile,                // mobile normalised to 10 digits
  source                       // 'vehicle-card' | 'home-quick-enquiry' | future 'driveflow-chat'
}
```

### Result

```js
{ status: 'handoff', channel, url?, message?, confirmed: false }
```

## Rules a DriveFlow adapter must keep (enforced by tests in `tests/enquiry.test.mjs`)

1. **No invented prices.** Indicative figures come only from `src/lib/pricing.js` (deterministic, from published rates) and are labelled
   indicative. Final quotes come from staff.
2. **No availability claims.** There is no authoritative fleet system. An adapter must never say a car is available or a booking is confirmed;
   `confirmed` is forced to `false` by `submitEnquiry`.
3. **Deterministic validation.** `missingFields` decides completeness. Natural-language parsing may *fill* draft fields, which are then re-validated.
4. **Human handover.** Every enquiry ends with staff review (today: the WhatsApp conversation; later: the staff dashboard's status workflow).
5. **No documents.** ID, licence and selfie verification stay with the Aman team.

## What is needed before the `driveflow` channel can be switched on

| Item | Owner |
|---|---|
| Written approval from Aman Self Drive | Client |
| WhatsApp Business Platform account, verified number, approved templates, customer opt-in, per-conversation costs | Client + Meta/BSP |
| Hosted API for DriveFlow (server-side; **no keys in this frontend**) and a database for enquiries | ComputeX |
| Authoritative fleet / availability source, if availability is ever to be shown | Client |
| Privacy notice covering enquiry data | Client + ComputeX |

The `driveflow` adapter in `src/services/enquiry.js` currently throws `DriveFlow is not connected…` by design, and a unit test checks this.
