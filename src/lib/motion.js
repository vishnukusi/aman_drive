// Small, dependency-free motion helpers.
// Every effect is progressive: content is fully visible and usable without JavaScript, without IntersectionObserver,
// under `prefers-reduced-motion: reduce`, and on touch screens (tilt/parallax/magnetic need a fine pointer).
import { useEffect, useRef, useState } from 'react';

const hasWindow = typeof window !== 'undefined';
const mq = (q) => (hasWindow && window.matchMedia ? window.matchMedia(q).matches : false);

export const prefersReducedMotion = () => mq('(prefers-reduced-motion: reduce)');
export const hasFinePointer = () => mq('(hover: hover) and (pointer: fine)');

/**
 * Adds `is-in` to the element once it scrolls into view. CSS decides what the reveal looks like (see `.reveal`).
 * Children with `data-stagger` get an increasing --i so they cascade.
 */
export function useReveal({ threshold = 0.15, rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    el.querySelectorAll('[data-stagger]').forEach((c, i) => c.style.setProperty('--i', String(i)));
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      el.classList.add('is-in');
      return undefined;
    }
    el.classList.add('reveal-armed');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      }),
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);
  return ref;
}

/** Counts from 0 to `to` once the element is visible. Renders the final number immediately under reduced motion. */
export function useCountUp(to, { duration = 1400 } = {}) {
  const ref = useRef(null);
  const [value, setValue] = useState(() => (hasWindow && !prefersReducedMotion() && 'IntersectionObserver' in window ? 0 : to));
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setValue(to);
      return undefined;
    }
    let raf = 0;
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - start) / duration);
        setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return [ref, value];
}

/**
 * Pointer-driven 3D tilt. Writes --rx / --ry (degrees) and --mx / --my (0–100 %) custom properties; CSS applies them.
 * No-op on touch devices and under reduced motion.
 */
export function useTilt({ max = 6 } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return undefined;
    let raf = 0;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      });
    };
    const leave = () => {
      cancelAnimationFrame(raf);
      ['--rx', '--ry'].forEach((p) => el.style.setProperty(p, '0deg'));
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [max]);
  return ref;
}

/**
 * Hero depth: pointer parallax (fine pointers) + scroll parallax (all devices except reduced motion).
 * Writes --px / --py (-1…1) and --scroll (px) on the element; layers multiply them by their own depth in CSS.
 */
export function useParallax() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return undefined;
    let raf = 0;
    const fine = hasFinePointer();
    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--px', ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty('--py', ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    let visible = true;
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
    io.observe(el);
    const onScroll = () => {
      if (!visible) return;
      el.style.setProperty('--scroll', `${Math.min(window.scrollY, 900)}`);
    };
    if (fine) window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return ref;
}

/** Magnetic pull for primary CTAs on fine pointers: the button drifts a few px toward the cursor. */
export function useMagnetic({ strength = 0.25 } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return undefined;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${(dx * strength).toFixed(1)}px, ${(dy * strength).toFixed(1)}px)`;
    };
    const leave = () => { el.style.transform = ''; };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [strength]);
  return ref;
}

/** Scroll-spy: returns the id of the section currently in the reading band. */
export function useScrollSpy(ids, enabled = true) {
  const [active, setActive] = useState(null);
  const key = ids.join('|');
  useEffect(() => {
    if (!enabled || !('IntersectionObserver' in window)) return undefined;
    const els = key.split('|').map((id) => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-35% 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key, enabled]);
  return active;
}
