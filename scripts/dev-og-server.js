// Local-only OG image server for development.
// Safe: does not affect production API routes.
// Usage:
//   node scripts/dev-og-server.js
//   OPEN http://localhost:3070/og?date=YYYY-MM-DD

/* eslint-disable */
const express = require('express');
const React = require('react');
const { ImageResponse } = require('@vercel/og');

const PORT = process.env.OG_DEV_PORT ? Number(process.env.OG_DEV_PORT) : 3070;

function toDateString(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function fetchLatestDate() {
  const baseUrl = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!baseUrl || !anon) return null;
  try {
    const url = `${baseUrl}/rest/v1/news?select=date&order=date.desc&limit=1`;
    const res = await fetch(url, { headers: { apikey: anon, Authorization: `Bearer ${anon}` }, cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const row = Array.isArray(json) ? json[0] : json;
    return row?.date || null;
  } catch {
    return null;
  }
}

async function fetchArticles(dateString) {
  const baseUrl = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!baseUrl || !anon) return [];
  try {
    const url = `${baseUrl}/rest/v1/news?select=articles&date=eq.${dateString}`;
    const res = await fetch(url, { headers: { apikey: anon, Authorization: `Bearer ${anon}` }, cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    const row = Array.isArray(json) ? json[0] : json;
    return row?.articles || [];
  } catch {
    return [];
  }
}

function buildImage({ date, titles }) {
  const future = new Date(Date.UTC(date.getUTCFullYear() + 100, date.getUTCMonth(), date.getUTCDate()));

  const bg = '#ffffff';
  const text = '#000000';
  const subtext = '#666666';
  const accent = '#00FF88';
  const net = '#8a8f98';
  const e = React.createElement;

  const netSvg = e('svg', { width: 1200, height: 630, style: { position: 'absolute', inset: 0, zIndex: 0 } },
    (() => {
      const elements = [];
      let seed = 2100;
      const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      const num = 140; const pad = 12;
      const pts = Array.from({ length: num }, () => ({ x: pad + rand() * (1200 - pad * 2), y: pad + rand() * (630 - pad * 2) }));
      const k = 3; const maxDist = 240;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const distances = [];
        for (let j = 0; j < pts.length; j++) {
          if (i === j) continue;
          const b = pts[j];
          const dx = a.x - b.x; const dy = a.y - b.y; const d = Math.hypot(dx, dy);
          distances.push([j, d]);
        }
        distances.sort((m, n) => m[1] - n[1]);
        for (let n = 0; n < k; n++) {
          const [j, d] = distances[n]; if (d > maxDist) continue;
          const b = pts[j]; const opacity = 0.08 + (1 - d / maxDist) * 0.08;
          elements.push(e('line', { key: `l-${i}-${j}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: net, strokeWidth: 1, opacity }));
        }
      }
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]; elements.push(e('circle', { key: `d-${i}`, cx: p.x, cy: p.y, r: 1.2, fill: net, opacity: 0.16 }));
      }
      return elements;
    })()
  );

  const fitTitles = (src) => {
    const PANEL_HEIGHT = 630 - 188 - 56;
    const INNER = PANEL_HEIGHT - 64;
    const CHAR_PER_LINE = 68;
    const LINE_H = 26 * 1.35;
    const GAP = 16;
    const out = [];
    let used = 0;
    for (const t of src) {
      const lines = Math.max(1, Math.ceil(t.length / CHAR_PER_LINE));
      const block = lines * LINE_H + (out.length > 0 ? GAP : 0);
      if (used + block > INNER) break;
      used += block;
      out.push(t);
    }
    return out;
  };
  const fitted = fitTitles(titles);

  const titleNodes = (fitted.length === 0)
    ? [e('div', { key: 'empty', style: { fontSize: 26, color: subtext } }, 'A glimpse into 2100 awaits…')]
    : fitted.map((t, i) => (
        e('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 12 } },
          e('div', { style: { width: 8, height: 8, borderRadius: 50, background: accent, marginTop: 10, boxShadow: `0 0 8px ${accent}` } }),
          e('div', { style: { fontSize: 26, lineHeight: 1.35, maxWidth: 1000, color: text } }, `${t.slice(0, 180)}${t.length > 180 ? '…' : ''}`)
        )
      ));

  const root = e('div', {
    style: {
      height: '630px', width: '1200px', display: 'flex', flexDirection: 'column',
      background: bg, color: text, padding: '48px', position: 'relative',
      fontFamily: 'Space Mono, ui-monospace, Menlo, Monaco, monospace'
    }
  },
    netSvg,
    e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      e('div', { style: { display: 'flex', alignItems: 'baseline', gap: '12px' } },
        e('div', { style: { fontSize: 56, fontWeight: 700, letterSpacing: '2px', color: text, textShadow: '0 0 20px rgba(0,0,0,0.15)' } }, '2100'),
        e('div', { style: { fontSize: 18, color: subtext } }, 'If Humanity skipped a Century')
      )
    ),
    e('div', { style: { marginTop: 18, fontSize: 22, color: subtext } },
      `News from ${future.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
    ),
    e('div', { style: { height: 2, background: accent, width: '100%', marginTop: 12, opacity: 0.9, boxShadow: `0 0 12px ${accent}` } }),
    e('div', {
      style: { marginTop: 24, padding: 32, borderRadius: 12, background: 'linear-gradient(135deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.02) 100%)', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }
    }, ...titleNodes),
    e('div', { style: { position: 'absolute', bottom: 36, left: 48, fontSize: 16, color: subtext } }, '2100.wiki — Futuristic news from today')
  );

  return new ImageResponse(root, { width: 1200, height: 630 });
}

const app = express();

app.get('/og', async (req, res) => {
  try {
    let { date } = req.query;
    if (!date) {
      const latest = await fetchLatestDate();
      if (latest) date = latest;
    }
    let d;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, dd] = String(date).split('-').map(Number);
      d = new Date(y, m - 1, dd);
    } else {
      d = date ? new Date(date) : new Date();
    }

    const titles = (await fetchArticles(toDateString(d)))
      .slice(0, 8)
      .map((a) => a?.futuristicTitle || a?.originalTitle || '')
      .filter(Boolean)
      .map((t) => t.replace(/^"|"$/g, ''));

    const img = buildImage({ date: d, titles });
    const buf = Buffer.from(await img.arrayBuffer());
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: 'failed_to_generate', message: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`OG dev server running at http://localhost:${PORT}/og`);
});


