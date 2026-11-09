import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { CONFIG } from '../config.js';
import { waLink } from '../lib/whatsapp.js';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/cars', label: 'Our Cars' },
  { to: '/track', label: 'Track Enquiry' },
];

export default function CustomerLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const generalWa = waLink('Hi, I want to book a self drive car');

  return (
    <>
      <div className="ribbon">
        <b>Concept demonstration by ComputeX</b> · Not the official Aman Self Drive website · Simulated booking flow, no real bookings are made
      </div>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" onClick={() => setOpen(false)}>
            <span className="brand-mark">A</span>
            <span>
              Aman Self Drive
              <small>Vijayawada · powered by DriveFlow</small>
            </span>
          </Link>
          <nav className="nav-links" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                {l.label}
              </NavLink>
            ))}
            <a href="#/#faq" onClick={(e) => { e.preventDefault(); location.hash = '#/'; setTimeout(() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }), 60); }}>FAQ</a>
            <Link to="/book" className="btn btn-primary btn-sm">Book a Car</Link>
          </nav>
          <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ marginLeft: 'auto' }}>
            {open ? '×' : '☰'}
          </button>
        </div>
        {open && (
          <div className="mobile-menu">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>{l.label}</Link>
            ))}
            <a href={generalWa} target="_blank" rel="noreferrer">WhatsApp us</a>
            <Link to="/book" className="btn btn-primary" onClick={() => setOpen(false)}>Book a Car</Link>
          </div>
        )}
      </header>

      <main key={pathname}>
        <Outlet />
      </main>

      {pathname !== '/book' && !pathname.startsWith('/enquiry') && (
        <a className="btn btn-wa wa-float" href={generalWa} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
          WhatsApp
        </a>
      )}

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <h4>Aman Self Drive Car Rentals</h4>
              <p>{CONFIG.address}</p>
              <p style={{ marginTop: 6 }}>Phone / WhatsApp: <a href={`tel:+${CONFIG.whatsappNumber}`}>{CONFIG.phoneDisplay}</a></p>
              <p style={{ marginTop: 6 }}>Official site: <a href={CONFIG.websiteUrl} target="_blank" rel="noreferrer">amanselfdrivecars.com</a></p>
            </div>
            <div>
              <h4>Explore</h4>
              <p><Link to="/cars">Our cars</Link></p>
              <p><Link to="/book">Book a car</Link></p>
              <p><Link to="/track">Track an enquiry</Link></p>
            </div>
            <div>
              <h4>Team access</h4>
              <p><Link to="/admin">Staff dashboard (demo)</Link></p>
            </div>
          </div>
          <div className="legal">
            <b style={{ color: '#fff' }}>Concept demonstration by ComputeX.</b> DriveFlow is not an official product of Aman Self Drive, has no
            integration with its systems, and shows no live availability. Prices are those published on amanselfdrivecars.com
            ({CONFIG.ratesCheckedOn}); a request submitted here is saved in this browser only and is not delivered to the business unless
            you send it on WhatsApp.
          </div>
        </div>
      </footer>
    </>
  );
}
