import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store.js';
import { CITIES, cityById } from '../data/business.js';
import { CONFIG } from '../config.js';
import { modeLabel, waLink } from '../lib/whatsapp.js';
import { inr } from '../lib/pricing.js';
import { Reveal } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import VehicleCard from '../components/VehicleCard.jsx';
import VehicleDetails from '../components/VehicleDetails.jsx';
import EnquiryForm, { EnquirySheet } from '../components/EnquiryForm.jsx';
import { usePageMeta } from '../lib/meta.js';

export default function Location() {
  const { city: id } = useParams();
  const city = cityById(id);
  const { vehicles } = useStore();
  const nav = useNavigate();
  const [details, setDetails] = useState(null);
  const [enquire, setEnquire] = useState(null);
  const list = useMemo(() => vehicles.filter((v) => v.visible).sort((a, b) => a.rate24 - b.rate24), [vehicles]);
  const from = list.length ? Math.min(...list.map((v) => v.rate24)) : 1500;

  usePageMeta(
    city && `Self Drive Cars in ${city.name} | Aman Self Drive Car Rentals`,
    city && `Self drive car rental in ${city.name} from ${inr(from)} per 24 hours with 400 km. ${city.tagline} Book on WhatsApp: ${CONFIG.phoneDisplay}.`,
  );
  useEffect(() => { setDetails(null); setEnquire(null); }, [id]);

  if (!city) return <Navigate to="/" replace />;

  return (
    <>
      <section className="city-hero">
        <img
          className="city-hero-img"
          src={`${city.image}-1200.webp`}
          srcSet={`${city.image}-640.webp 640w, ${city.image}-1200.webp 1200w`}
          sizes="100vw"
          alt={city.imageAlt}
          width="1200"
          height="800"
          fetchpriority="high"
        />
        <div className="city-hero-shade" aria-hidden />
        <div className="container city-hero-copy">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link> <span aria-hidden>/</span> <Link to="/?s=locations">Locations</Link> <span aria-hidden>/</span> <span aria-current="page">{city.name}</span>
          </nav>
          <h1 className="hero-in" style={{ '--d': 0 }}>Self drive cars in {city.name}</h1>
          <p className="lead hero-in" style={{ '--d': 1 }}>{city.tagline}</p>
          <div className="hero-actions hero-in" style={{ '--d': 2 }}>
            <a className="btn btn-wa btn-lg" href={waLink(`Hi, I want to book a self drive car in ${city.name}`)} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" size={20} /> Book in {city.name}
            </a>
            <a className="btn btn-glass btn-lg" href={city.mapsUrl} target="_blank" rel="noopener noreferrer"><Icon name="pin" size={18} /> Directions</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container city-grid">
          <Reveal className="city-info">
            <h2 data-stagger>{city.name} at a glance</h2>
            <ul className="city-points" data-stagger>
              {city.points.map((p) => <li key={p}><Icon name="check" size={18} />{p}</li>)}
            </ul>
            <div className="city-facts" data-stagger>
              <div><small>Rates from</small><b>{inr(from)}</b><span>per 24 hrs · 400 km</span></div>
              <div><small>Pickup options</small><b>{city.handover.length > 2 ? `${city.handover.length} options` : 'Office'}</b><span>{city.handover.map((m) => modeLabel(m, city.id)).join(' · ')}</span></div>
            </div>
            <address className="city-address" data-stagger>
              <Icon name="pin" size={18} />
              <span><b>Aman Self Drive, {city.name}</b><br />{city.address}</span>
            </address>
            <p className="small muted" data-stagger>
              More on {city.name}: <a href={city.officialPage} target="_blank" rel="noopener noreferrer">the official {city.name} page</a>. Delivery charges,
              timings and which cars are in {city.name} on your dates are confirmed by the team.
            </p>
          </Reveal>
          <div className="enquire-card">
            <h2 className="h3" style={{ marginBottom: 12 }}>Enquire for {city.name}</h2>
            <EnquiryForm city={city.id} idPrefix={`city-${city.id}`} />
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Fleet</div>
            <h2>Cars and published rates</h2>
            <p>One price list applies across Aman’s locations. Which cars are in {city.name} on your dates is confirmed on WhatsApp.</p>
          </div>
          <div className="vgrid">
            {list.map((v) => <VehicleCard key={v.id} vehicle={v} onDetails={setDetails} onEnquire={setEnquire} />)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container other-cities">
          <h2 className="h3">Other locations</h2>
          <div className="row">
            {CITIES.filter((c) => c.id !== city.id).map((c) => (
              <Link key={c.id} className="btn btn-ghost" to={`/locations/${c.id}`}>Self drive cars in {c.name} <Icon name="arrow" size={16} /></Link>
            ))}
          </div>
        </div>
      </section>

      {details && (
        <VehicleDetails
          vehicle={details}
          onClose={() => setDetails(null)}
          onSelect={(v) => nav(`/book?car=${v.id}&city=${city.id}`)}
          onEnquire={(v) => { setDetails(null); setEnquire(v); }}
        />
      )}
      {enquire && <EnquirySheet vehicle={enquire} city={city.id} onClose={() => setEnquire(null)} />}
    </>
  );
}
