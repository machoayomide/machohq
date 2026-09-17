// Cloud backup and sync through Supabase.
// Uses the plain REST API with fetch, so there is no SDK to bundle.
// The free tier is permanent and generous — this costs nothing to run.

import { getData, setData } from './storage';

const KEYS_TO_SYNC = [
  'appData', 'team', 'prospects', 'earnings', 'spending', 'books',
  'fiverrAccounts', 'fiverrGigs', 'journal', 'tasks', 'skills',
  'focusSessions', 'fxRates', 'userLibraryIndex', 'profile',
];

let cfgCache = null;

export async function getCloudConfig() {
  if (cfgCache) return cfgCache;
  cfgCache = (await getData('cloudConfig')) || { url: '', anonKey: '', deviceId: '', autoSync: true };
  if (!cfgCache.deviceId) {
    cfgCache.deviceId = 'dev_' + Math.random().toString(36).slice(2, 10);
    await setData('cloudConfig', cfgCache);
  }
  return cfgCache;
}

export async function saveCloudConfig(next) {
  const merged = { ...(await getCloudConfig()), ...next };
  cfgCache = merged;
  await setData('cloudConfig', merged);
  return merged;
}

export function clearCloudCache() { cfgCache = null; }

export async function isConfigured() {
  const c = await getCloudConfig();
  return !!(c.url && c.anonKey);
}

function headers(anonKey) {
  return {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Prefer: 'resolution=merge-duplicates',
  };
}

/**
 * Verifies the project is reachable and the backups table exists.
 */
export async function testConnection(url, anonKey) {
  try {
    const clean = url.replace(/\/$/, '');
    const res = await fetch(`${clean}/rest/v1/backups?select=id&limit=1`, {
      headers: headers(anonKey),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Key rejected. Check you copied the anon public key.' };
    }
    if (res.status === 404) {
      return { ok: false, error: 'Connected, but the backups table is missing. Run the setup SQL shown below.' };
    }
    if (!res.ok) return { ok: false, error: `Project returned ${res.status}.` };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach that URL. Check it and your connection.' };
  }
}

/**
 * Pushes every tracked key up as one row.
 */
export async function backupNow() {
  const cfg = await getCloudConfig();
  if (!cfg.url || !cfg.anonKey) {
    return { ok: false, error: 'Cloud backup is not set up yet.' };
  }

  const payload = {};
  for (const k of KEYS_TO_SYNC) {
    const v = await getData(k);
    if (v !== null && v !== undefined) payload[k] = v;
  }

  const body = {
    device_id: cfg.deviceId,
    data: payload,
    updated_at: new Date().toISOString(),
  };

  try {
    const clean = cfg.url.replace(/\/$/, '');
    const res = await fetch(`${clean}/rest/v1/backups?on_conflict=device_id`, {
      method: 'POST',
      headers: headers(cfg.anonKey),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, error: `Backup failed (${res.status}). ${txt.slice(0, 120)}` };
    }
    await setData('lastBackup', new Date().toISOString());
    const size = JSON.stringify(payload).length;
    return { ok: true, size, keys: Object.keys(payload).length };
  } catch {
    return { ok: false, error: 'No connection. Backup will retry next time.' };
  }
}

/**
 * Lists every backup in the project, newest first.
 */
export async function listBackups() {
  const cfg = await getCloudConfig();
  if (!cfg.url || !cfg.anonKey) return { ok: false, error: 'Not set up.' };
  try {
    const clean = cfg.url.replace(/\/$/, '');
    const res = await fetch(`${clean}/rest/v1/backups?select=device_id,updated_at&order=updated_at.desc`, {
      headers: headers(cfg.anonKey),
    });
    if (!res.ok) return { ok: false, error: `Could not list backups (${res.status}).` };
    const rows = await res.json();
    return { ok: true, rows };
  } catch {
    return { ok: false, error: 'No connection.' };
  }
}

/**
 * Pulls a backup down and writes it over local storage.
 */
export async function restoreFrom(deviceId) {
  const cfg = await getCloudConfig();
  if (!cfg.url || !cfg.anonKey) return { ok: false, error: 'Not set up.' };
  try {
    const clean = cfg.url.replace(/\/$/, '');
    const res = await fetch(
      `${clean}/rest/v1/backups?device_id=eq.${encodeURIComponent(deviceId)}&select=data,updated_at`,
      { headers: headers(cfg.anonKey) }
    );
    if (!res.ok) return { ok: false, error: `Restore failed (${res.status}).` };
    const rows = await res.json();
    if (!rows.length) return { ok: false, error: 'No backup found for that device.' };

    const payload = rows[0].data || {};
    let restored = 0;
    for (const [k, v] of Object.entries(payload)) {
      await setData(k, v);
      restored++;
    }
    return { ok: true, restored, when: rows[0].updated_at };
  } catch {
    return { ok: false, error: 'No connection.' };
  }
}

export async function lastBackupTime() {
  return await getData('lastBackup');
}

// SQL the user runs once in their Supabase SQL editor
export const SETUP_SQL = `create table if not exists backups (
  id bigserial primary key,
  device_id text unique not null,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table backups enable row level security;

create policy "anon full access"
  on backups for all
  using (true)
  with check (true);`;