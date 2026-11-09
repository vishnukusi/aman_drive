import { Modal, CarImage } from './ui.jsx';
import { inr } from '../lib/pricing.js';
import { CONFIG } from '../config.js';

export default function VehicleDetails({ vehicle, onClose, onSelect }) {
  const rows = [
    ['Category', `${vehicle.category} (standard model class)`],
    ['Seating', `${vehicle.seats} typical for this model*`],
    ['Transmission', vehicle.transmission || 'Not stated on website — please confirm'],
    ['Fuel', vehicle.fuel || 'Not stated on website — please confirm'],
    ['24 hrs · 400 km', inr(vehicle.rate24)],
    ['12 hrs · 200 km', vehicle.rate12 ? inr(vehicle.rate12) : 'Price not listed — please confirm'],
    ['Extra hour', vehicle.extraHour ? inr(vehicle.extraHour) : 'Not listed — please confirm'],
  ];
  return (
    <Modal title={vehicle.name} onClose={onClose}>
      <CarImage vehicle={vehicle} />
      <dl className="kv" style={{ marginTop: 14 }}>
        {rows.map(([k, val]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt>{k}</dt>
            <dd>{val}</dd>
          </div>
        ))}
      </dl>
      <p className="small muted" style={{ marginTop: 12 }}>
        Photo and rates from amanselfdrivecars.com (checked {CONFIG.ratesCheckedOn}). *Seating and category are generic for
        the model; actual fleet cars may differ. Fuel and tolls are extra. Availability for your dates is confirmed by the
        Aman Self Drive team — it is not shown here.
      </p>
      <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => onSelect(vehicle)}>
        Select This Car
      </button>
    </Modal>
  );
}
