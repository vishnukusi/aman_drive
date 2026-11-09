import { Link } from 'react-router-dom';
import { useStore } from '../store.js';
import { CATEGORIES } from '../data/vehicles.js';
import { FAQ } from '../data/faq.js';
import { CONFIG } from '../config.js';
import { inr } from '../lib/pricing.js';
import { waLink } from '../lib/whatsapp.js';

const HERO_IMG = 'https://amanselfdrivecars.com/assets/images/car_kia_seltos.jpg';

export default function Home() {
  const { vehicles } = useStore();
  const visible = vehicles.filter((v) => v.visible);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">Self drive · Vijayawada</div>
            <h1>Your Drive Starts Here.</h1>
            <p className="lead">
              Pick a car, tell us your dates and trip, and send one complete request. The Aman Self Drive team reviews it, confirms
              availability and your final price, and you carry on over WhatsApp.
            </p>
            <div className="hero-actions">
              <Link to="/book" className="btn btn-primary">Book a Car</Link>
              <Link to="/cars" className="btn btn-ghost">Explore Our Cars</Link>
            </div>
            <div className="hero-points">
              <span>Rates from {inr(Math.min(...visible.map((v) => v.rate24), 1500))} / 24 hrs</span>
              <span>400 km included per 24 hrs</span>
              <span>Fuel &amp; tolls extra</span>
            </div>
          </div>
          <figure className="hero-img" style={{ margin: 0 }}>
            <img src={HERO_IMG} alt="Kia Seltos from the Aman Self Drive fleet" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <figcaption>Photo: Aman Self Drive website</figcaption>
          </figure>
        </div>
      </section>

      <section className="section" id="categories">
        <div className="container">
          <div className="section-head">
            <h2>Choose the car that fits the trip</h2>
            <p>From budget hatchbacks to 7-seaters and SUVs. Tap a category to browse.</p>
          </div>
          <div className="cats">
            {CATEGORIES.map((c) => {
              const list = visible.filter((v) => v.category === c);
              if (!list.length) return null;
              return (
                <Link key={c} className="cat" to={`/cars?category=${c}`}>
                  <h3>{c === 'MPV' ? 'MPV / 7-seater' : c}</h3>
                  <div className="count">{list.length} model{list.length > 1 ? 's' : ''} listed</div>
                  <div className="from">from {inr(Math.min(...list.map((v) => v.rate24)))}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="how">
        <div className="container">
          <div className="section-head">
            <h2>How booking works</h2>
            <p>DriveFlow gathers every detail up front, so the team does not have to ask for them one message at a time.</p>
          </div>
          <div className="steps">
            <div className="step"><h3>Tell us what you need</h3><p>Choose a car, dates, pickup and return, and where you are headed.</p></div>
            <div className="step"><h3>Send the request</h3><p>You get an enquiry ID and a ready-to-send WhatsApp message with all the details.</p></div>
            <div className="step"><h3>Team confirms</h3><p>Aman Self Drive checks availability and shares the final quotation and pickup details.</p></div>
            <div className="step"><h3>Verify &amp; drive</h3><p>The team handles licence, ID and selfie verification before handover. Nothing is collected here.</p></div>
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="container">
          <div className="section-head">
            <h2>Frequently asked questions</h2>
            <p>Answers marked “From Aman’s website” were checked against amanselfdrivecars.com. Anything the website does not state is left to the team.</p>
          </div>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>
                  <span>
                    {f.q}
                    {f.verified ? <span className="tag-verified">From Aman’s website</span> : <span className="tag-confirm">Confirm with team</span>}
                  </span>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="contact">
        <div className="container">
          <div className="card row spread" style={{ gap: 20 }}>
            <div>
              <h2>Prefer to talk to the team?</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                {CONFIG.phoneDisplay} · {CONFIG.defaultCity}, MG Road office. WhatsApp is how Aman Self Drive handles bookings today, and
                DriveFlow works alongside it.
              </p>
            </div>
            <div className="row">
              <a className="btn btn-wa" href={waLink('Hi, I want to book a self drive car')} target="_blank" rel="noreferrer">Message on WhatsApp</a>
              <a className="btn btn-ghost" href={`tel:+${CONFIG.whatsappNumber}`}>Call {CONFIG.phoneDisplay}</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
