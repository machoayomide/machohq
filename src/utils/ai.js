// Central AI caller. Reads the user's own Anthropic API key from storage.
// Inside Claude's artifact preview the key is injected automatically; in a
// real APK there is no key, so the user must supply one in Settings.

import { getData } from './storage';

let cachedKey = null;

export async function getApiKey() {
  if (cachedKey !== null) return cachedKey;
  cachedKey = (await getData('anthropicKey')) || '';
  return cachedKey;
}

export function clearKeyCache() { cachedKey = null; }

export async function hasApiKey() {
  const k = await getApiKey();
  return !!(k && k.startsWith('sk-'));
}

/**
 * Calls Claude. Returns { ok, text, error }.
 * Never throws — callers can render error text directly.
 */
export async function askClaude(prompt, { maxTokens = 800, webSearch = false } = {}) {
  const key = await getApiKey();

  if (!key) {
    return {
      ok: false,
      text: '',
      error: 'No API key set. Open HQ → Settings → AI Key and paste your Anthropic key to turn on the AI features.',
    };
  }

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };
  if (webSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      return { ok: false, text: '', error: 'API key rejected. Check it in Settings — it should start with sk-ant-.' };
    }
    if (res.status === 429) {
      return { ok: false, text: '', error: 'Rate limited. Wait a moment and try again.' };
    }
    if (res.status === 400) {
      const j = await res.json().catch(() => ({}));
      return { ok: false, text: '', error: `Request rejected: ${j?.error?.message || 'bad request'}` };
    }
    if (!res.ok) {
      return { ok: false, text: '', error: `Server returned ${res.status}. Try again shortly.` };
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    if (!text) return { ok: false, text: '', error: 'Empty response. Try rephrasing.' };
    return { ok: true, text, error: null };
  } catch (e) {
    return { ok: false, text: '', error: 'No internet connection, or the request was blocked.' };
  }
}
