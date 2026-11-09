import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store.js';
import { CATEGORIES, CATEGORY_LABELS, COLLECTIONS } from '../data/vehicles.js';
import { FAQ } from '../data/faq.js';
import { ABOUT, CITIES, DOCUMENTS, REVIEWS, STATS, WHY } from '../data/business.js';
import { CONFIG } from '../config.js';
import { inr } from '../lib/pricing.js';
import { waLink } from '../lib/whatsapp.js';
import { useCountUp, useMagnetic, useParallax } from '../lib/motion.js';
import { Reveal, SectionHead } from '../components/ui.jsx';
import VehicleCard from '../components/VehicleCard.jsx';
import VehicleDetails from '../components/VehicleDetails.jsx';
import EnquiryForm, { EnquirySheet } from '../components/EnquiryForm.jsx';
import Icon from '../components/Icon.jsx';
import { scrollToSection } from './CustomerLayout.jsx';

const GENERAL_WA = 'Hi, I want to book a self drive car';

export default function Home() {
  const { vehicles } = useStore();
  const visible = useMemo(() => vehicles.filter((v) => v.visible), [vehicles]);
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [details, setDetails] = useState(null);
  const [enquire, setEnquire] = useState(null);

  // Deep links such as #/?s=faq scroll to the section once the page has rendered.
  const target = params.get('s');
  useEffect(() => {
    if (!target) return undefined;
    const t = setTimeout(() => scrollToSection(target), 80);
    return () => clearTimeout(t);
  }, [target]);

  const from = visible.length ? Math.min(...visible.map((v) => v.rate24)) : 1500;
  const plan = (v) => nav(`/book?car=${v.id}`);

  return (
    <>
      <Hero from={from} heroCar={vehicles.find((v) => v.id === 'thar')} />
      <Stats />
      <Locations />
      <FleetShowcase vehicles={visible} onDetails={setDetails} onEnquire={setEnquire} />
      <Why />
      <HowItWorks />
      <Reviews />
      <About />
      <QuickEnquiry />
      <Faq />
      <Contact />
      {details && (
        <VehicleDetails
          vehicle={details}
          onClose={() => setDetails(null)}
          onSelect={(v) => { setDetails(null); plan(v); }}
          onEnquire={(v) => { setDetails(null); setEnquire(v); }}
        />
      )}
      {enquire && <EnquirySheet vehicle={enquire} onClose={() => setEnquire(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ Hero */
function Hero({ from, heroCar }) {
  const scene = useParallax();
  const magnet = useMagnetic();
  return (
    <section className="hero" id="top" ref={scene} aria-labelledby="hero-title">
      <div className="hero-bg" aria-hidden>
        <picture>
          <source media="(min-width: 900px)" srcSet="images/places/vijayawada-1200.webp" />
          <img src="images/places/vijayawada-640.webp" alt="" width="1200" height="800" fetchpriority="high" decoding="async" />
        </picture>
      </div>
      <div className="hero-shade" aria-hidden />
      <div className="hero-streaks" aria-hidden><i /><i /><i /><i /></div>

      <div className="container hero-grid">
        <div className="hero-copy">
          <div className="eyebrow hero-in" style={{ '--d': 0 }}><span className="dot" />Vijayawada · Hyderabad · Vizag</div>
          <h1 id="hero-title" className="hero-in" style={{ '--d': 1 }}>
            Self Drive &amp; Long Drive Cars <span className="hl">in Vijayawada, Hyderabad &amp; Vizag</span>
          </h1>
          <p className="lead hero-in" style={{ '--d': 2 }}>
            Hatchbacks, SUVs, Innova and Fortuner with transparent pricing and well-maintained cars. Rent for a weekend, a business trip or
            longer. One-way service between our three cities is available on request.
          </p>
          <div className="hero-actions hero-in" style={{ '--d': 3 }}>
            <a ref={magnet} className="btn btn-wa btn-lg magnetic" href={waLink(GENERAL_WA)} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" size={20} /> Book on WhatsApp
            </a>
            <Link to="/cars" className="btn btn-glass btn-lg">Explore the fleet <Icon name="arrow" size={18} /></Link>
          </div>
          <ul className="hero-points hero-in" style={{ '--d': 4 }}>
            <li><Icon name="tag" size={16} />From <b>{inr(from)}</b> / 24 hrs</li>
            <li><Icon name="road" size={16} />400 km included per 24 hrs</li>
            <li><Icon name="route" size={16} />One-way trips on request</li>
          </ul>
        </div>

        <div className="hero-stage hero-in" style={{ '--d': 2 }} aria-label="Featured car: Mahindra Thar 4×4">
          <div className="stage-floor" aria-hidden />
          <div className="stage-card">
            <picture>
              <img
                src="images/fleet/hero-thar-560.webp"
                srcSet="images/fleet/hero-thar-560.webp 560w, images/fleet/hero-thar-800.webp 800w, images/fleet/hero-thar-1400.webp 1400w"
                sizes="(min-width: 960px) 520px, 88vw"
                alt="Mahindra Thar 4×4 from the Aman Self Drive fleet"
                width="1600"
                height="1049"
                fetchpriority="high"
                decoding="async"
              />
            </picture>
            <span className="stage-sheen" aria-hidden />
          </div>
          {heroCar && (
            <>
              <div className="stage-chip chip-a">
                <small>Mahindra Thar 4×4 Diesel</small>
                <b>{inr(heroCar.rate24)}</b> <span>/ 24 hrs · 400 km</span>
              </div>
              {heroCar.rate12 && (
                <div className="stage-chip chip-b">
                  <small>12-hour slot</small>
                  <b>{inr(heroCar.rate12)}</b> <span>· 200 km</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <button className="hero-scroll" onClick={() => scrollToSection('locations')} aria-label="Scroll to locations">
        <span />
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ Stats */
function Stat({ value, suffix, label }) {
  const [ref, n] = useCountUp(value);
  return (
    <div className="stat-tile" ref={ref} data-stagger>
      <div className="stat-n">{n.toLocaleString('en-IN')}{suffix}</div>
      <div className="stat-l">{label}</div>
    </div>
  );
}

function Stats() {
  return (
    <section className="stats-band" aria-label="Aman Self Drive at a glance">
      <Reveal className="container stats-row">
        {STATS.map((s) => <Stat key={s.label} {...s} />)}
      </Reveal>
      <p className="container stats-src">Figures as published by Aman Self Drive Car Rentals.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ Locations */
function Locations() {
  return (
    <section className="section" id="locations" aria-labelledby="loc-title">
      <div className="container">
        <SectionHead eyebrow="Our locations" title={<span id="loc-title">Pick up in three cities</span>}>
          Vijayawada is our home city, with offices in Hyderabad and Vizag. One-way trips between all three are available on request.
        </SectionHead>
        <Reveal className="loc-grid">
          {CITIES.map((c) => (
            <article className="loc-card" key={c.id} data-stagger>
              <Link to={`/locations/${c.id}`} className="loc-media" tabIndex={-1} aria-hidden>
                <img src={`${c.image}-640.webp`} srcSet={`${c.image}-640.webp 640w, ${c.image}-1200.webp 1200w`} sizes="(min-width: 900px) 360px, 92vw" width="640" height="427" alt="" loading="lazy" decoding="async" />
                <span className="loc-state">{c.state}</span>
              </Link>
              <div className="loc-body">
                <h3><Link to={`/locations/${c.id}`}>Self drive cars in {c.name}</Link></h3>
                <p>{c.tagline}</p>
                <a className="loc-addr" href={c.mapsUrl} target="_blank" rel="noopener noreferrer">
                  <Icon name="pin" size={16} /><span>{c.address}</span>
                </a>
                <Link className="link-arrow" to={`/locations/${c.id}`}>Cars, pickup &amp; details <Icon name="arrow" size={16} /></Link>
              </div>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Fleet */
const SHOW_TABS = [
  { id: 'all', label: 'All' },
  ...CATEGORIES.filter((c) => c !== 'MPV').map((c) => ({ id: c, label: CATEGORY_LABELS[c] })),
  ...COLLECTIONS.map((c) => ({ id: c.id, label: c.label })),
];

function FleetShowcase({ vehicles, onDetails, onEnquire }) {
  const [tab, setTab] = useState('all');
  const list = useMemo(() => {
    const coll = COLLECTIONS.find((c) => c.id === tab);
    const pool = tab === 'all' ? vehicles : coll ? vehicles.filter(coll.test) : vehicles.filter((v) => v.category === tab);
    return [...pool].sort((a, b) => a.rate24 - b.rate24).slice(0, 6);
  }, [vehicles, tab]);
  const tabsId = useId();
  return (
    <section className="section section-dark" id="fleet" aria-labelledby="fleet-title">
      <div className="container">
        <SectionHead light eyebrow="Our fleet" title={<span id="fleet-title">The showroom, with prices up front</span>}>
          Rates shown are per 24 hours with 400 km (12-hour option where listed). Fuel and tolls are extra. Confirm availability on WhatsApp
          before you book.
        </SectionHead>
        <div className="tabs" role="tablist" aria-label="Filter cars">
          {SHOW_TABS.map((t) => (
            <button key={t.id} role="tab" id={`${tabsId}-${t.id}`} aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="vgrid" role="tabpanel" aria-labelledby={`${tabsId}-${tab}`} key={tab}>
          {list.map((v, i) => (
            <div className="card-in" style={{ '--i': i }} key={v.id}>
              <VehicleCard vehicle={v} onDetails={onDetails} onEnquire={onEnquire} />
            </div>
          ))}
        </div>
        <div className="center" style={{ marginTop: 28 }}>
          <Link
            className="btn btn-primary btn-lg"
            to={tab === 'all' ? '/cars' : COLLECTIONS.some((c) => c.id === tab) ? `/cars?collection=${tab}` : `/cars?category=${tab}`}
          >
            View all {vehicles.length} cars &amp; filters <Icon name="arrow" size={18} />
          </Link>
        </div>
        <p className="small center fleet-note">*Seating is typical for each model; individual cars may differ.</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Why */
function Why() {
  return (
    <section className="section" id="why" aria-labelledby="why-title">
      <div className="container">
        <SectionHead center eyebrow="Why Aman" title={<span id="why-title">Why choose Aman Self Drive Cars?</span>}>
          We go beyond handing over the keys. Every trip should be safe, affordable and hassle-free.
        </SectionHead>
        <Reveal className="why-grid">
          {WHY.map((w) => (
            <div className="why-card" key={w.title} data-stagger>
              <span className="why-ico"><Icon name={w.icon} size={24} /></span>
              <h3>{w.title}</h3>
              <p>{w.text}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ How it works */
function HowItWorks() {
  const steps = [
    ['Choose your car and city', 'Browse the fleet and send an enquiry with your dates, in one tap.'],
    ['Share your documents', 'Driving licence (at least 1 year old), a government ID and a live selfie, directly with the team.'],
    ['Get the final price on WhatsApp', 'The team confirms availability, the final price and pickup details.'],
    ['Inspect and drive', 'Collect or receive the car, inspect it with the team, and drive.'],
  ];
  return (
    <section className="section section-soft" id="how" aria-labelledby="how-title">
      <div className="container">
        <SectionHead eyebrow="How to book" title={<span id="how-title">From enquiry to keys in four steps</span>} />
        <Reveal as="ol" className="steps">
          {steps.map(([t, d]) => (
            <li className="step" key={t} data-stagger>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Reviews */
function Reviews() {
  return (
    <section className="section" id="reviews" aria-labelledby="rev-title">
      <div className="container">
        <SectionHead eyebrow="What people say" title={<span id="rev-title">Google reviews from our customers</span>}>
          Shown exactly as they appear on amanselfdrivecars.com.
        </SectionHead>
        <Reveal className="rev-grid">
          {REVIEWS.map((r) => (
            <figure className="rev-card" key={r.name} data-stagger>
              <div className="stars" role="img" aria-label={`${r.stars} out of 5 stars`}>
                {Array.from({ length: r.stars }, (_, i) => <Icon key={i} name="star" size={17} />)}
              </div>
              <blockquote>{r.text}</blockquote>
              <figcaption>
                <span className="rev-avatar" aria-hidden>{r.name.charAt(0)}</span>
                <span><b>{r.name}</b><small>Google review</small></span>
              </figcaption>
            </figure>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ About */
function About() {
  return (
    <section className="section section-soft" id="about" aria-labelledby="about-title">
      <div className="container about-grid">
        <Reveal className="about-copy">
          <div className="eyebrow" data-stagger>About us</div>
          <h2 id="about-title" data-stagger>Making travel simple, reliable and flexible</h2>
          <p data-stagger>{ABOUT.mission}</p>
          <p data-stagger>{ABOUT.fleet}</p>
          <ul className="values" data-stagger>
            {ABOUT.values.map((v) => <li key={v}><Icon name="check" size={16} />{v}</li>)}
          </ul>
        </Reveal>
        <Reveal className="docs-card">
          <h3 data-stagger>Documents you will need</h3>
          <ul data-stagger>
            {DOCUMENTS.map((d) => <li key={d}><Icon name="check" size={16} />{d}</li>)}
          </ul>
          <p className="small muted" data-stagger>
            Documents are verified directly by the Aman Self Drive team. Please do not upload or send ID through this website.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Quick enquiry */
function QuickEnquiry() {
  return (
    <section className="section enquire-band" id="enquire" aria-labelledby="enq-title">
      <div className="container enquire-grid">
        <Reveal className="enquire-copy">
          <div className="eyebrow" data-stagger>Quick enquiry</div>
          <h2 id="enq-title" data-stagger>Tell us the car, the dates and your city</h2>
          <p data-stagger>
            We open WhatsApp with every detail filled in, so the team can reply with availability and the final price without asking twice.
          </p>
          <ul className="enq-points" data-stagger>
            <li><Icon name="check" size={16} />No account, no app, no payment here</li>
            <li><Icon name="check" size={16} />You see the message before you send it</li>
            <li><Icon name="check" size={16} />The team confirms every booking personally</li>
          </ul>
        </Reveal>
        <div className="enquire-card">
          <EnquiryForm idPrefix="home" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ FAQ */
function Faq() {
  const [open, setOpen] = useState(0);
  const base = useId();
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="container faq-wrap">
        <SectionHead eyebrow="FAQ" title={<span id="faq-title">Frequently asked questions</span>}>
          Quick answers on price, kilometres, documents and delivery, taken from Aman Self Drive’s published FAQ.
        </SectionHead>
        <div className="acc">
          {FAQ.map((f, i) => {
            const isOpen = open === i;
            return (
              <div className={`acc-item${isOpen ? ' open' : ''}`} key={f.q}>
                <h3>
                  <button id={`${base}-b${i}`} aria-expanded={isOpen} aria-controls={`${base}-p${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                    <span>{f.q}</span>
                    <span className="acc-icon" aria-hidden />
                  </button>
                </h3>
                <div id={`${base}-p${i}`} role="region" aria-labelledby={`${base}-b${i}`} className="acc-panel" hidden={!isOpen}>
                  <div>
                    <p>{f.a}</p>
                    {f.confirm && <span className="tag-confirm">Confirm with the team</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Contact */
function Contact() {
  return (
    <section className="section section-dark contact-band" id="contact" aria-labelledby="contact-title">
      <div className="container">
        <SectionHead light eyebrow="Contact" title={<span id="contact-title">Ready to book your self drive car?</span>}>
          Tell us the car, the dates and your city. We confirm on WhatsApp.
        </SectionHead>
        <Reveal className="contact-grid">
          <a className="contact-tile wa" href={waLink(GENERAL_WA)} target="_blank" rel="noopener noreferrer" data-stagger>
            <Icon name="whatsapp" size={28} /><span><small>WhatsApp</small><b>Book on WhatsApp</b></span>
          </a>
          <a className="contact-tile" href={`tel:+${CONFIG.whatsappNumber}`} data-stagger>
            <Icon name="phone" size={26} /><span><small>Call us</small><b>{CONFIG.phoneDisplay}</b></span>
          </a>
          <a className="contact-tile" href={`mailto:${CONFIG.email}`} data-stagger>
            <Icon name="mail" size={26} /><span><small>Email</small><b className="break">{CONFIG.email}</b></span>
          </a>
        </Reveal>
        <Reveal className="office-grid">
          {CITIES.map((c) => (
            <div className="office" key={c.id} data-stagger>
              <h3>{c.name}</h3>
              <p>{c.address}</p>
              <a href={c.mapsUrl} target="_blank" rel="noopener noreferrer" className="link-arrow light">
                Open in Google Maps <Icon name="external" size={15} />
              </a>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
