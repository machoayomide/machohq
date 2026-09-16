import { COLORS } from '../theme';

export const CHALLENGE = {
  start: '2026-09-01',
  end: '2027-02-28',
  months: [
    { m: 1, name: 'Sep', target: 750, focus: 'Rebuild foundation' },
    { m: 2, name: 'Oct', target: 1000, focus: 'Senior Manager volume' },
    { m: 3, name: 'Nov', target: 1250, focus: 'Coach builders' },
    { m: 4, name: 'Dec', target: 1500, focus: 'Grow repeat sales' },
    { m: 5, name: 'Jan', target: 2000, focus: 'Executive Manager' },
    { m: 6, name: 'Feb', target: 4000, focus: 'Qualify for Director' },
  ],
};

export const PIPELINE_STAGES = [
  { name: 'Cold List', color: COLORS.t3 },
  { name: 'First Contact', color: COLORS.blue },
  { name: 'Responded', color: COLORS.primary },
  { name: 'Invited', color: COLORS.accent },
  { name: 'Attended', color: COLORS.warn },
  { name: 'Presented', color: '#ff8e53' },
  { name: 'Closing', color: COLORS.primary },
  { name: 'Joined', color: '#00cc88' },
];

export const NEWBIE_REQS = [
  { id: 'basics', label: 'Knows business basics' },
  { id: 'skills', label: 'Has 1-2+ freelancing skills' },
  { id: 'punctual', label: 'Punctual in office/training' },
  { id: 'fclass', label: 'Finished Fiverr/Upwork class' },
  { id: 'equip', label: 'Has PC and good phone' },
];

export const FOCUS_BLOCKS = [
  { id: 1, name: 'Morning', start: '06:00', end: '09:00', color: COLORS.primary },
  { id: 2, name: 'Midday', start: '09:00', end: '12:00', color: COLORS.accent },
  { id: 3, name: 'Afternoon', start: '14:00', end: '17:00', color: COLORS.blue },
  { id: 4, name: 'Night', start: '20:00', end: '23:00', color: COLORS.warn },
];

export const DEFAULT_ACTIONS = [
  { id: 1, label: 'Read 15 pages', done: false, icon: '📖' },
  { id: 2, label: 'Contact 4 prospects', done: false, icon: '📞' },
  { id: 3, label: 'Follow up 3 people', done: false, icon: '🔄' },
  { id: 4, label: '1 presentation', done: false, icon: '🎯' },
  { id: 5, label: 'Check Fiverr accounts', done: false, icon: '💼' },
  { id: 6, label: '30 min skill study', done: false, icon: '🧠' },
];

export const EARNING_FEES = { Fiverr: 0.2, Upwork: 0.1, Direct: 0 };
export const NAIRA_RATE = 1500;
// NeoLife rank ladder — SVB percentage by QPV bracket
export const SVB_TIERS = [
  { rank: 'Full Distributor', min: 250, max: 499, svb: 3 },
  { rank: 'Manager', min: 500, max: 999, svb: 5 },
  { rank: 'Senior Manager', min: 1000, max: 1999, svb: 10 },
  { rank: 'Executive Manager', min: 2000, max: 3999, svb: 15 },
  { rank: 'Director', min: 4000, max: Infinity, svb: 25 },
];

export function getTier(qpv) {
  for (let i = SVB_TIERS.length - 1; i >= 0; i--) {
    if (qpv >= SVB_TIERS[i].min) return SVB_TIERS[i];
  }
  return { rank: 'Distributor', min: 0, max: 249, svb: 0 };
}

// Product reorder cycles in days
export const REORDER_DAYS = 30;
