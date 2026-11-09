import { Modal, CarImage } from './ui.jsx';
import Icon from './Icon.jsx';
import { inr } from '../lib/pricing.js';
import { CONFIG } from '../config.js';

export default function VehicleDetails({ vehicle, onClose, onSelect, onEnquire }) {
  const rows = [
    ['Category', `${vehicle.category} (standard model class)`],
    ['Seating', `${vehicle.seats} typical for this model*`],
    ['Transmission', vehicle.transmission || 'Not stated on website, please confirm'],
    ['Fuel', vehicle.fuel || 'Not stated on website, please confirm'],
    ['24 hrs · 400 km', inr(vehicle.rate24)],
    ['12 hrs · 200 km', vehicle.rate12 ? inr(vehicle.rate12) : 'Price not listed, please confirm'],
    ['Extra hour', vehicle.extraHour ? inr(vehicle.extraHour) : 'Not listed, please confirm'],
  ];
  return (
    <Modal title={vehicle.name} onClose={onClose} wide>
      <div className="details-grid">
        <CarImage vehicle={vehicle} className="details-img" sizes="(min-width: 760px) 420px, 92vw" eager />
        <div>
          <dl className="kv">
            {rows.map(([k, val]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt>{k}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
          <p className="small muted" style={{ marginTop: 12 }}>
            Rates as published by Aman Self Drive (checked {CONFIG.ratesCheckedOn}). Fuel and tolls are extra. *Seating and category are typical for
            the model; individual cars may differ. Availability for your dates is confirmed by the team on WhatsApp.
          </p>
        </div>
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        {onEnquire && (
          <button className="btn btn-wa grow" onClick={() => onEnquire(vehicle)}>
            <Icon name="whatsapp" size={18} /> Enquire on WhatsApp
          </button>
        )}
        <button className={`btn ${onEnquire ? 'btn-ghost' : 'btn-primary'} grow`} onClick={() => onSelect(vehicle)}>
          Plan dates &amp; get an estimate
        </button>
      </div>
    </Modal>
  );
}
