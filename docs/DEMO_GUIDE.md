# Demo guide for the Aman Self Drive owner meeting
*Concept demonstration by ComputeX. About 8–10 minutes.*

## Before you go
- [ ] `npm run build && npm run preview` (or host the `dist/` folder), open on **a phone** and a **laptop**. Enquiries are stored per browser, so do the whole demo on one device (use a second tab for the dashboard).
- [ ] Open amanselfdrivecars.com once and confirm the WhatsApp number and prices still match.
- [ ] In the dashboard click **Reset demo data** for a clean start. Have WhatsApp installed on the phone.
- [ ] Use a made-up name and number (e.g. "Test Rahul", 98765 43210).

## Opening (30 sec)
"I noticed customers already book with you on WhatsApp. This is a concept showing how the details could arrive complete and organised, while WhatsApp stays exactly as it is. It isn't connected to your systems, and I'd like your view on whether it would help."

## The journey
1. **Open the customer website.** Point out your name, the cars and the ComputeX banner stating it is a concept.
2. **Browse vehicles.** Tap *Explore Our Cars*; use the SUV and Automatic filters. "These are your cars and your published prices."
3. **Select a vehicle.** Open *View Details* on the Creta, then *Select This Car*.
4. **Enter pickup and return details.** Choose dates 3 to 5 days ahead and show the duration and estimate updating. Try a return date before pickup to show it is blocked. Choose hotel delivery as the pickup. "Whether delivery is possible is your call; you can switch these options off."
5. **Enter destination.** Outstation, Hyderabad, add a note.
6. **Submit a rental enquiry.** Enter the test contact details; show the review page, then *Submit Booking Request*. Read out: "The team will review your requirements and confirm availability and final pricing." Stress that it is **not a confirmed rental**.
7. **Show the WhatsApp enquiry message.** Scroll to the green preview, tap *Continue on WhatsApp* and show the prefilled message in the app. Do **not** press Send to your real number unless the owner agrees. "That's a normal WhatsApp link. No API, no automatic replies."
8. **Open the admin dashboard.** Footer → *Staff dashboard (demo)*, `admin` / `driveflow`. Show the overview cards. "Rows marked Simulated are made up."
9. **Locate the submitted enquiry.** *Enquiries*, search the enquiry ID; open it.
10. **Update its status.** *Mark as Under Review* → *Quotation Sent* → *Mark Confirmed* (green confirmation banner), add a note, and show the history. Tap *Open WhatsApp Conversation* to show the reply message to the customer. Then switch to *Track Enquiry* on the customer side (ID plus last 4 digits) to show the customer view.
11. **Explain how this could connect to the real workflow.** Open **Production roadmap** and walk the three phases (below).

## Talking points for step 11
- Today: the owner/team would keep using WhatsApp; DriveFlow only structures what arrives.
- To make it real they would need to provide: their true fleet and pricing rules, a decision about availability (who updates it), a hosted database and staff logins, and an approved WhatsApp Business account if they want automatic notifications.
- We would not touch their systems or number without their permission.

## Questions to ask them
1. How many enquiries a day come on WhatsApp, and what details are usually missing at first?
2. How do you track availability today (sheet, notebook, memory)?
3. Are home/hotel/airport deliveries always available, and charged how?
4. How do you price part-days, multi-day and overruns?
5. Who replies after 9 PM, and would you want alerts?

## Be ready for
- **"Does it know which cars are free?"** No. Availability is yours to confirm. Making it live needs your booking records.
- **"Does it send messages by itself?"** No. The customer taps a WhatsApp link and sends the message.
- **"Are these prices final?"** They are your published rates; the estimate is indicative and you confirm the final quote.
- **"Is customer data safe?"** The demo stores nothing on a server and collects no ID documents. A real version would need proper security and a privacy policy.
- **"Do you own the photos?"** They are loaded from your site; a real version would use images you approve.

## After the meeting
Note what they liked, which fields they'd change, and which Phase 2 items they would be willing to share. Do not promise dates or pricing in the meeting.
