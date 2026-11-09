import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store.js';
import { CATEGORIES, CATEGORY_LABELS, COLLECTIONS, transmissionKind } from '../data/vehicles.js';
import VehicleCard from '../components/VehicleCard.jsx';
import VehicleDetails from '../components/VehicleDetails.jsx';
import { EnquirySheet } from '../components/EnquiryForm.jsx';
import Icon from '../components/Icon.jsx';
import { usePageMeta } from '../lib/meta.js';

const PRICE_BANDS = [
  { id: 'any', label: 'Any price', test: () => true },
  { id: 'u2', label: 'Up to ₹2,000', test: (p) => p <= 2000 },
  { id: 'm', label: '₹2,001 – ₹3,500', test: (p) => p > 2000 && p <= 3500 },
  { id: 'o', label: 'Above ₹3,500', test: (p) => p > 3500 },
];

const SORTS = [
  { id: 'price-asc', label: 'Price: low to high', fn: (a, b) => a.rate24 - b.rate24 || a.name.localeCompare(b.name) },
  { id: 'price-desc', label: 'Price: high to low', fn: (a, b) => b.rate24 - a.rate24 || a.name.localeCompare(b.name) },
  { id: 'seats', label: 'Most seats', fn: (a, b) => b.seats - a.seats || a.rate24 - b.rate24 },
  { id: 'name', label: 'Name A–Z', fn: (a, b) => a.name.localeCompare(b.name) },
];

// Filters that the page understands, in URL order. Keeping them in the query string makes filtered views shareable.
const DEFAULTS = { category: 'all', collection: 'all', trans: 'any', price: 'any', sort: 'price-asc' };

export default function Cars() {
  const { vehicles } = useStore();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [details, setDetails] = useState(null);
  const [enquire, setEnquire] = useState(null);

  usePageMeta(
    'Self Drive Car Fleet & Prices | Aman Self Drive Car Rentals',
    'Hatchbacks, sedans, SUVs and 7-seaters from ₹1,500 per 24 hours with 400 km. Filter by type, transmission and price, then enquire on WhatsApp.',
  );

  const get = (k) => params.get(k) || DEFAULTS[k];
  const category = get('category');
  const collection = get('collection');
  const trans = get('trans');
  const band = get('price');
  const sort = get('sort');

  const set = (k, v) => {
    const next = new URLSearchParams(params);
    v === DEFAULTS[k] ? next.delete(k) : next.set(k, v);
    setParams(next, { replace: true });
  };

  const all = useMemo(() => vehicles.filter((v) => v.visible), [vehicles]);
  const list = useMemo(() => {
    const b = PRICE_BANDS.find((x) => x.id === band) || PRICE_BANDS[0];
    const coll = COLLECTIONS.find((c) => c.id === collection);
    const s = SORTS.find((x) => x.id === sort) || SORTS[0];
    return all
      .filter((v) => category === 'all' || v.category === category)
      .filter((v) => !coll || coll.test(v))
      .filter((v) => {
        if (trans === 'any') return true;
        const k = transmissionKind(v);
        return trans === 'automatic' ? k.automatic : k.manual;
      })
      .filter((v) => b.test(v.rate24))
      .sort(s.fn);
  }, [all, category, collection, trans, band, sort]);

  const active = ['category', 'collection', 'trans', 'price'].filter((k) => get(k) !== DEFAULTS[k]).length;
  const select = (v) => nav(`/book?car=${v.id}`);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Fleet &amp; prices</div>
          <h1>Our self drive fleet</h1>
          <p className="lead">
            {all.length} cars with the rates Aman Self Drive publishes: per 24 hours with 400 km, a 12-hour option where listed, fuel and tolls
            extra. Showing a car here does not mean it is free on your dates; the team confirms availability on WhatsApp.
          </p>
        </div>
      </section>

      <div className="container section fleet-page">
        <div className="filters card">
          <div className="filter-row">
            <span className="filter-label">Type</span>
            {['all', ...CATEGORIES].map((c) => (
              <button key={c} className="pill" aria-pressed={category === c} onClick={() => set('category', c)}>
                {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="filter-row">
            <span className="filter-label">Collection</span>
            {[{ id: 'all', label: 'Any' }, ...COLLECTIONS].map((c) => (
              <button key={c.id} className="pill" aria-pressed={collection === c.id} onClick={() => set('collection', c.id)} title={c.blurb}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="filter-row">
            <span className="filter-label">Transmission</span>
            {[['any', 'Any'], ['automatic', 'Automatic'], ['manual', 'Manual']].map(([id, label]) => (
              <button key={id} className="pill" aria-pressed={trans === id} onClick={() => set('trans', id)}>{label}</button>
            ))}
          </div>
          <div className="filter-row">
            <span className="filter-label">Price / 24 hrs</span>
            {PRICE_BANDS.map((p) => (
              <button key={p.id} className="pill" aria-pressed={band === p.id} onClick={() => set('price', p.id)}>{p.label}</button>
            ))}
          </div>
          <p className="hint">
            Automatic / Manual uses only what the website states (“AT &amp; MT”, “Automatic”); cars whose transmission is not stated appear
            under “Any”. Premium = published 24-hr rate of ₹4,500 or more. Family = 7 seats typical for the model.
          </p>
        </div>

        <div className="results-bar">
          <p className="small muted" aria-live="polite">
            <b>{list.length}</b> car{list.length === 1 ? '' : 's'} shown
            {active > 0 && (
              <button className="linkish" onClick={() => setParams(sort === DEFAULTS.sort ? {} : { sort }, { replace: true })}>
                Clear {active} filter{active > 1 ? 's' : ''}
              </button>
            )}
          </p>
          <label className="sort">
            <Icon name="sort" size={16} />
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort cars">
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>

        {list.length ? (
          <div className="vgrid">
            {list.map((v, i) => (
              <div className="card-in" style={{ '--i': Math.min(i, 8) }} key={v.id}>
                <VehicleCard vehicle={v} onDetails={setDetails} onEnquire={setEnquire} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <p>No cars match these filters.</p>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setParams({}, { replace: true })}>Clear filters</button>
          </div>
        )}
        <p className="small muted" style={{ marginTop: 18 }}>
          *Seating and category are standard for each model and may differ for individual fleet cars. Fuel and tolls are extra.
        </p>
      </div>

      {details && (
        <VehicleDetails
          vehicle={details}
          onClose={() => setDetails(null)}
          onSelect={(v) => { setDetails(null); select(v); }}
          onEnquire={(v) => { setDetails(null); setEnquire(v); }}
        />
      )}
      {enquire && <EnquirySheet vehicle={enquire} onClose={() => setEnquire(null)} />}
    </>
  );
}
