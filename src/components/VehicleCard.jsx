import { CarImage } from './ui.jsx';
import Icon from './Icon.jsx';
import { inr } from '../lib/pricing.js';
import { inCollection } from '../data/vehicles.js';
import { useTilt } from '../lib/motion.js';

export function specChips(v) {
  const chips = [v.category, `${v.seats} seats*`];
  if (v.transmission) chips.push(v.transmission);
  if (v.fuel) chips.push(v.fuel);
  return chips;
}

/** Kilometre / duration allowances exactly as the official site lists them. */
export function allowances(v) {
  const rows = [{ label: '24 hrs · 400 km', value: inr(v.rate24) }];
  if (v.rate12) rows.push({ label: '12 hrs · 200 km', value: inr(v.rate12) });
  if (v.extraHour) rows.push({ label: 'Extra hour', value: inr(v.extraHour) });
  return rows;
}

/**
 * Fleet card. Primary action = one-tap enquiry sheet (WhatsApp); secondary = details; tertiary = full booking planner.
 * `onEnquire` opens the sheet; `onPlan` goes to the booking wizard with the car preselected.
 */
export default function VehicleCard({ vehicle, selected, onDetails, onSelect, onEnquire }) {
  const tilt = useTilt({ max: 5 });
  const premium = inCollection(vehicle, 'premium');
  const family = inCollection(vehicle, 'family');
  return (
    <article ref={tilt} className={`vcard tilt${selected ? ' selected' : ''}`}>
      <div className="vcard-media">
        <CarImage vehicle={vehicle} />
        <div className="vflags">
          {premium && <span className="vflag premium">Premium</span>}
          {family && <span className="vflag family">Family</span>}
        </div>
        <span className="tilt-glare" aria-hidden />
      </div>
      <div className="vbody">
        <h3 className="vname">{vehicle.name}</h3>
        <ul className="vspecs" aria-label="Specifications">
          <li><Icon name="seat" size={15} />{vehicle.seats} seats*</li>
          <li><Icon name="gear" size={15} />{vehicle.transmission || 'Ask team'}</li>
          {vehicle.fuel && <li><Icon name="fuel" size={15} />{vehicle.fuel}</li>}
          <li className="cat-pill">{vehicle.category}</li>
        </ul>
        <div className="vprice">
          <div>
            <span className="amt">{inr(vehicle.rate24)}</span>
            <span className="per">/ 24 hrs</span>
          </div>
          <span className="km"><Icon name="road" size={14} />400 km incl.</span>
        </div>
        <div className="vmeta">
          {vehicle.rate12 ? <span>12 hrs · 200 km: <b>{inr(vehicle.rate12)}</b></span> : <span>24-hr slot</span>}
          {vehicle.extraHour ? <span>Extra hr <b>{inr(vehicle.extraHour)}</b></span> : null}
        </div>
        <div className="vactions">
          {onEnquire && (
            <button className="btn btn-wa btn-sm grow" onClick={() => onEnquire(vehicle)}>
              <Icon name="whatsapp" size={16} /> Enquire now
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => onDetails(vehicle)} aria-label={`Details for ${vehicle.name}`}>
            Details
          </button>
          {onSelect && !onEnquire && (
            <button className="btn btn-primary btn-sm grow" onClick={() => onSelect(vehicle)}>
              {selected ? 'Selected ✓' : 'Select This Car'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
