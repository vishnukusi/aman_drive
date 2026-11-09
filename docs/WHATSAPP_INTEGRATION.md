# WhatsApp integration: actual status

**Live automated WhatsApp messaging is NOT working, because it is not authorised.** No Meta Business account, phone number ID, access
token or approved templates have been provided. Nothing in this repository sends a WhatsApp message on its own today.

## What happens today (provider `manual`, the default)

| Situation | What DriveFlow does | Recorded as |
|---|---|---|
| Enquiry created | Tries the `enquiry_received` notification; no API, so nothing is sent | `not_configured` |
| Customer wants to talk to Aman | Shows a `wa.me/919581378999` link with the reference prefilled; the **customer** presses Send | not recorded (customer's own action) |
| Staff clicks a template button | Builds the message and a `wa.me/91<customer>` link; the **staff member** opens WhatsApp and presses Send | `handoff_link` |

A `wa.me` link is only a hand-off. DriveFlow cannot know whether it was sent or delivered, and the dashboard says so
("Hand-off link (staff sends)").

## Templates (`server/whatsapp.js`)

| Template | Text (summary) |
|---|---|
| `enquiry_received` | Your rental enquiry has been received. Reference: DF-XXXXXX. Our team will review your request. |
| `details_required` | We need a few more details to process your rental enquiry DF-XXXXXX: car, pickup city… |
| `quote_ready` | Your quote for DF-XXXXXX (car) is ready: ₹amount. Fuel and tolls extra. Confirmed only after document verification. |
| `status_update` | Your enquiry DF-XXXXXX status is now: … |

## Meta WhatsApp Cloud API adapter (provider `meta`): implemented, not verified live

When `WHATSAPP_PROVIDER=meta`, `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are set, DriveFlow calls
`POST https://graph.facebook.com/{version}/{phone_number_id}/messages` with a **template** message:

* sends only if the customer ticked the opt-in box (`whatsapp_opt_in`), otherwise records `failed: not opted in`;
* needs an approved template name per message (`WHATSAPP_TEMPLATE_*`), with body parameters {{1}} first name and {{2}} reference;
* retries up to 3 times on network errors, HTTP 429 and 5xx; does not retry other 4xx;
* records `sent` only when Meta returns a message id (this means *accepted by Meta*, not delivered);
* runs automatically for workflow notifications (enquiry received; details required) and on staff clicks.

Verified only with a **mocked** API in `tests/server/api.test.mjs` (template payload, retry on 503, opt-in refusal).

### Not implemented yet

Delivery/read receipts and inbound replies (webhook endpoint with signature verification), template management, and opt-out handling.
These are needed before automated messaging goes live.

## To go live (client decisions)

1. Aman approves using WhatsApp Business Platform and decides on the number (migrate +91 95813 78999 or use a new one).
2. Meta Business verification; phone number registered; per-conversation pricing accepted.
3. Templates submitted and approved (wording above, edited by Aman).
4. Credentials stored as server environment variables only (never `VITE_`).
5. Webhook built and tested; then switch `WHATSAPP_PROVIDER=meta`.
