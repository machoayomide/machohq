import * as FileSystem from 'expo-file-system';
import { getData, setData } from './storage';

const LIB_DIR = FileSystem.documentDirectory + 'library/';
const INDEX_KEY = 'userLibraryIndex';

// Keep each stored document under this so search stays fast on a phone
const MAX_CHARS_PER_DOC = 60000;
const CHUNK_SIZE = 2000;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(LIB_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LIB_DIR, { intermediates: true });
  }
}

export async function getLibraryIndex() {
  return (await getData(INDEX_KEY)) || [];
}

async function saveIndex(index) {
  await setData(INDEX_KEY, index);
}

/**
 * Splits text into overlapping chunks so a search hit near a boundary
 * still returns readable context.
 */
function chunkText(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  for (let i = 0; i < clean.length; i += CHUNK_SIZE - 200) {
    chunks.push(clean.slice(i, i + CHUNK_SIZE));
    if (chunks.length > 40) break; // hard ceiling per document
  }
  return chunks;
}

/**
 * Saves extracted text as a document in the user's library.
 * Returns the index entry.
 */
export async function addDocument({ title, type, text, source }) {
  await ensureDir();
  const trimmed = (text || '').slice(0, MAX_CHARS_PER_DOC);
  if (trimmed.length < 50) {
    throw new Error('Could not read enough text from that file.');
  }

  const id = String(Date.now());
  const chunks = chunkText(trimmed);
  const path = LIB_DIR + id + '.json';

  await FileSystem.writeAsStringAsync(path, JSON.stringify({ id, title, chunks }));

  const index = await getLibraryIndex();
  const entry = {
    id,
    title: title || 'Untitled',
    type: type || 'document',
    source: source || 'upload',
    chars: trimmed.length,
    chunks: chunks.length,
    added: new Date().toISOString().slice(0, 10),
    path,
  };
  await saveIndex([...index, entry]);
  return entry;
}

export async function deleteDocument(id) {
  const index = await getLibraryIndex();
  const entry = index.find(e => e.id === id);
  if (entry) {
    try { await FileSystem.deleteAsync(entry.path, { idempotent: true }); } catch {}
  }
  await saveIndex(index.filter(e => e.id !== id));
}

async function loadChunks(entry) {
  try {
    const raw = await FileSystem.readAsStringAsync(entry.path);
    return JSON.parse(raw).chunks || [];
  } catch {
    return [];
  }
}

const STOP = new Set(['what','when','where','which','this','that','they','them',
  'with','from','have','been','will','would','could','should','about','their',
  'there','your','you','the','and','for','are','but','how','can','get','got',
  'some','more','very','just','like','does','doing','make','need']);

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 3 && !STOP.has(w));
}

function countMatches(hay, needle) {
  let c = 0, i = hay.indexOf(needle);
  while (i !== -1) { c++; i = hay.indexOf(needle, i + needle.length); }
  return c;
}

/**
 * Searches every uploaded document and returns the best matching chunks.
 */
export async function searchUserLibrary(query, maxChunks = 3) {
  const keywords = tokenize(query);
  if (keywords.length === 0) return [];

  const index = await getLibraryIndex();
  if (index.length === 0) return [];

  const scored = [];
  for (const entry of index) {
    const chunks = await loadChunks(entry);
    chunks.forEach((chunk, ci) => {
      const lower = chunk.toLowerCase();
      let score = 0;
      for (const kw of keywords) score += countMatches(lower, kw);
      for (const kw of keywords) score += countMatches(entry.title.toLowerCase(), kw) * 4;
      if (score > 0) scored.push({ title: entry.title, chunk, score, docId: entry.id, ci });
    });
  }

  scored.sort((a, b) => b.score - a.score);

  // Avoid returning several chunks from the same document
  const seen = new Set();
  const picked = [];
  for (const r of scored) {
    if (picked.length >= maxChunks) break;
    if (seen.has(r.docId) && picked.length < maxChunks - 1) continue;
    seen.add(r.docId);
    picked.push(r);
  }
  return picked;
}

/**
 * Formats uploaded-library hits for an AI prompt.
 */
export async function buildUserContext(query) {
  const hits = await searchUserLibrary(query, 3);
  if (hits.length === 0) return '';
  let out = '\n\nFROM YOUR OWN UPLOADED MATERIAL (apply naturally, do not cite):\n';
  for (const h of hits) {
    out += `\n--- ${h.title} ---\n${h.chunk.slice(0, 900)}\n`;
  }
  return out;
}

export async function libraryStats() {
  const index = await getLibraryIndex();
  const totalChars = index.reduce((s, e) => s + (e.chars || 0), 0);
  return { count: index.length, totalChars, index };
}