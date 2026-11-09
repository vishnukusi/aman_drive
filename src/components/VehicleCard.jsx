import { CarImage } from './ui.jsx';
import { inr } from '../lib/pricing.js';

export function specChips(v) {
  const chips = [v.category, `${v.seats} seats*`];
  if (v.transmission) chips.push(v.transmission);
  if (v.fuel) chips.push(v.fuel);
  return chips;
}

export default function VehicleCard({ vehicle, selected, onDetails, onSelect }) {
  return (
    <article className={`vcard${selected ? ' selected' : ''}`}>
      <CarImage vehicle={vehicle} />
      <div className="vbody">
        <div className="vname">{vehicle.name}</div>
        <div className="chips">
          {specChips(vehicle).map((c) => (
            <span key={c} className="chip">{c}</span>
          ))}
        </div>
        <div className="price">
          {inr(vehicle.rate24)} <small>/ 24 hrs · 400 km</small>
        </div>
        <div className="vactions">
          <button className="btn btn-ghost btn-sm" onClick={() => onDetails(vehicle)}>View Details</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSelect(vehicle)}>
            {selected ? 'Selected ✓' : 'Select This Car'}
          </button>
        </div>
      </div>
    </article>
  );
}
