import { useEffect } from 'react';

export const DEFAULT_TITLE = 'Aman Self Drive Car Rentals | Self Drive Cars in Vijayawada, Hyderabad & Vizag';

const setMeta = (sel, attr, value) => {
  const el = document.head.querySelector(sel);
  if (el && value) el.setAttribute(attr, value);
};

/** Per-route <title> and description (also mirrored to Open Graph tags). Restores the defaults on unmount. */
export function usePageMeta(title, description) {
  useEffect(() => {
    if (!title) return undefined;
    const prevTitle = document.title;
    const desc = document.head.querySelector('meta[name="description"]');
    const prevDesc = desc && desc.getAttribute('content');
    document.title = title;
    setMeta('meta[property="og:title"]', 'content', title);
    if (description) {
      setMeta('meta[name="description"]', 'content', description);
      setMeta('meta[property="og:description"]', 'content', description);
    }
    return () => {
      document.title = prevTitle;
      setMeta('meta[property="og:title"]', 'content', prevTitle);
      if (prevDesc) {
        setMeta('meta[name="description"]', 'content', prevDesc);
        setMeta('meta[property="og:description"]', 'content', prevDesc);
      }
    };
  }, [title, description]);
}
