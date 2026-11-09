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

const IMG = 'https://amanselfdrivecars.com/assets/images/';
const img = (f) => IMG + encodeURI(f);

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
  image: img(image),
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

export const transmissionKind = (veh) => {
  const t = (veh.transmission || '').toLowerCase();
  return { automatic: t.includes('automatic') || t.includes('at'), manual: t.includes('mt') };
};
