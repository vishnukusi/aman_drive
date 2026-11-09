// FAQ content. Every answer is taken from amanselfdrivecars.com (home page FAQ and /faq page, read 9 Nov 2026).
//   source: 'home' | 'faq'   where on the official site the statement appears
//   confirm: true            the official site is inconsistent or silent on part of it, so the answer tells the customer to confirm
// Nothing here is invented. Where the site is silent the answer is the CONFIRM_LINE.

export const CONFIRM_LINE = 'Please contact Aman Self Drive for confirmation.';

export const FAQ = [
  {
    q: 'How do I book a self-drive car?',
    source: 'home',
    a: 'Choose your car and city, share your driving licence (at least 1 year old), a government ID and a live selfie, then get the final price and pickup details on WhatsApp. Collect or receive the car, inspect it with the team and drive. Nothing is booked until the team confirms on WhatsApp.',
  },
  {
    q: 'How much does it cost to rent a self drive car?',
    source: 'home',
    a: 'Rates start at ₹1,500 per 24 hours for the WagonR CNG and Tata Tigor. Swift, Baleno and i20 are ₹2,500, the Creta is ₹3,000, the Innova Crysta and Seltos are ₹4,500, the Thar is ₹5,000 and the Fortuner Automatic is ₹15,000. Fuel and tolls are extra.',
  },
  {
    q: 'How many kilometres are included?',
    source: 'home',
    a: 'A 24-hour booking includes 400 km and a 12-hour booking includes 200 km on the cars that offer a 12-hour slot. Most vehicles have an extra-hour charge of ₹400 beyond the booked slot.',
  },
  {
    q: 'Which cities do you operate in?',
    source: 'home',
    a: 'Vijayawada, Hyderabad and Vizag (Visakhapatnam). One-way service between these three cities is available on request; one-way charges are confirmed by the team.',
  },
  {
    q: 'Do you deliver cars to my location?',
    source: 'home',
    a: 'In Vijayawada the car can be delivered to your home, hotel, the railway station or Gannavaram Airport, or you can collect it from the MG Road office in Labbipet. Message the team for pickup options in Hyderabad and Vizag. Delivery charges and timing: ' + CONFIRM_LINE,
    confirm: true,
  },
  {
    q: 'What documents are needed?',
    source: 'home',
    a: 'A valid driving licence at least 1 year old, a government photo ID such as Aadhaar or passport, and a live selfie for verification. A refundable security deposit applies; the amount depends on the car. Please do not send documents through this website: the team verifies them directly.',
  },
  {
    q: 'How old do I need to be to rent a car?',
    source: 'faq',
    a: 'The official FAQ says you must be at least 24 years old, with a valid driving licence and Aadhaar card.',
  },
  {
    q: 'What happens if I return the car late?',
    source: 'faq',
    a: 'The official FAQ lists ₹400 per hour for regular cars and ₹600 per hour for 7-seaters. Some 7-seater listings show ₹400 per extra hour, so ' + CONFIRM_LINE.toLowerCase() + ' Please tell the team in advance if you expect a delay.',
    confirm: true,
  },
  {
    q: 'What is the cancellation policy?',
    source: 'faq',
    a: 'The official FAQ lists: 50% refund if cancelled at least 24 hours before pickup, 25% at least 6 hours before, 10% at least 2 hours before, and no refund less than 2 hours before pickup.',
  },
  {
    q: 'Are there any other charges?',
    source: 'faq',
    a: 'Depending on the booking and usage, the official FAQ mentions possible charges for insurance, fuel, excess mileage, late return and applicable taxes, and says the renter pays 60% of the damage estimate if the car is damaged. Check with the team while booking to avoid surprises.',
  },
  {
    q: 'Can I see live availability here?',
    source: 'home',
    a: 'No. Availability is not shown on this website. The official site asks you to confirm availability on WhatsApp before you book, and the team replies with availability and the final price.',
  },
];
