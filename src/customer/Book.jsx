import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore, addEnquiry } from '../store.js';
import { CONFIG } from '../config.js';
import { CATEGORIES } from '../data/vehicles.js';
import { Field, EstimateBox, CarImage } from '../components/ui.jsx';
import { specChips } from '../components/VehicleCard.jsx';
import { durationHours, estimate, formatDuration, inr } from '../lib/pricing.js';
import { normalizeMobile, todayISO, validateStep } from '../lib/validation.js';
import { CITY_NAMES, fmtWhen, locationText, modeLabel } from '../lib/whatsapp.js';
import { CITIES, cityById } from '../data/business.js';
import { usePageMeta } from '../lib/meta.js';

const STEPS = [
  { key: 'car', title: 'Pick your car', say: 'Which car would you like?', sub: 'Tap one to select it. You can change it later.' },
  { key: 'dates', title: 'Dates & times', say: 'When do you need it?', sub: 'I will work out the duration for you.' },
  { key: 'places', title: 'City, pickup & return', say: 'Which city, and where should the handover happen?', sub: 'The team confirms feasibility and any delivery charges.' },
  { key: 'trip', title: 'Your trip', say: 'Where are you headed?', sub: 'This helps the team suggest the right slot and plan.' },
  { key: 'you', title: 'About you', say: 'How can the team reach you?', sub: 'Only the basics. Please do not share ID documents here.' },
  { key: 'review', title: 'Review & send', say: 'Everything look right?', sub: 'Nothing reaches the business until you press Send in WhatsApp.' },
];

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00`);
  d.setDate(d.getDate() + n);
  return todayISO(d);
};

/** Handover options for a city, as listed on the official website, honouring VITE_DELIVERY_ENABLED. */
function modesFor(cityId) {
  const city = cityById(cityId) || cityById('vijayawada');
  const keys = CONFIG.deliveryEnabled ? city.handover : city.handover.filter((k) => k === 'office' || k === 'discuss');
  return keys.map((k) => [k, modeLabel(k, city.id)]);
}

export default function Book() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { vehicles } = useStore();
  const catalogue = vehicles.filter((v) => v.visible);
  const today = todayISO();

  usePageMeta('Plan your trip | Aman Self Drive Car Rentals', 'Choose a car, dates, city and pickup, see an indicative estimate and send a complete enquiry to Aman Self Drive on WhatsApp.');
  const preselected = catalogue.find((v) => v.id === params.get('car'));
  const presetCity = cityById(params.get('city'))?.id || 'vijayawada';
  const [step, setStep] = useState(preselected ? 1 : 0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [f, setF] = useState({
    vehicleId: preselected?.id || '',
    pickupDate: addDays(today, 1),
    pickupTime: '09:00',
    returnDate: addDays(today, 2),
    returnTime: '09:00',
    city: presetCity,
    pickupMode: 'office',
    pickupDetail: '',
    returnMode: 'office',
    returnDetail: '',
    tripType: 'city',
    destination: '',
    notes: '',
    name: '',
    mobile: '',
    email: '',
  });

  const vehicle = vehicles.find((v) => v.id === f.vehicleId) || null;
  const hours = durationHours(f.pickupDate, f.pickupTime, f.returnDate, f.returnTime);
  const durationOk = hours != null && hours > 0;
  const est = useMemo(() => (vehicle && durationOk ? estimate(vehicle, hours) : null), [vehicle, hours, durationOk]);

  const set = (patch) => {
    setF((p) => {
      const next = { ...p, ...patch };
      // Keep the return date from sitting before the pickup date.
      if (patch.pickupDate && next.returnDate && next.returnDate < patch.pickupDate) next.returnDate = patch.pickupDate;
      // Changing city resets handover options that the new city does not offer.
      if (patch.city) {
        const allowed = modesFor(patch.city).map(([k]) => k);
        if (!allowed.includes(next.pickupMode)) { next.pickupMode = 'office'; next.pickupDetail = ''; }
        if (!allowed.includes(next.returnMode)) { next.returnMode = 'office'; next.returnDetail = ''; }
      }
      return next;
    });
    setErrors((e) => {
      const copy = { ...e };
      Object.keys(patch).forEach((k) => delete copy[k]);
      return copy;
    });
  };

  const go = (dir) => {
    if (dir > 0) {
      const e = validateStep(step, f);
      if (Object.keys(e).length) {
        setErrors(e);
        return;
      }
    }
    setErrors({});
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + dir)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    // Re-validate everything, jump back to the first broken step.
    for (let i = 0; i < 5; i++) {
      const e = validateStep(i, f);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(i);
        return;
      }
    }
    if (!vehicle) return setStep(0);
    setSubmitError('');
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 300)); // brief, visible "preparing" state
    try {
      const enq = addEnquiry({
        customer: { name: f.name.trim(), mobile: normalizeMobile(f.mobile), email: f.email.trim() },
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        pickup: { date: f.pickupDate, time: f.pickupTime },
        ret: { date: f.returnDate, time: f.returnTime },
        hours,
        durationLabel: formatDuration(hours),
        pickupMode: f.pickupMode,
        pickupDetail: f.pickupDetail.trim(),
        returnMode: f.returnMode,
        returnDetail: f.returnDetail.trim(),
        tripType: f.tripType,
        city: f.city,
        destination: f.destination.trim(),
        notes: f.notes.trim(),
        estimate: est,
      });
      nav(`/enquiry/${enq.id}`, { state: { fresh: true } });
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const modes = modesFor(f.city);
  const shownCars = catalogue.filter((v) => catFilter === 'all' || v.category === catFilter);
  const cur = STEPS[step];

  return (
    <div className="container">
      <div className="book-wrap">
        <div>
          <div className="progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => <i key={s.key} className={i <= step ? 'done' : ''} />)}
          </div>
          <div className="small muted" style={{ marginBottom: 8 }}>Step {step + 1} of {STEPS.length} · {cur.title}</div>

          <div className="assistant">
            <div className="avatar" aria-hidden>D</div>
            <div className="bubble">{cur.say}<small>{cur.sub}</small></div>
          </div>

          <div className="card">
            {/* ---------- Step 1: vehicle ---------- */}
            {step === 0 && (
              <div className="stack">
                <div className="filter-row">
                  {['all', ...CATEGORIES].map((c) => (
                    <button key={c} type="button" className="pill" aria-pressed={catFilter === c} onClick={() => setCatFilter(c)}>
                      {c === 'all' ? 'All' : c === 'MPV' ? 'MPV / 7-seater' : c}
                    </button>
                  ))}
                </div>
                <div className="pick-list" role="list">
                  {shownCars.map((v) => (
                    <button key={v.id} type="button" className="pick" role="listitem" aria-pressed={f.vehicleId === v.id} onClick={() => set({ vehicleId: v.id })}>
                      <span className="thumb"><CarImage vehicle={v} /></span>
                      <span className="grow">
                        <strong>{v.name}</strong>
                        <span className="chips" style={{ marginTop: 4 }}>
                          {specChips(v).slice(0, 3).map((c) => <span key={c} className="chip">{c}</span>)}
                        </span>
                      </span>
                      <span className="price" style={{ whiteSpace: 'nowrap' }}>{inr(v.rate24)}<small><br />/ 24 hrs</small></span>
                    </button>
                  ))}
                  {!shownCars.length && <div className="empty">No cars in this category.</div>}
                </div>
                {errors.vehicleId && <span className="error" role="alert">{errors.vehicleId}</span>}
                <p className="hint">*Seating is typical for the model. Availability for your dates is confirmed by the team.</p>
              </div>
            )}

            {/* ---------- Step 2: dates ---------- */}
            {step === 1 && (
              <div className="stack">
                <div className="form-grid two">
                  <Field label="Pickup date" error={errors.pickupDate} htmlFor="pd">
                    <input id="pd" type="date" min={today} value={f.pickupDate} className={errors.pickupDate ? 'invalid' : ''} onChange={(e) => set({ pickupDate: e.target.value })} />
                  </Field>
                  <Field label="Pickup time" error={errors.pickupTime} htmlFor="pt">
                    <input id="pt" type="time" value={f.pickupTime} className={errors.pickupTime ? 'invalid' : ''} onChange={(e) => set({ pickupTime: e.target.value })} />
                  </Field>
                  <Field label="Return date" error={errors.returnDate} htmlFor="rd">
                    <input id="rd" type="date" min={f.pickupDate || today} value={f.returnDate} className={errors.returnDate ? 'invalid' : ''} onChange={(e) => set({ returnDate: e.target.value })} />
                  </Field>
                  <Field label="Return time" error={errors.returnTime} htmlFor="rt">
                    <input id="rt" type="time" value={f.returnTime} className={errors.returnTime ? 'invalid' : ''} onChange={(e) => set({ returnTime: e.target.value })} />
                  </Field>
                </div>
                <div className={`notice ${durationOk ? 'ok' : 'warn'}`} aria-live="polite">
                  {durationOk ? <>Requested duration: <strong>{formatDuration(hours)}</strong></> : 'Return must be after pickup.'}
                </div>
                <p className="hint">Rates are published for 12-hour and 24-hour slots; longer or odd-hour rentals are priced by the team.</p>
              </div>
            )}

            {/* ---------- Step 3: places ---------- */}
            {step === 2 && (
              <div className="stack">
                <div className="field">
                  <span className="label" id="city-label">Pickup city</span>
                  <div className="seg three" role="group" aria-labelledby="city-label">
                    {CITIES.map((c) => (
                      <button key={c.id} type="button" aria-pressed={f.city === c.id} onClick={() => set({ city: c.id })}>{c.name}</button>
                    ))}
                  </div>
                  {errors.city && <span className="error" role="alert">{errors.city}</span>}
                </div>
                <div className="form-grid">
                  <Field label="Pickup" htmlFor="pm">
                    <select id="pm" value={f.pickupMode} onChange={(e) => set({ pickupMode: e.target.value })}>
                      {modes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </Field>
                  {(f.pickupMode === 'home' || f.pickupMode === 'hotel') && (
                    <Field label="Pickup address or landmark" error={errors.pickupDetail} htmlFor="pdt">
                      <input id="pdt" value={f.pickupDetail} className={errors.pickupDetail ? 'invalid' : ''} onChange={(e) => set({ pickupDetail: e.target.value })} placeholder={`e.g. hotel name or area in ${CITY_NAMES[f.city]}`} />
                    </Field>
                  )}
                  <Field label="Return" htmlFor="rm">
                    <select id="rm" value={f.returnMode} onChange={(e) => set({ returnMode: e.target.value })}>
                      {modes.map(([k, l]) => <option key={k} value={k}>{l.replace('Delivery to my', 'Collect from my')}</option>)}
                    </select>
                  </Field>
                  {(f.returnMode === 'home' || f.returnMode === 'hotel') && (
                    <Field label="Return address or landmark" error={errors.returnDetail} htmlFor="rdt">
                      <input id="rdt" value={f.returnDetail} className={errors.returnDetail ? 'invalid' : ''} onChange={(e) => set({ returnDetail: e.target.value })} placeholder={`e.g. hotel name or area in ${CITY_NAMES[f.city]}`} />
                    </Field>
                  )}
                </div>
                <div className="notice">
                  {f.city === 'vijayawada'
                    ? 'Aman’s website lists home, hotel, railway station and Gannavaram Airport delivery in Vijayawada, or collection from the MG Road office.'
                    : `For ${CITY_NAMES[f.city]}, Aman’s website lists the office address and asks you to message the team for other pickup options.`}{' '}
                  Delivery charges and timing: please contact Aman Self Drive for confirmation.
                </div>
              </div>
            )}

            {/* ---------- Step 4: trip ---------- */}
            {step === 3 && (
              <div className="stack">
                <div className="field">
                  <span className="label">Trip type</span>
                  <div className="seg">
                    <button type="button" aria-pressed={f.tripType === 'city'} onClick={() => set({ tripType: 'city' })}>Within the city</button>
                    <button type="button" aria-pressed={f.tripType === 'outstation'} onClick={() => set({ tripType: 'outstation' })}>Outstation</button>
                  </div>
                </div>
                <Field label="Where are you planning to travel?" error={errors.destination} htmlFor="dest">
                  <input id="dest" value={f.destination} className={errors.destination ? 'invalid' : ''} onChange={(e) => set({ destination: e.target.value })} placeholder={f.tripType === 'city' ? 'e.g. Benz Circle, Gannavaram, Guntur' : 'e.g. Hyderabad, Tirupati, Vizag'} />
                </Field>
                <Field label="Anything else the team should know? (optional)" htmlFor="notes">
                  <textarea id="notes" value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. travelling with family and luggage, need an automatic" />
                </Field>
              </div>
            )}

            {/* ---------- Step 5: customer ---------- */}
            {step === 4 && (
              <div className="stack">
                <div className="form-grid">
                  <Field label="Full name" error={errors.name} htmlFor="nm">
                    <input id="nm" autoComplete="name" value={f.name} className={errors.name ? 'invalid' : ''} onChange={(e) => set({ name: e.target.value })} />
                  </Field>
                  <Field label="Mobile number" error={errors.mobile} hint="10-digit Indian mobile number" htmlFor="mb">
                    <input id="mb" inputMode="tel" autoComplete="tel" value={f.mobile} className={errors.mobile ? 'invalid' : ''} onChange={(e) => set({ mobile: e.target.value })} placeholder="98765 43210" />
                  </Field>
                  <Field label="Email (optional)" error={errors.email} htmlFor="em">
                    <input id="em" type="email" autoComplete="email" value={f.email} className={errors.email ? 'invalid' : ''} onChange={(e) => set({ email: e.target.value })} />
                  </Field>
                </div>
                <div className="notice warn">
                  Please do not enter Aadhaar, licence or other ID details. If needed, the Aman Self Drive team verifies documents directly.
                </div>
                {CONFIG.demoMode && <div className="notice">Preview build: please use a test name and number rather than real personal details.</div>}
              </div>
            )}

            {/* ---------- Step 6: review ---------- */}
            {step === 5 && vehicle && (
              <div className="stack">
                <SummaryList f={f} vehicle={vehicle} hours={hours} />
                <EstimateBox est={est} />
                <div className="notice">
                  Next you get a WhatsApp message with all of these details filled in. The request reaches Aman Self Drive only when you press
                  Send in WhatsApp; the team then confirms availability and the final price. This is <strong>not</strong> a confirmed rental.
                </div>
                {submitError && <div className="notice warn" role="alert">{submitError}</div>}
              </div>
            )}
          </div>

          <div className="wizard-nav">
            {step > 0 ? (
              <button className="btn btn-ghost" onClick={() => go(-1)} disabled={submitting}>← Back</button>
            ) : (
              <Link className="btn btn-ghost" to="/cars">Browse cars</Link>
            )}
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={() => go(1)}>Continue →</button>
            ) : (
              <button className="btn btn-primary" onClick={submit} disabled={submitting}>
                {submitting ? 'Preparing…' : 'Prepare WhatsApp Enquiry'}
              </button>
            )}
          </div>
        </div>

        {/* ---------- Live summary ---------- */}
        <aside className="card summary-card" aria-label="Your request so far">
          <h3 style={{ marginBottom: 10 }}>Your request</h3>
          {vehicle ? (
            <>
              <CarImage vehicle={vehicle} />
              <div style={{ margin: '10px 0 4px', fontWeight: 800 }}>{vehicle.name}</div>
              <div className="chips" style={{ marginBottom: 10 }}>
                {specChips(vehicle).map((c) => <span key={c} className="chip">{c}</span>)}
              </div>
            </>
          ) : (
            <p className="muted small">No car selected yet.</p>
          )}
          {step >= 1 && durationOk && (
            <dl className="kv" style={{ marginBottom: 10 }}>
              <dt>Pickup</dt><dd>{fmtWhen(f.pickupDate, f.pickupTime)}</dd>
              <dt>Return</dt><dd>{fmtWhen(f.returnDate, f.returnTime)}</dd>
              <dt>Duration</dt><dd>{formatDuration(hours)}</dd>
            </dl>
          )}
          {est && step >= 1 && <EstimateBox est={est} compact />}
        </aside>
      </div>
    </div>
  );
}

function SummaryList({ f, vehicle, hours }) {
  return (
    <dl className="kv">
      <dt>Vehicle</dt><dd>{vehicle.name}</dd>
      <dt>Pickup</dt><dd>{fmtWhen(f.pickupDate, f.pickupTime)}</dd>
      <dt>Return</dt><dd>{fmtWhen(f.returnDate, f.returnTime)}</dd>
      <dt>Duration</dt><dd>{formatDuration(hours)}</dd>
      <dt>City</dt><dd>{CITY_NAMES[f.city]}</dd>
      <dt>Pickup at</dt><dd>{locationText(f.pickupMode, f.pickupDetail, f.city)}</dd>
      <dt>Return at</dt><dd>{locationText(f.returnMode, f.returnDetail, f.city)}</dd>
      <dt>Trip</dt><dd>{f.tripType === 'city' ? 'Within the city' : 'Outstation'} · {f.destination}</dd>
      {f.notes.trim() && (<><dt>Notes</dt><dd>{f.notes}</dd></>)}
      <dt>Name</dt><dd>{f.name}</dd>
      <dt>Mobile</dt><dd>{normalizeMobile(f.mobile) || f.mobile}</dd>
      {f.email.trim() && (<><dt>Email</dt><dd>{f.email}</dd></>)}
    </dl>
  );
}
