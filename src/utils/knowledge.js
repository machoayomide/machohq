// Knowledge base search — finds relevant book excerpts to ground AI answers.
// Metro bundler cannot resolve dynamic require() paths, so all 56 books are
// bundled into one static module (src/data/knowledgeBase.js).

import { BOOKS } from '../data/knowledgeBase';

const TOPIC_MAP = {
  prospect: ['Go_Pro', 'Go_for_No', 'Happy_Network', 'Psychology_of_Selling', 'To_Sell_Is_Human'],
  prospecting: ['Go_Pro', 'Go_for_No', 'Happy_Network', 'Psychology_of_Selling'],
  objection: ['Go_for_No', 'Getting_to_Yes', 'You_Can_Negotiate', 'Psychology_of_Selling'],
  objections: ['Go_for_No', 'Getting_to_Yes', 'You_Can_Negotiate'],
  reject: ['Go_for_No', 'Failing_Forward', 'No_Excuses'],
  leadership: ['21_Irrefutable', '5_Levels', '360_Degree', 'Developing_the_Leader', 'Leaders_Eat_Last'],
  leader: ['21_Irrefutable', '5_Levels', '360_Degree', 'Developing_the_Leader'],
  mindset: ['Attitude_101', 'Failing_Forward', 'No_Excuses', 'Self-Improvement'],
  attitude: ['Attitude_101', 'Self-Improvement'],
  selling: ['Psychology_of_Selling', 'To_Sell_Is_Human', 'Zero_to_100'],
  sales: ['Psychology_of_Selling', 'To_Sell_Is_Human', 'Zero_to_100'],
  closing: ['Psychology_of_Selling', 'Getting_to_Yes', 'To_Sell_Is_Human'],
  team: ['TEAM_Winning', 'Leaders_Eat_Last', 'Surrounded_by_Idiots', 'Everyone_Communicates'],
  coaching: ['Developing_the_Leader', '360_Degree', 'Everyone_Communicates'],
  discipline: ['Eat_that_Frog', 'No_Excuses', 'Now_Habit', 'Do_the_Work'],
  procrastination: ['Eat_that_Frog', 'Now_Habit', 'Do_the_Work'],
  goal: ['Goals', 'Maximum_Achievement', 'Put_Your_Dream', 'Make_Today_Count'],
  goals: ['Goals', 'Maximum_Achievement', 'Put_Your_Dream'],
  network: ['Go_Pro', 'Happy_Network', 'Be_a_People_Person', 'How_to_Influence'],
  networking: ['Go_Pro', 'Happy_Network', 'Be_a_People_Person'],
  negotiate: ['Getting_to_Yes', 'You_Can_Negotiate'],
  negotiation: ['Getting_to_Yes', 'You_Can_Negotiate'],
  confidence: ['Power_of_Self-Confidence', 'Attitude_101', 'Self-Improvement'],
  marketing: ['Marketing_Management', '22_Immutable', '80_20_Principle'],
  time: ['Eat_that_Frog', 'Now_Habit', 'Make_Today_Count', 'High_Output'],
  productivity: ['Eat_that_Frog', 'High_Output', 'Now_Habit', '80_20_Principle'],
  people: ['Be_a_People_Person', 'Winning_With_People', 'How_to_Influence', 'Everyone_Communicates'],
  influence: ['How_to_Influence', 'Art_of_Seduction', 'Laws_of_Human_Nature'],
  money: ['Rich_Dad', 'Richest_Man', '100_Absolutely_Unbreakable'],
  budget: ['Rich_Dad', 'Richest_Man', '80_20_Principle'],
  failure: ['Failing_Forward', 'No_Excuses', 'Sometimes_You_Win'],
  motivation: ['No_Excuses', 'Attitude_101', 'Maximum_Achievement'],
};

const STOP_WORDS = new Set([
  'what','when','where','which','this','that','they','them','with','from',
  'have','been','will','would','could','should','about','their','there',
  'your','you','the','and','for','are','but','how','can','get','got',
  'some','more','very','just','like','does','doing','make','need',
]);

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
}

function countMatches(haystack, needle) {
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) { count++; idx = haystack.indexOf(needle, idx + needle.length); }
  return count;
}

export function searchKnowledge(query, maxResults = 3) {
  const keywords = tokenize(query);
  if (keywords.length === 0) return [];
  const scored = [];
  for (const book of BOOKS) {
    const ex = book.excerpt.toLowerCase();
    const ti = book.title.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      score += countMatches(ex, kw);
      score += countMatches(ti, kw) * 5;
    }
    for (const kw of keywords) {
      const hints = TOPIC_MAP[kw];
      if (hints && hints.some(h => book.slug.includes(h))) score += 15;
    }
    if (score > 0) scored.push({ ...book, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}

export function buildKnowledgeContext(query) {
  const results = searchKnowledge(query, 3);
  if (results.length === 0) return '';
  let context = '\n\nWISDOM FROM YOUR LIBRARY (apply naturally, do not cite or quote):\n';
  for (const r of results) {
    context += `\n--- From "${r.title}" ---\n${r.excerpt.slice(0, 900)}\n`;
  }
  return context;
}

export function getBookCount() { return BOOKS.length; }
export function listBooks() { return BOOKS.map(b => ({ slug: b.slug, title: b.title, pages: b.pages })); }
export { BOOKS };
