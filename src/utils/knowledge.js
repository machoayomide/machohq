// Knowledge base search - finds relevant book excerpts for AI context
// In production this would be a vector database (ChromaDB/Pinecone)
// For now we do keyword matching against stored excerpts

import catalog from '../data/knowledge/_catalog.json';

// Load all book data lazily
const bookCache = {};

async function loadBook(slug) {
  if (bookCache[slug]) return bookCache[slug];
  try {
    // In production: fetch from API/vector DB
    // For now: books are bundled as JSON assets
    const data = require(`../data/knowledge/${slug}.json`);
    bookCache[slug] = data;
    return data;
  } catch {
    return null;
  }
}

// Simple keyword relevance scoring
function scoreRelevance(text, keywords) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    const regex = new RegExp(kw.toLowerCase(), 'g');
    const matches = lower.match(regex);
    if (matches) score += matches.length;
  }
  return score;
}

// Search knowledge base for relevant excerpts
export async function searchKnowledge(query, maxResults = 3) {
  const keywords = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);

  if (keywords.length === 0) return [];

  // Map topic keywords to likely relevant books
  const topicMap = {
    prospect: ['Go_Pro', 'Go_for_No', 'Happy_Network', 'Psychology_of_Selling', 'To_Sell_Is_Human'],
    objection: ['Go_for_No', 'Getting_to_Yes', 'You_Can_Negotiate', 'Psychology_of_Selling'],
    leadership: ['21_Irrefutable', '5_Levels', '360_Degree', 'Developing_the_Leader'],
    mindset: ['Attitude_101', 'Failing_Forward', 'No_Excuses', 'Self-Improvement_101'],
    selling: ['Psychology_of_Selling', 'To_Sell_Is_Human', 'Extremely_Successful', 'Zero_to_100'],
    team: ['TEAM_Winning', 'Leaders_Eat_Last', 'Surrounded_by_Idiots', 'Everyone_Communicates'],
    discipline: ['Eat_that_Frog', 'No_Excuses', 'Now_Habit', 'Do_the_Work'],
    goal: ['Goals', 'Maximum_Achievement', 'Put_Your_Dream', 'Make_Today_Count'],
    network: ['Go_Pro', 'Happy_Network', 'Be_a_People_Person', 'How_to_Influence'],
    negotiate: ['Getting_to_Yes', 'You_Can_Negotiate', 'Art_of_Seduction'],
    confidence: ['Power_of_Self-Confidence', 'Attitude_101', 'Self-Improvement_101'],
    marketing: ['Marketing_Management', '22_Immutable', '80_20_Principle'],
    time: ['Eat_that_Frog', 'Now_Habit', 'Make_Today_Count', 'High_Output'],
    people: ['Be_a_People_Person', 'Winning_With_People', 'How_to_Influence', 'Everyone_Communicates'],
    money: ['Rich_Dad', 'Richest_Man', '100_Absolutely_Unbreakable'],
  };

  const results = [];

  for (const entry of catalog) {
    const book = await loadBook(entry.slug);
    if (!book || !book.excerpt) continue;

    let score = scoreRelevance(book.excerpt, keywords);
    score += scoreRelevance(book.title, keywords) * 3; // title matches worth more

    // Boost books that match topic categories
    for (const [topic, slugParts] of Object.entries(topicMap)) {
      if (keywords.some(k => k.includes(topic) || topic.includes(k))) {
        if (slugParts.some(sp => entry.slug.includes(sp))) {
          score += 10;
        }
      }
    }

    if (score > 0) {
      results.push({ ...entry, score, excerpt: book.excerpt });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}

// Build context string from search results for AI prompt
export async function buildKnowledgeContext(query) {
  const results = await searchKnowledge(query, 3);
  if (results.length === 0) return '';

  let context = '\n\nRELEVANT KNOWLEDGE FROM YOUR LIBRARY:\n';
  for (const r of results) {
    // Take first 800 chars of excerpt for context
    context += `\n[${r.title}]: ${r.excerpt.slice(0, 800)}...\n`;
  }
  return context;
}

export { catalog };