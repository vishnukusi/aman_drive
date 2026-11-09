import { STATUS_META } from '../api/client.js';

export const StatusPill = ({ status }) => (
  <span className={`badge ${STATUS_META[status]?.tone || 'grey'}`}>{STATUS_META[status]?.label || status}</span>
);

const SOURCE = {
  'website-wizard': 'Trip planner',
  'website-quick': 'Quick form',
  'vehicle-card': 'Car card',
  'chat-intake': 'Free text',
  'demo-seed': 'Demo',
  staff: 'Staff',
  website: 'Website',
};
export const SourceTag = ({ source }) => <span className="src-tag">{SOURCE[source] || source}</span>;

export const actorLabel = (a) => {
  if (!a) return '';
  if (a === 'customer') return 'Customer';
  if (a === 'system:intake') return 'DriveFlow intake';
  if (a === 'system:workflow') return 'DriveFlow workflow';
  if (a === 'system:notify') return 'DriveFlow notifications';
  if (a.startsWith('staff:')) return `Staff · ${a.slice(6)}`;
  return a;
};
