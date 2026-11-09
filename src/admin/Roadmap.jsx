const PHASES = [
  {
    name: 'Phase 1 — Working automation (demo data)',
    tag: 'Built',
    items: [
      ['DriveFlow API + database', 'Every enquiry is saved server-side (libSQL) and shared by the website, tracking page and this dashboard.'],
      ['Tracking references', 'Random DF-XXXXXX references issued by the server after the enquiry is saved; unique in the database.'],
      ['Automated intake', 'Rule-based extraction from free text, missing-detail questions, car suggestions and indicative estimates from published rates. No AI model connected.'],
      ['Enforced workflow', 'Nine statuses, allowed transitions only, version checks, and an audit event for every change.'],
      ['Staff accounts and roles', 'Server-side sign-in (admin, staff, read-only viewer) with signed, HttpOnly sessions.'],
      ['WhatsApp hand-off', 'Messages prepared from templates and opened in WhatsApp for staff to send; recorded as hand-offs, not deliveries. Meta Cloud API adapter ready but not connected.'],
    ],
  },
  {
    name: 'Phase 2 — Business integration',
    tag: 'Needs Aman',
    items: [
      ['Verified fleet information', 'Needs: the owner’s actual fleet list, registration-level variants, seating, fuel, transmission and photos they approve.'],
      ['Actual pricing rules', 'Needs: decision on 12/24-hr slots, extra-hour and overrun billing, multi-day and monthly rates, deposits, kilometre overage, seasonal rates.'],
      ['Staff-controlled availability', 'Needs: a process for staff to mark cars booked/serviced, or read from their existing records. Without it, availability cannot be shown.'],
      ['Hosted production database', 'Needs: approval to provision a hosted database (e.g. Turso), backups, and a privacy policy for customer data. Staff accounts and roles already exist.'],
      ['Authorised WhatsApp Business integration', 'Needs: a Meta Business account and verified number or a Business Solution Provider, API credentials, approved message templates, customer opt-in, per-conversation fees. The business’s current number would have to be migrated or a new one used — Aman must decide.'],
      ['Real booking notifications', 'Needs: the above WhatsApp access or an email/SMS provider, plus who in the team gets alerted and when.'],
    ],
  },
  {
    name: 'Phase 3 — Advanced automation',
    tag: 'Later',
    items: [
      ['Automated enquiry notifications', 'Workflow hooks exist; needs Phase 2 WhatsApp access and Aman’s approval of template wording.'],
      ['Booking reminders', 'Needs: reliable booking records and approved reminder templates.'],
      ['Customer follow-ups', 'Needs: opt-in consent and agreed follow-up rules (when, how often).'],
      ['Cancellation and rescheduling workflows', 'Needs: the business’s cancellation and refund policy, which is not published and must come from Aman.'],
      ['Reporting and analytics', 'Needs: historical booking data and agreement on which numbers matter.'],
    ],
  },
];

export default function Roadmap() {
  return (
    <div className="stack">
      <h2>From demo to production</h2>
      <div className="notice">
        None of the Phase 2 or Phase 3 items can be switched on without Aman Self Drive’s permission, data and, for WhatsApp, an approved business
        account. This page is part of the concept pitch and carries no commitment.
      </div>
      <div className="roadmap">
        {PHASES.map((p) => (
          <div className="card phase" key={p.name}>
            <div className="row spread">
              <h3>{p.name}</h3>
              <span className={p.tag === 'Built' ? 'tag-now' : 'tag-later'}>{p.tag}</span>
            </div>
            <ul>
              {p.items.map(([t, d]) => (
                <li key={t}><strong>{t}</strong><small>{d}</small></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 8 }}>What is simulated today</h3>
        <ul style={{ margin: 0, paddingLeft: 18 }} className="small">
          <li>No live fleet availability; “visible in catalogue” is not “available”.</li>
          <li>No automatic confirmation; only staff change statuses.</li>
          <li>No payments.</li>
          <li>No WhatsApp Business API: messages are hand-off links that a person sends.</li>
          <li>No AI model: intake is rule-based and always checked by deterministic validation.</li>
          <li>No connection to Aman Self Drive’s own systems or booking records; enquiries marked Demo are fictional.</li>
        </ul>
      </div>
    </div>
  );
}
