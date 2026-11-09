// Duration and indicative-estimate logic. Pure functions, no browser APIs, so they can be unit tested in Node.
//
// Rate structure follows what amanselfdrivecars.com publishes: a flat 24-hour rate (400 km),
// an optional 12-hour rate (200 km) and, on most cars, an extra-hour charge of Rs 400.
// How overruns beyond the listed slots are actually billed is a staff decision, so every result
// from estimate() is an INDICATION only and the UI must say so.

export const MS_PER_HOUR = 36e5;

export function toDate(date, time) {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function durationHours(pickupDate, pickupTime, returnDate, returnTime) {
  const a = toDate(pickupDate, pickupTime);
  const b = toDate(returnDate, returnTime);
  if (!a || !b) return null;
  return (b.getTime() - a.getTime()) / MS_PER_HOUR;
}

export function formatDuration(hours) {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return '—';
  const totalMinutes = Math.round(hours * 60);
  const days = Math.floor(totalMinutes / (24 * 60));
  const h = Math.floor((totalMinutes % (24 * 60)) / 60);
  const m = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (h) parts.push(`${h} hr${h > 1 ? 's' : ''}`);
  if (m) parts.push(`${m} min`);
  return parts.join(' ') || '0 min';
}

export const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

/**
 * Indicative estimate for `hours` of rental.
 * Returns null when it cannot be computed, otherwise { amount, lines[], notes[] }.
 */
export function estimate(vehicle, hours) {
  if (!vehicle || !vehicle.rate24 || !Number.isFinite(hours) || hours <= 0) return null;

  const { rate24, rate12, extraHour } = vehicle;
  const lines = [];
  const notes = [];
  let amount = 0;

  const blocks = Math.floor(hours / 24 + 1e-9);
  let rem = Math.round((hours - blocks * 24) * 100) / 100;
  if (rem < 0.01) rem = 0;

  if (blocks > 0) {
    const cost = blocks * rate24;
    amount += cost;
    lines.push({ label: `${blocks} × 24-hr slot (400 km each)`, amount: cost });
  }

  if (rem > 0) {
    if (blocks === 0 && rem <= 12 && rate12) {
      amount += rate12;
      lines.push({ label: '12-hr slot (200 km)', amount: rate12 });
    } else if (blocks === 0 && rem <= 12 && !rate12) {
      amount += rate24;
      lines.push({ label: '24-hr slot (400 km)', amount: rate24 });
      notes.push('A 12-hour price is not listed for this car on the website, so the 24-hour rate is shown.');
    } else {
      // Compare "extra hours" against simply taking another 24-hour slot; show the cheaper one.
      let extraCost = null;
      let extraLabel = '';
      if (extraHour) {
        if (blocks === 0 && rate12) {
          extraCost = rate12 + Math.ceil(rem - 12) * extraHour;
          extraLabel = `12-hr slot + ${Math.ceil(rem - 12)} extra hr × ${inr(extraHour)}`;
        } else {
          extraCost = Math.ceil(rem) * extraHour;
          extraLabel = `${Math.ceil(rem)} extra hr × ${inr(extraHour)}`;
        }
      }
      if (extraCost != null && extraCost < rate24) {
        amount += extraCost;
        lines.push({ label: extraLabel, amount: extraCost });
      } else {
        amount += rate24;
        lines.push({ label: 'Additional 24-hr slot (400 km)', amount: rate24 });
        if (!extraHour) notes.push('No extra-hour charge is listed for this car, so the next 24-hour slot is shown.');
      }
    }
  }

  return { amount, lines, notes };
}
