import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CONFIG } from '../config.js';
import { CITIES } from '../data/business.js';
import { waLink } from '../lib/whatsapp.js';
import { useScrollSpy } from '../lib/motion.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';

// `section` items scroll to a block on the home page; `to` items are their own routes.
const NAV = [
  { label: 'Home', section: 'top' },
  { label: 'About', section: 'about' },
  { label: 'Locations', section: 'locations' },
  { label: 'Fleet', to: '/cars' },
  { label: 'FAQ', section: 'faq' },
  { label: 'Contact', section: 'contact' },
];
// Every home section is watched; sections without a nav item (why, how, reviews, enquire) show no indicator.
const SPY = { top: 'Home', locations: 'Locations', fleet: 'Fleet', why: null, how: null, reviews: null, about: 'About', enquire: null, faq: 'FAQ', contact: 'Contact' };
const SPY_IDS = Object.keys(SPY);
const GENERAL_WA = 'Hi, I want to book a self drive car';

export function scrollToSection(id) {
  const el = id === 'top' ? document.body : document.getElementById(id);
  if (!el) return false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (id === 'top') window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  return true;
}

export default function CustomerLayout() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname, search } = useLocation();
  const nav = useNavigate();
  const onHome = pathname === '/';
  const spy = useScrollSpy(SPY_IDS, onHome);
  const linksRef = useRef(null);
  // Fade between routes only after the first page: the initial render must paint immediately (LCP).
  const firstPath = useRef(pathname);
  const animatePage = pathname !== firstPath.current;
  const [ink, setInk] = useState(null);

  // Close the mobile menu on navigation and on Escape.
  useEffect(() => setOpen(false), [pathname, search]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeLabel = (() => {
    if (pathname.startsWith('/cars')) return 'Fleet';
    if (pathname.startsWith('/locations')) return 'Locations';
    if (!onHome) return null;
    return spy ? SPY[spy] : 'Home';
  })();

  // Animated indicator under the active link (desktop).
  const measure = useCallback(() => {
    const host = linksRef.current;
    const el = host && host.querySelector(`[data-label="${activeLabel}"]`);
    setInk(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
  }, [activeLabel]);
  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    document.fonts?.ready?.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const go = (item) => (e) => {
    if (item.to) return; // NavLink handles it
    e.preventDefault();
    setOpen(false);
    if (onHome) {
      scrollToSection(item.section);
      if (item.section === 'top') nav('/', { replace: true });
      else nav(`/?s=${item.section}`, { replace: true, preventScrollReset: true });
    } else {
      nav(item.section === 'top' ? '/' : `/?s=${item.section}`);
    }
  };

  const linkProps = (item) =>
    item.to
      ? { as: NavLink, to: item.to }
      : { as: 'a', href: item.section === 'top' ? '#/' : `#/?s=${item.section}`, onClick: go(item) };

  const renderLink = (item, extra = {}) => {
    const { as: Tag, ...p } = linkProps(item);
    return (
      <Tag
        key={item.label}
        data-label={item.label}
        className={activeLabel === item.label ? 'active' : ''}
        aria-current={activeLabel === item.label ? 'page' : undefined}
        {...p}
        {...extra}
      >
        {item.label}
      </Tag>
    );
  };

  const hideFloat = pathname === '/book' || pathname.startsWith('/enquiry');

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      {CONFIG.demoMode && (
        <div className="ribbon" role="note">
          <span>Preview build</span> · Rates as published by Aman Self Drive · Bookings are confirmed only by the Aman team on WhatsApp
        </div>
      )}
      <header className={`nav${scrolled ? ' scrolled' : ''}${onHome && !scrolled ? ' over-hero' : ''}`}>
        <div className="container nav-inner">
          <Link to="/" className="brand" aria-label="Aman Self Drive Car Rentals, home" onClick={() => onHome && scrollToSection('top')}>
            <Logo height={46} />
          </Link>
          <nav className="nav-links" aria-label="Main" ref={linksRef}>
            {NAV.map((item) => renderLink(item))}
            {ink && <span className="nav-ink" style={{ transform: `translateX(${ink.left}px)`, width: ink.width }} aria-hidden />}
          </nav>
          <div className="nav-cta">
            <a className="btn btn-wa btn-sm nav-wa" href={waLink(GENERAL_WA)} target="_blank" rel="noopener noreferrer" aria-label="Book on WhatsApp">
              <Icon name="whatsapp" size={17} /> <span>WhatsApp</span>
            </a>
            <button
              className="burger"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((o) => !o)}
            >
              <Icon name={open ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>
        <div id="mobile-menu" className={`mobile-menu${open ? ' open' : ''}`} hidden={!open}>
          <nav aria-label="Mobile" className="container">
            {NAV.map((item) => renderLink(item))}
            <Link to="/track">Track an enquiry</Link>
            <div className="mobile-ctas">
              <a className="btn btn-wa" href={waLink(GENERAL_WA)} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> Book on WhatsApp</a>
              <a className="btn btn-ghost" href={`tel:+${CONFIG.whatsappNumber}`}><Icon name="phone" size={18} /> Call {CONFIG.phoneDisplay}</a>
            </div>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} key={pathname} className={animatePage ? 'page-enter' : undefined}>
        <Outlet />
      </main>

      {!hideFloat && (
        <a className="wa-float" href={waLink(GENERAL_WA)} target="_blank" rel="noopener noreferrer" aria-label="Chat with Aman Self Drive on WhatsApp">
          <Icon name="whatsapp" size={26} />
        </a>
      )}

      <footer className="footer">
        <div className="footer-glow" aria-hidden />
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Logo height={64} plate />
              <p>
                Aman Self Drive Car Rentals offers a wide range of well-maintained cars for short or long-term rentals in Vijayawada,
                Hyderabad and Vizag.
              </p>
              <div className="socials">
                <a href={CONFIG.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Aman Self Drive on Facebook"><Icon name="facebook" /></a>
                <a href={CONFIG.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Aman Self Drive on Instagram"><Icon name="instagram" /></a>
              </div>
            </div>
            <div>
              <h4>Explore</h4>
              <ul className="flinks">
                <li><Link to="/cars">Fleet &amp; prices</Link></li>
                <li><Link to="/book">Plan a trip</Link></li>
                <li><Link to="/track">Track an enquiry</Link></li>
                <li><a href="#/?s=faq" onClick={go({ section: 'faq' })}>FAQ</a></li>
                <li><a href="https://amanselfdrivecars.com/blog" target="_blank" rel="noopener noreferrer">Travel guides</a></li>
              </ul>
            </div>
            <div>
              <h4>Locations</h4>
              <ul className="flinks">
                {CITIES.map((c) => <li key={c.id}><Link to={`/locations/${c.id}`}>Self drive cars in {c.name}</Link></li>)}
              </ul>
            </div>
            <div>
              <h4>Get in touch</h4>
              <ul className="flinks contact">
                <li><a href={`tel:+${CONFIG.whatsappNumber}`}><Icon name="phone" size={16} />{CONFIG.phoneDisplay}</a></li>
                <li><a href={waLink(GENERAL_WA)} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={16} />WhatsApp</a></li>
                <li><a href={`mailto:${CONFIG.email}`}><Icon name="mail" size={16} />{CONFIG.email}</a></li>
                <li><a href={CONFIG.mapsUrl} target="_blank" rel="noopener noreferrer"><Icon name="pin" size={16} />MG Road, Labbipet, Vijayawada</a></li>
              </ul>
            </div>
          </div>
          <div className="legal">
            <span>© {new Date().getFullYear()} Aman Self Drive Car Rentals. Rates as published on amanselfdrivecars.com ({CONFIG.ratesCheckedOn}). Fuel and tolls extra.</span>
            <span className="legal-links">
              <a href="https://amanselfdrivecars.com/" target="_blank" rel="noopener noreferrer">Official website</a>
              {CONFIG.demoMode && <Link to="/admin">Staff dashboard (demo)</Link>}
            </span>
          </div>
          {CONFIG.demoMode && (
            <p className="legal-note">
              Preview build: enquiries made here open WhatsApp with your details filled in and are not received by the business until you press Send.
              No live availability is shown, and the team confirms every booking and final price.
            </p>
          )}
        </div>
      </footer>
    </>
  );
}
