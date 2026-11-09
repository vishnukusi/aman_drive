// Vehicle catalogue.
//
// VERIFIED from https://amanselfdrivecars.com/ on 30 Oct 2026: car names, images, 24-hr (400 km) rates,
// 12-hr (200 km) rates where a price is printed, the Rs 400 extra-hour charge where listed, and the
// transmission / fuel wording that appears in the car's name (e.g. "AT & MT", "Automatic", "CNG", "Diesel").
//
// NOT on the website, so supplied generically:
//   - `category` and `seats` are the standard class / typical seating of the model. Fleet variants may differ.
//   - Transmission / fuel are left null when the site does not say.
// Admins can edit all of it in the dashboard. Nothing here implies live availability.
// Re-checked car by car against the live site on 9 Nov 2026: no price or name changes.
//
// Images: `sourceImage` is the file name on amanselfdrivecars.com/assets/images. `scripts/fetch-images.mjs` downloads it and
// writes resized WebP copies to public/images/fleet/<id>-480.webp and -960.webp (hot-linking failed for the .avif files).

const v = (id, name, category, seats, transmission, fuel, rate24, rate12, extraHour, image) => ({
  id,
  name,
  category, // Hatchback | Sedan | SUV | MPV
  seats, // typical for the model
  transmission, // 'AT & MT' | 'Automatic' | null (not stated)
  fuel, // 'CNG' | 'Diesel' | null (not stated)
  rate24,
  rate12, // null = no 12-hr price printed
  extraHour, // null = not listed on the car card
  image: `images/fleet/${id}-480.webp`,
  imageLarge: `images/fleet/${id}-960.webp`,
  sourceImage: image,
  visible: true,
  source: 'amanselfdrivecars.com',
  verified: true,
});

export const VEHICLES = [
  v('swift', 'Maruti Swift', 'Hatchback', 5, 'AT & MT', null, 2500, null, 400, 'car_swift.jpg'),
  v('dzire', 'Maruti Swift Dzire', 'Sedan', 5, 'AT & MT', null, 2500, null, 400, 'car_swift_dzire.jpg'),
  v('i20', 'Hyundai i20', 'Hatchback', 5, 'AT & MT', null, 2500, null, 400, 'car_i20.jpg'),
  v('baleno', 'Suzuki Baleno', 'Hatchback', 5, 'AT & MT', null, 2500, null, 400, 'car_suzuki _baleno.jpg'),
  v('glanza', 'Toyota Glanza', 'Hatchback', 5, null, null, 2500, 1500, null, 'Toyota Glanza.avif'),
  v('exter', 'Hyundai Exter CNG', 'SUV', 5, null, 'CNG', 2500, 1500, 400, 'Hyundai Exter CNG.avif'),
  v('punch', 'Tata Punch Automatic', 'SUV', 5, 'Automatic', null, 2500, 1500, null, 'Tata Punch Automatic.jpeg'),
  v('wagonr', 'Maruti Wagon R CNG', 'Hatchback', 5, null, 'CNG', 1500, null, null, 'Wagon R CNG.avif'),
  v('tigor', 'Tata Tigor', 'Sedan', 5, null, null, 1500, null, null, 'Tata Tigor.avif'),
  v('grandi10', 'Hyundai Grand i10', 'Hatchback', 5, null, null, 1800, null, null, 'Grand i10.avif'),
  v('creta', 'Hyundai Creta', 'SUV', 5, null, null, 3000, 2000, 400, 'Creta.jpeg'),
  v('venue', 'Hyundai Venue Automatic', 'SUV', 5, 'Automatic', null, 3500, 2000, null, 'Hyundai Venue Automatic.avif'),
  v('brezza', 'Maruti Brezza CNG', 'SUV', 5, null, 'CNG', 3000, null, 400, 'car_suzuki_brezza.jpg'),
  v('grandvitara', 'Maruti Grand Vitara Automatic', 'SUV', 5, 'Automatic', null, 3500, 2500, null, 'Maruti Suzuki Grand Vitara Automatic.avif'),
  v('ertiga', 'Maruti Ertiga CNG', 'MPV', 7, null, 'CNG', 3500, null, 400, 'car_suzuki_ertiga.jpg'),
  v('marazzo', 'Mahindra Marazzo', 'MPV', 7, null, null, 3500, null, 400, 'car_marazzo.jpg'),
  v('carens', 'Kia Carens', 'MPV', 7, null, null, 3500, null, 400, 'car_kia_carens.jpg'),
  v('xuv500', 'Mahindra XUV 500', 'SUV', 7, null, null, 4500, null, 400, 'car_xuv500.jpg'),
  v('innova', 'Toyota Innova Crysta', 'MPV', 7, null, null, 4500, null, 400, 'car_innova_crysta.jpg'),
  v('seltos', 'Kia Seltos', 'SUV', 5, null, null, 4500, null, 400, 'car_kia_seltos.jpg'),
  v('thar', 'Mahindra Thar 4×4 Diesel Topend', 'SUV', 4, null, 'Diesel', 5000, 3000, 400, 'Thar 4x4.jpeg'),
  v('fortuner', 'Toyota Fortuner Automatic', 'SUV', 7, 'Automatic', null, 15000, null, null, 'Toyota Fortuner Automatic.avif'),
];

export const CATEGORIES = ['Hatchback', 'Sedan', 'SUV', 'MPV'];

export const CATEGORY_LABELS = { Hatchback: 'Hatchbacks', Sedan: 'Sedans', SUV: 'SUVs', MPV: 'MPV / 7-seaters' };

// Collections are cross-cutting groupings asked for in the brief. They are derived by rule from published data,
// never hand-picked, so they stay correct when staff edit a car. The thresholds need client approval (audit D6).
export const PREMIUM_MIN_RATE = 4500;
export const COLLECTIONS = [
  { id: 'premium', label: 'Premium', blurb: `Published 24-hr rate of ₹${PREMIUM_MIN_RATE.toLocaleString('en-IN')} or more`, test: (v) => v.rate24 >= PREMIUM_MIN_RATE },
  { id: 'family', label: 'Family (7 seats)', blurb: 'Seven seats typical for the model', test: (v) => v.seats >= 7 },
];

export const inCollection = (veh, id) => !!COLLECTIONS.find((c) => c.id === id)?.test(veh);

export const transmissionKind = (veh) => {
  // Only what the website states: "AT & MT", "Automatic". Word boundaries so e.g. "Manual" or "CNG" never match "at".
  const t = (veh.transmission || '').toLowerCase();
  return { automatic: /\b(at|automatic)\b/.test(t), manual: /\b(mt|manual)\b/.test(t) };
};
