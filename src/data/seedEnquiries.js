// SIMULATED enquiries so the admin dashboard is not empty on first load.
// All people, numbers and trips are fictional. Mobile numbers use the reserved-looking 90000 00xxx pattern.
// Dates are generated relative to "today" so the demo always looks current.

import { durationHours, estimate, formatDuration } from '../lib/pricing.js';
import { VEHICLES } from './vehicles.js';

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const ago = (hours) => new Date(Date.now() - hours * 36e5).toISOString();

const defs = [
  { n: 1, name: 'Demo Customer A', mobile: '9000000011', car: 'creta', p: [2, '09:00'], r: [4, '09:00'], dest: 'Hyderabad', trip: 'outstation', status: 'New Enquiry', ago: 2, pm: 'office', rm: 'office' },
  { n: 2, name: 'Demo Customer B', mobile: '9000000022', car: 'swift', p: [1, '08:00'], r: [1, '20:00'], dest: 'Guntur', trip: 'city', status: 'New Enquiry', ago: 5, pm: 'railway', rm: 'railway' },
  { n: 3, name: 'Demo Customer C', mobile: '9000000033', car: 'innova', p: [5, '07:00'], r: [8, '07:00'], dest: 'Tirupati', trip: 'outstation', status: 'Under Review', ago: 20, pm: 'office', rm: 'office' },
  { n: 4, name: 'Demo Customer D', mobile: '9000000044', car: 'thar', p: [3, '06:00'], r: [5, '06:00'], dest: 'Araku Valley', trip: 'outstation', status: 'Quotation Sent', ago: 30, pm: 'home', rm: 'office', pd: 'Demo address, Benz Circle' },
  { n: 5, name: 'Demo Customer E', mobile: '9000000055', car: 'venue', p: [2, '10:00'], r: [3, '10:00'], dest: 'Amaravati', trip: 'city', status: 'Awaiting Customer Confirmation', ago: 44, pm: 'airport', rm: 'airport' },
  { n: 6, name: 'Demo Customer F', mobile: '9000000066', car: 'ertiga', p: [6, '09:00'], r: [9, '18:00'], dest: 'Srisailam', trip: 'outstation', status: 'Confirmed', ago: 70, pm: 'office', rm: 'office' },
  { n: 7, name: 'Demo Customer G', mobile: '9000000077', car: 'tigor', p: [-2, '09:00'], r: [-1, '09:00'], dest: 'Vijayawada city', trip: 'city', status: 'Cancelled', ago: 120, pm: 'office', rm: 'office' },
];

const historyFor = (status, createdAt) => {
  const h = [{ at: createdAt, by: 'customer', label: 'Enquiry submitted through DriveFlow' }];
  const order = ['Under Review', 'Quotation Sent', 'Awaiting Customer Confirmation', 'Confirmed'];
  if (status === 'Cancelled') {
    h.push({ at: createdAt, by: 'staff', label: 'Status changed to Cancelled' });
    return h;
  }
  const idx = order.indexOf(status);
  for (let i = 0; i <= idx; i++) h.push({ at: createdAt, by: 'staff', label: `Status changed to ${order[i]}` });
  return h;
};

export function buildSeedEnquiries() {
  return defs.map((d) => {
    const vehicle = VEHICLES.find((x) => x.id === d.car);
    const pickup = { date: isoDate(plusDays(d.p[0])), time: d.p[1] };
    const ret = { date: isoDate(plusDays(d.r[0])), time: d.r[1] };
    const hours = durationHours(pickup.date, pickup.time, ret.date, ret.time);
    const est = estimate(vehicle, hours);
    const createdAt = ago(d.ago);
    return {
      id: `DF-${String(992 + d.n).padStart(4, '0')}`, // DF-0993 … DF-0999 (simulated)
      simulated: true,
      createdAt,
      customer: { name: d.name, mobile: d.mobile, email: '' },
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      pickup,
      ret,
      hours,
      durationLabel: formatDuration(hours),
      pickupMode: d.pm,
      pickupDetail: d.pd || '',
      returnMode: d.rm,
      returnDetail: '',
      tripType: d.trip,
      destination: d.dest,
      notes: '',
      estimate: est,
      status: d.status,
      adminNotes: '',
      history: historyFor(d.status, createdAt),
    };
  });
}
