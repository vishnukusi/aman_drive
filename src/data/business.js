// Business content shown on the customer site.
// EVERY item below is copied from https://amanselfdrivecars.com/ (home, /about, /contact, city pages), read 9 Nov 2026.
// Nothing is paraphrased into a new claim. If the client changes their site, update this file (and docs/verified-info.md).

export const CITIES = [
  {
    id: 'vijayawada',
    name: 'Vijayawada',
    state: 'Andhra Pradesh',
    tagline: 'Our home city. Doorstep delivery and MG Road self-collect.',
    address: 'MG Rd, Revenue Colony Park, Sidhartha Nagar, Labbipet, Vijayawada, Andhra Pradesh 520010',
    mapsUrl: 'https://maps.app.goo.gl/fo599o2rQY3Srcfw7',
    officialPage: 'https://amanselfdrivecars.com/self_drive_cars_in_vijayawada',
    image: 'images/places/vijayawada',
    imageAlt: 'Prakasam Barrage across the Krishna river in Vijayawada',
    points: [
      'Office on MG Road, Revenue Colony Park, Labbipet',
      'Delivery to your home, hotel, the railway station or Gannavaram Airport',
      'Or collect the car yourself from the MG Road office',
      'Used across the city and for trips to Guntur, Amaravati and the coast',
    ],
    // Handover options the website lists for this city (keys match MODE_LABELS in lib/whatsapp.js).
    handover: ['office', 'home', 'hotel', 'railway', 'airport'],
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    tagline: 'KPHB, Kukatpally location and one-way trips to Vijayawada.',
    address: 'Sri Sai Krishna Nivas, HIG 358, KPHB Phase 6, Kukatpally, Hyderabad, Telangana 500085',
    mapsUrl: 'https://maps.app.goo.gl/T7Pmeri2mrRmprpV9',
    officialPage: 'https://amanselfdrivecars.com/self_drive_cars_in_hyderabad',
    image: 'images/places/hyderabad',
    imageAlt: 'Charminar in Hyderabad at dusk with traffic light trails',
    points: [
      'Base in KPHB Phase 6, Kukatpally',
      'Convenient for KPHB, Kukatpally, Miyapur and nearby areas',
      'Monthly and long-stay rentals are quoted separately',
      'One-way trips to Vijayawada on request',
    ],
    handover: ['office', 'discuss'],
  },
  {
    id: 'vizag',
    name: 'Vizag',
    state: 'Andhra Pradesh',
    tagline: 'Beach drives, Araku Valley trips and coastal Andhra.',
    address: '29-13-29/1, Prakasaraopeta, Nehru Nagar, Ram Nagar, Visakhapatnam 530020',
    mapsUrl: 'https://maps.app.goo.gl/y6BJP6R7YBMYPrha9',
    officialPage: 'https://amanselfdrivecars.com/self_drive_cars_in_vizag',
    image: 'images/places/vizag',
    imageAlt: 'Beach Road in Visakhapatnam with the submarine museum by the sea',
    points: [
      'Office in Ram Nagar, Visakhapatnam',
      'Beach drives, Araku Valley trips and coastal Andhra',
      'One-way trips to Vijayawada and Hyderabad on request',
      'Message the team for pickup options',
    ],
    handover: ['office', 'discuss'],
  },
];

export const cityById = (id) => CITIES.find((c) => c.id === id) || null;

// Published on the official home page by the business itself. Shown with that attribution.
export const STATS = [
  { value: 8, suffix: '', label: 'Years of experience' },
  { value: 2, suffix: '', label: 'States' },
  { value: 10, suffix: '', label: 'Locations' },
  { value: 1000, suffix: '+', label: 'Happy customers' },
];

export const WHY = [
  { icon: 'route', title: 'One-way travel', text: 'One-way service between Vijayawada, Hyderabad and Vizag on request.' },
  { icon: 'sparkle', title: 'Sanitized cars', text: 'Clean, neat, well-maintained cars for a safe trip.' },
  { icon: 'tag', title: 'Transparent pricing', text: 'What you see is what you pay. Only fuel and tolls are extra.' },
  { icon: 'shield', title: 'Safe & convenient', text: 'Comfortable self-drive experience tailored to your trip.' },
  { icon: 'headset', title: 'Real support', text: 'Call or WhatsApp our team for booking and on-trip help.' },
  { icon: 'check', title: 'Simple verification', text: 'Licence, ID and a live selfie. No long paperwork.' },
];

// Google reviews exactly as displayed on amanselfdrivecars.com (name and text unchanged, 5 stars as shown there).
export const REVIEWS = [
  { name: 'Srinivas Kamal', stars: 5, text: 'Hassle free verification, recent and well maintained vehicles, affordable price. Well mannered and customer friendly behaviour.' },
  { name: 'Vamshi Nimmagadda', stars: 5, text: 'Rented a Tata Punch for 2 days on my recent visit to Vijayawada. The car was clean and well-maintained, and pickup and drop-off were arranged by them to my place, quick and hassle-free.' },
  { name: 'Rajasekharrao Y', stars: 5, text: 'Good and affordable car rental service in Vijayawada. Had good experience and Mr Keerthi Kumar is very prompt in responding. They have good vehicles of all types.' },
  { name: 'Kranthi Kumar Duggirala', stars: 5, text: 'Hassle-free and reliable car rental experience. Their vehicles are well-maintained, the booking process is smooth, and customer service is responsive.' },
];

export const ABOUT = {
  mission:
    'At Aman Self Drive Car Rentals, our mission is to make travel simple, reliable and flexible. We empower travelers with affordable, hassle-free rentals and the freedom to explore on their own terms.',
  fleet:
    'From budget hatchbacks to premium SUVs, our sanitized, well-maintained fleet suits every trip, be it a weekend getaway, family holiday, business travel or long road adventure.',
  values: ['Quality', 'Customer Service', 'Trust', 'Safety', 'Integrity', 'Teamwork & Professionalism'],
};

export const DOCUMENTS = [
  'A valid driving licence at least 1 year old',
  'A government photo ID such as Aadhaar or passport',
  'A live selfie for verification',
  'A refundable security deposit, the amount depending on the car',
];
