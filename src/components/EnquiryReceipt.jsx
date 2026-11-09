import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { CITY_LABEL, fmtDay } from '../api/client.js';
import { CONFIG } from '../config.js';

/**
 * Shown only after the API has saved the enquiry (the reference comes from the server response).
 * The WhatsApp button is a hand-off the customer sends themselves; it is labelled that way.
 */
export default function EnquiryReceipt({ created, onReset }) {
  const e = created.enquiry;
  const waText = `Hi Aman Self Drive, I submitted enquiry ${created.reference} on your website (${e.vehicle || 'car to be chosen'}${e.city ? `, ${e.city}` : ''}${e.pickupDate ? `, ${fmtDay(e.pickupDate)}` : ''}). Please confirm availability and the final price.`;
  return (
    <div className="receipt" role="status" aria-live="polite">
      <div className="receipt-head">
        <div className="enq-done-icon"><Icon name="check" size={28} /></div>
        <div>
          <small>Enquiry saved · tracking reference</small>
          <div className="ref-code">{created.reference}</div>
        </div>
      </div>
      <dl className="kv receipt-kv">
        <dt>Status</dt><dd><b>{e.statusLabel}</b></dd>
        <dt>Car</dt><dd>{e.vehicle || <span className="muted">Not chosen yet</span>}</dd>
        <dt>Pickup city</dt><dd>{e.city || CITY_LABEL[created.draftCity] || <span className="muted">Not given yet</span>}</dd>
        <dt>Dates</dt><dd>{e.pickupDate ? `${fmtDay(e.pickupDate)} → ${fmtDay(e.returnDate)}` : <span className="muted">Not given yet</span>}</dd>
        {created.estimate && (<><dt>Indicative</dt><dd>₹{created.estimate.amount.toLocaleString('en-IN')} <span className="muted small">(published rates, before fuel & tolls)</span></dd></>)}
      </dl>
      <p className="next-step"><Icon name="info" size={16} /> {e.next}</p>
      {created.questions?.length > 0 && (
        <ul className="questions">{created.questions.map((q) => <li key={q.field}>{q.question}</li>)}</ul>
      )}
      <div className="row" style={{ marginTop: 14 }}>
        <Link className="btn btn-primary" to={created.trackPath}>Track this enquiry <Icon name="arrow" size={16} /></Link>
        <a className="btn btn-wa" href={`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
          <Icon name="whatsapp" size={18} /> Message Aman on WhatsApp
        </a>
      </div>
      <p className="hint" style={{ marginTop: 10 }}>
        Keep your tracking link private: it shows your enquiry status. Nothing is booked until the Aman team confirms.
        {e.isDemo ? ' (Demo data)' : ''}
      </p>
      {onReset && <button type="button" className="linkish" style={{ paddingLeft: 0, marginTop: 6 }} onClick={onReset}>Start another enquiry</button>}
    </div>
  );
}
