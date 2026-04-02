'use strict';

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

function getEnv(name, required = true) {
  const v = process.env[name];
  if (required && (!v || v.length === 0)) {
    console.error(`[config] Missing env ${name}`);
  }
  return v;
}

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');
const OPENAI_API_KEY = getEnv('OPENAI_API_KEY');
const NEWSDATA_API_KEY = getEnv('NEWSDATA_API_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_CALLS_PER_WINDOW = 2;
let windowStart = Date.now();
let callsInWindow = 0;

function checkRateLimit() {
  const now = Date.now();
  if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
    windowStart = now;
    callsInWindow = 0;
  }
  if (callsInWindow >= MAX_CALLS_PER_WINDOW) {
    const waitMs = RATE_LIMIT_WINDOW_MS - (now - windowStart);
    throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(waitMs / 1000)}s`);
  }
  callsInWindow += 1;
}

const FUTURISTIC_PROMPT = `You are a witty futuristic news editor from the year 2100. Transform this current news headline into an entertaining sci-fi scenario that could happen in 2100.

Original headline: "{headline}"
Original description: "{description}"

Create a futuristic version that:
1. Takes the core concept and extrapolates it 100 years into the future with wild imagination
2. Adds advanced sci-fi elements (AI consciousness, quantum teleportation, intergalactic travel, neural interfaces, etc.)
3. Makes it genuinely funny and entertaining - think "what if this happened in 2100?"
4. References the original news in a clever way that makes readers smile
5. Uses creative futuristic language and concepts
6. Keeps the original context recognizable but with a 2100 twist

Format your response as:
TITLE: [creative futuristic title with humor]
CAPTION: [one witty sentence explaining the 2100 scenario while cleverly referencing the original news]`;

async function transformHeadline(headline, description = '') {
  try {
    checkRateLimit();
    const prompt = FUTURISTIC_PROMPT
      .replace('{headline}', headline)
      .replace('{description}', description);

    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a witty futuristic news editor from 2100. You transform current news into humorous sci-fi scenarios while keeping the original context clear.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.8,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        timeout: 60_000,
      }
    );

    const content = res.data?.choices?.[0]?.message?.content || '';
    const titleMatch = content.match(/TITLE:\s*(.+)/);
    const captionMatch = content.match(/CAPTION:\s*(.+)/);
    // Clamp lengths to keep UI sane
    const rawTitle = titleMatch ? titleMatch[1].trim() : headline;
    const rawCaption = captionMatch ? captionMatch[1].trim() : 'If Humanity skipped a Century...';
    const title = rawTitle.length > 180 ? `${rawTitle.slice(0, 180)}…` : rawTitle;
    // Limit caption to ~28 words
    const words = rawCaption.split(/\s+/);
    const caption = words.length > 28 ? `${words.slice(0, 28).join(' ')}…` : rawCaption;
    return { title, caption };
  } catch (err) {
    if (err?.message?.includes('Rate limit exceeded')) {
      console.warn('[openai] rate limit — using fallback transformation');
      return {
        title: `${headline} (2100 Edition)`,
        caption: 'In the year 2100, this news would be even more amazing!'
      };
    }
    console.warn('[openai] error, using graceful fallback:', err?.message || err);
    // Provide a short safe fallback caption
    return {
      title: headline.length > 180 ? `${headline.slice(0, 180)}…` : headline,
      caption: 'From today\'s temporal feed.'
    };
  }
}

async function fetchNewsFromAPI() {
  try {
    const res = await axios.get('https://newsdata.io/api/1/news', {
      params: { apikey: NEWSDATA_API_KEY, language: 'en', size: 10 },
      timeout: 30_000,
    });
    return Array.isArray(res.data?.results) ? res.data.results.slice(0, 10) : [];
  } catch (err) {
    console.warn('[newsdata] fetch failed, returning empty list');
    return [];
  }
}

async function transformArticles(articles) {
  const out = [];
  for (let idx = 0; idx < articles.length; idx += 1) {
    const a = articles[idx] || {};
    const originalTitle = a.title || '';
    const description = a.description || a.content || '';
    const url = a.link || '';
    const publishedAt = a.pubDate || new Date().toISOString();
    const sourceName = a.source_name || 'Unknown';

    console.log(`[transform] ${idx + 1}/${articles.length}: ${originalTitle.slice(0, 80)}`);
    const t = await transformHeadline(originalTitle, description);
    out.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      originalTitle,
      futuristicTitle: t.title,
      futuristicCaption: t.caption,
      source: sourceName,
      category: 'General',
      publishedAt,
      link: url,
      description,
    });
    await new Promise((r) => setTimeout(r, 30_000));
  }
  return out;
}

async function upsertForToday(articles) {
  const date = new Date().toISOString().split('T')[0];
  console.log(`[supabase] upserting ${articles.length} articles for ${date}`);
  const { error } = await supabase
    .from('news')
    .upsert({
      date,
      articles,
      no_data: articles.length === 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'date' });
  if (error) throw error;
  return date;
}

async function main() {
  try {
    console.log('=== Update News: START ===');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Missing Supabase configuration');
    if (!NEWSDATA_API_KEY) console.warn('[config] NEWSDATA_API_KEY is not set');
    if (!OPENAI_API_KEY) console.warn('[config] OPENAI_API_KEY is not set');

    const raw = await fetchNewsFromAPI();
    console.log(`[newsdata] fetched ${raw.length} raw articles`);
    if (raw.length === 0) {
      const date = await upsertForToday([]);
      console.log(`[result] no articles fetched; upserted empty set for ${date}`);
      console.log('=== Update News: DONE ===');
      return;
    }

    const transformed = await transformArticles(raw);
    console.log(`[transform] completed: ${transformed.length} articles`);
    const date = await upsertForToday(transformed);
    console.log(`[result] upserted ${transformed.length} items for ${date}`);
    console.log('=== Update News: DONE ===');
  } catch (err) {
    console.error('[fatal] update failed:', err?.message || err);
    process.exit(1);
  }
}

main();


