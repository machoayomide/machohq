// Multi-provider AI. The app does not care which model answers — it asks for
// text and gets text back. Gemini is the default because its free tier is
// genuinely free and includes web search grounding.

import { getData } from './storage';

let cache = { provider: null, keys: {} };

export const PROVIDERS = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Free',
    model: 'gemini-2.0-flash',
    keyPrefix: 'AIza',
    keyUrl: 'https://aistudio.google.com/apikey',
    cost: 'Free — 1,500 requests a day, no card needed',
    webSearch: true,
    notes: 'Best choice unless you already pay for something else.',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    badge: 'Free',
    model: 'llama-3.3-70b-versatile',
    keyPrefix: 'gsk_',
    keyUrl: 'https://console.groq.com/keys',
    cost: 'Free tier, very fast',
    webSearch: false,
    notes: 'Fastest replies, but cannot search the web. Research will be weaker.',
  },
  openai: {
    id: 'openai',
    name: 'ChatGPT (OpenAI)',
    badge: 'Cheap',
    model: 'gpt-4o-mini',
    keyPrefix: 'sk-',
    keyUrl: 'https://platform.openai.com/api-keys',
    cost: 'Roughly $1-2 a month at normal use',
    webSearch: false,
    notes: 'A ChatGPT Plus subscription does NOT include this — API credit is separate and billed by usage.',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Free models',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    keyPrefix: 'sk-or-',
    keyUrl: 'https://openrouter.ai/keys',
    cost: 'Several models free, paid ones available',
    webSearch: false,
    notes: 'One key, many models. Free models are rate limited.',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    badge: 'Paid',
    model: 'claude-sonnet-4-6',
    keyPrefix: 'sk-ant-',
    keyUrl: 'https://console.anthropic.com',
    cost: 'Roughly $8-15 a month at normal use',
    webSearch: true,
    notes: 'Best quality. A Claude Pro subscription does NOT include this — API credit is separate.',
  },
};

export async function getProvider() {
  if (cache.provider) return cache.provider;
  cache.provider = (await getData('aiProvider')) || 'gemini';
  return cache.provider;
}

export async function getKey(providerId) {
  const id = providerId || (await getProvider());
  if (cache.keys[id] !== undefined) return cache.keys[id];
  cache.keys[id] = (await getData(`aiKey_${id}`)) || '';
  return cache.keys[id];
}

export function clearKeyCache() { cache = { provider: null, keys: {} }; }

export async function hasApiKey() {
  const id = await getProvider();
  const k = await getKey(id);
  return !!(k && k.length > 10);
}

export async function activeProviderInfo() {
  const id = await getProvider();
  const key = await getKey(id);
  return { ...PROVIDERS[id], hasKey: !!(key && key.length > 10) };
}

// ─── Provider calls ───

async function callGemini(key, prompt, maxTokens, webSearch) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  };
  if (webSearch) body.tools = [{ google_search: {} }];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${PROVIDERS.gemini.model}:generateContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  if (res.status === 400) return { ok: false, error: 'Gemini rejected the key. Check it in Settings.' };
  if (res.status === 429) return { ok: false, error: 'Free tier limit hit. Wait a minute and try again.' };
  if (!res.ok) return { ok: false, error: `Gemini returned ${res.status}.` };

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
  if (!text) return { ok: false, error: 'Empty response. Try rephrasing.' };
  return { ok: true, text };
}

async function callOpenAICompatible(url, key, model, prompt, maxTokens, extraHeaders = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, ...extraHeaders },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  });

  if (res.status === 401) return { ok: false, error: 'Key rejected. Note that a Plus or Pro subscription is not API credit — the key must come from the developer platform.' };
  if (res.status === 429) return { ok: false, error: 'Rate limited, or your account has no credit. Check your billing on the provider site.' };
  if (!res.ok) return { ok: false, error: `Server returned ${res.status}.` };

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) return { ok: false, error: 'Empty response. Try rephrasing.' };
  return { ok: true, text };
}

async function callClaude(key, prompt, maxTokens, webSearch) {
  const body = {
    model: PROVIDERS.claude.model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };
  if (webSearch) body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];

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

  if (res.status === 401) return { ok: false, error: 'Claude key rejected. Note that a Pro subscription is not API credit.' };
  if (res.status === 429) return { ok: false, error: 'Rate limited. Wait a moment.' };
  if (res.status === 400) {
    const j = await res.json().catch(() => ({}));
    return { ok: false, error: j?.error?.message || 'Request rejected.' };
  }
  if (!res.ok) return { ok: false, error: `Claude returned ${res.status}.` };

  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (!text) return { ok: false, error: 'Empty response.' };
  return { ok: true, text };
}

/**
 * Single entry point. Returns { ok, text, error }. Never throws.
 */
export async function askClaude(prompt, { maxTokens = 800, webSearch = false } = {}) {
  const providerId = await getProvider();
  const provider = PROVIDERS[providerId] || PROVIDERS.gemini;
  const key = await getKey(providerId);

  if (!key) {
    return {
      ok: false,
      text: '',
      error: `No ${provider.name} key set. Open More → Settings → AI and add one. ${provider.name} is free to use.`,
    };
  }

  const useSearch = webSearch && provider.webSearch;

  try {
    let result;
    if (providerId === 'gemini') {
      result = await callGemini(key, prompt, maxTokens, useSearch);
    } else if (providerId === 'groq') {
      result = await callOpenAICompatible('https://api.groq.com/openai/v1/chat/completions', key, provider.model, prompt, maxTokens);
    } else if (providerId === 'openai') {
      result = await callOpenAICompatible('https://api.openai.com/v1/chat/completions', key, provider.model, prompt, maxTokens);
    } else if (providerId === 'openrouter') {
      result = await callOpenAICompatible('https://openrouter.ai/api/v1/chat/completions', key, provider.model, prompt, maxTokens, {
        'HTTP-Referer': 'https://machohq.app', 'X-Title': 'MachoHQ',
      });
    } else {
      result = await callClaude(key, prompt, maxTokens, useSearch);
    }

    if (!result.ok) return { ok: false, text: '', error: result.error };

    // Warn when research ran without real search
    if (webSearch && !provider.webSearch) {
      return {
        ok: true,
        text: result.text + `\n\n---\nNote: ${provider.name} cannot search the web, so this is from training data and may be out of date. Switch to Gemini in Settings for live results.`,
        error: null,
      };
    }
    return { ok: true, text: result.text, error: null };
  } catch {
    return { ok: false, text: '', error: 'No internet connection, or the request was blocked.' };
  }
}

// Verifies a key actually works before saving it
export async function testKey(providerId, key) {
  const provider = PROVIDERS[providerId];
  if (!provider) return { ok: false, error: 'Unknown provider' };
  try {
    let r;
    if (providerId === 'gemini') r = await callGemini(key, 'Reply with the single word: working', 20, false);
    else if (providerId === 'groq') r = await callOpenAICompatible('https://api.groq.com/openai/v1/chat/completions', key, provider.model, 'Reply with the single word: working', 20);
    else if (providerId === 'openai') r = await callOpenAICompatible('https://api.openai.com/v1/chat/completions', key, provider.model, 'Reply with the single word: working', 20);
    else if (providerId === 'openrouter') r = await callOpenAICompatible('https://openrouter.ai/api/v1/chat/completions', key, provider.model, 'Reply with the single word: working', 20, { 'HTTP-Referer': 'https://machohq.app', 'X-Title': 'MachoHQ' });
    else r = await callClaude(key, 'Reply with the single word: working', 20, false);
    return r;
  } catch {
    return { ok: false, error: 'Could not reach the provider. Check your connection.' };
  }
}
