// FAQ content. `verified: true` means the statement is taken from amanselfdrivecars.com (checked 30 Oct 2026).
// Anything the website does not state is answered with the required fallback line, never invented.

export const CONFIRM_LINE = 'Please contact Aman Self Drive for confirmation.';

export const FAQ = [
  {
    q: 'How do I book a self-drive car?',
    verified: true,
    a: 'Choose a car and your dates in DriveFlow and submit a booking request. The Aman Self Drive team reviews it, confirms availability and the final price, and shares pickup details with you on WhatsApp. Nothing is booked until the team confirms.',
  },
  {
    q: 'What rental durations are available?',
    verified: true,
    a: 'Aman lists 12-hour (200 km) and 24-hour (400 km) rates, with a flat extra-hour charge of ₹400 on most cars. For multi-day, weekly or monthly needs, DriveFlow shows an indicative estimate only. ' + CONFIRM_LINE,
  },
  {
    q: 'How many kilometres are included?',
    verified: true,
    a: 'A 24-hour booking includes 400 km, and a 12-hour booking includes 200 km on cars that offer a 12-hour slot. Fuel and tolls are extra.',
  },
  {
    q: 'How do I contact the team?',
    verified: true,
    a: 'Call or WhatsApp +91 95813 78999. The office is at MG Road, Revenue Colony Park, Labbipet, Vijayawada. Team availability hours: ' + CONFIRM_LINE,
  },
  {
    q: 'How do I confirm that a car is available for my dates?',
    verified: true,
    a: 'DriveFlow does not show live availability. The team checks the fleet for your dates and replies on WhatsApp. Aman’s own website also asks customers to confirm availability on WhatsApp before booking.',
  },
  {
    q: 'How is the final rental quotation provided?',
    verified: true,
    a: 'The estimate in DriveFlow is indicative only. The final price and pickup details are shared by the Aman Self Drive team on WhatsApp after they review your request.',
  },
  {
    q: 'Can the car be delivered to me in Vijayawada?',
    verified: true,
    a: 'Aman’s website says cars in Vijayawada can be delivered to your home, hotel, the railway station or Gannavaram Airport, or collected from the MG Road office. Delivery charges and timing: ' + CONFIRM_LINE,
  },
  {
    q: 'What documents will I need?',
    verified: true,
    a: 'Aman’s website lists a valid driving licence at least 1 year old, a government photo ID (such as Aadhaar or passport), a live selfie for verification, and a refundable security deposit whose amount depends on the car. DriveFlow does not collect any of these — the team handles verification directly.',
  },
  {
    q: 'Are one-way trips possible?',
    verified: true,
    a: 'Aman’s website says one-way service between Vijayawada, Hyderabad and Vizag is available on request. Charges: ' + CONFIRM_LINE,
  },
  {
    q: 'What about the deposit amount, cancellation and minimum age?',
    verified: false,
    a: CONFIRM_LINE,
  },
];
