/*
  Generate OG image and upload to Supabase Storage
  Usage:
    node scripts/generate-og-to-storage.js --date=YYYY-MM-DD [--ratio=square|portrait|landscape]
    node scripts/generate-og-to-storage.js --no-upload [--out=og-preview.png] [--ratio=square]

  Flags:
    --fixed-height=true   Keep original fixed canvas heights for the chosen ratio. By default, height is auto-fitted to content while width stays fixed.

  Env (set in CI, not locally committed):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY  (required for upload)
*/

/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const React = require('react');
const { ImageResponse } = require('@vercel/og');

function getArg(name, fallback) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? m.split('=')[1] : fallback;
}

function hasArg(name) {
  return process.argv.some((a) => a === `--${name}` || a.startsWith(`--${name}=`));
}

function toDateString(date) {
  // Use UTC components to avoid timezone drift
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function fetchArticles(dateString) {
  const baseUrl = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_SERVICE_ROLE_KEY; // service key works for read too
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

// removed legacy JSX builder

async function main() {
  const dateArg = getArg('date');
  const ratio = getArg('ratio', 'landscape'); // 'landscape' | 'square' | 'portrait'
  const dailyRun = getArg('daily-run'); // optional: '1' | '2'
  const singleIndexArg = getArg('single-index'); // optional: 0-based index for single article image
  const date = dateArg ? new Date(dateArg) : new Date();
  const dateString = toDateString(date);
  const suffix = ratio === 'square' ? '_square' : ratio === 'portrait' ? '_portrait' : '';

  const articles = await fetchArticles(dateString);
  const titles = (articles || [])
    .slice(0, 8)
    .map((a) => a?.futuristicTitle || a?.originalTitle || '')
    .filter(Boolean)
    .map((t) => t.replace(/^"|"$/g, ''));

  const singleIndex = singleIndexArg !== undefined ? Number(singleIndexArg) : undefined;
  const singleArticle = singleIndex !== undefined
    ? (Array.isArray(articles) && articles[singleIndex] ? articles[singleIndex] : null)
    : null;
  if (singleIndex !== undefined && !singleArticle) {
    // Nothing to render for this index
    console.log(JSON.stringify({ skip: true, reason: 'no_article', index: singleIndex }));
    return;
  }

  // Dimensions by ratio
  const dims = ratio === 'square'
    ? { w: 1200, h: 1200 }
    : ratio === 'portrait'
      ? { w: 1080, h: 1350 }
      : { w: 1200, h: 630 };

  // Patch build to requested dims by temporarily overriding globals via wrapper
  async function buildWithDims(w, h) {
    // Rebuild background and layout with supplied width/height
    const future = new Date(Date.UTC(date.getUTCFullYear() + 100, date.getUTCMonth(), date.getUTCDate()));
    const bg = '#ffffff';
    const text = '#000000';
    const subtext = '#666666';
    const accent = '#00FF88';
    const net = '#8a8f98';
    const width = w; let height = h;
    const e = React.createElement;

    const PANEL_TOP = 188; const PANEL_BOTTOM = 56; // keep same margins
    const PANEL_HEIGHT = height - PANEL_TOP - PANEL_BOTTOM;
    const INNER = PANEL_HEIGHT - 64;
    const CHAR_PER_LINE = ratio === 'portrait' ? 48 : ratio === 'square' ? 58 : 68;
    const LINE_H = 26 * 1.35;
    const GAP = 16;
    const fitted = [];
    let used = 0;
    const listForFit = singleArticle ? [
      (singleArticle.futuristicCaption || singleArticle.description || '')
        .toString()
        .replace(/^\"|\"$/g, ''),
    ] : titles;
    for (const t of listForFit) {
      const content = (t || '').toString();
      if (!content) continue;
      const lines = Math.max(1, Math.ceil(content.length / CHAR_PER_LINE));
      const block = lines * LINE_H + (fitted.length > 0 ? GAP : 0);
      if (used + block > INNER) break;
      used += block;
      fitted.push(content);
    }

    // Optional dynamic height to reduce excessive empty background on single images
    const fixedHeight = getArg('fixed-height') === 'true';
    if (!fixedHeight) {
      const isSingle = !!singleArticle;
      const paddingOuter = isSingle ? 36 : 48;
      const headerBlock = isSingle ? 48 : 56; // brand row
      const dateBlock = 18 + 22; // margin + text
      const dividerBlock = 12 + 2; // margin + line
      // Panel has marginTop 24 and padding 32 top/bottom, plus used content
      // Add approx meta height when single article present (caption meta row)
      const singleMetaApprox = isSingle ? 28 : 0;
      const panelBlock = 24 + 32 + 32 + used + singleMetaApprox;
      const footerBlock = isSingle ? (12 + 14) : (20 + 16);
      const desired = paddingOuter + headerBlock + dateBlock + dividerBlock + panelBlock + footerBlock + paddingOuter;
      const minBase = ratio === 'portrait' ? 900 : 800;
      const minH = isSingle ? Math.max(600, minBase - 180) : minBase;
      const maxH = h; // do not exceed the base ratio height
      const tighten = isSingle ? 24 : 0; // trim residual slack for single
      height = Math.max(minH, Math.min(maxH, Math.round(desired - tighten)));
    }

    // Build background with final height
    const elements = [];
    let seed = 2100;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const num = 140; const pad = 12;
    const pts = Array.from({ length: num }, () => ({ x: pad + rand() * (width - pad * 2), y: pad + rand() * (height - pad * 2) }));
    const k = 3; const maxDist = Math.min(240, Math.max(160, Math.floor(Math.min(width, height) * 0.2)));
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
        elements.push({ a, b, opacity });
      }
    }

    const svg = e('svg', { width, height, style: { position: 'absolute', inset: 0 } },
      ...elements.map((el, idx) => e('line', { key: String(idx), x1: el.a.x, y1: el.a.y, x2: el.b.x, y2: el.b.y, stroke: net, strokeWidth: 1, opacity: el.opacity })),
      ...pts.map((p, idx) => e('circle', { key: `d-${idx}`, cx: p.x, cy: p.y, r: 1.2, fill: net, opacity: 0.16 }))
    );

    let titleNodes;
    if (fitted.length === 0) {
      titleNodes = [e('div', { key: 'empty', style: { fontSize: 26, color: subtext } }, 'A glimpse into 2100 awaits…')];
    } else if (singleArticle) {
      // Single article: paragraph caption inside the glass card
      const source = singleArticle.source || '';
      const published = singleArticle.publishedAt ? new Date(singleArticle.publishedAt) : null;
      const publishedStr = published ? published.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      titleNodes = [
        e('div', { key: 'para', style: { fontSize: 24, lineHeight: 1.5, color: text, whiteSpace: 'pre-wrap' } }, fitted[0].length > 900 ? `${fitted[0].slice(0, 900)}…` : fitted[0]),
        e('div', { key: 'meta', style: { marginTop: 12, fontSize: 16, color: subtext, display: 'flex', gap: 8 } }, `Source: ${source}`, publishedStr ? `· ${publishedStr}` : ''),
      ];
    } else {
      // Multi: bullets
      titleNodes = fitted.map((t, i) => e('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 12 } },
        e('div', { style: { width: 8, height: 8, borderRadius: 50, background: accent, marginTop: 10, boxShadow: `0 0 8px ${accent}` } }),
        e('div', { style: { fontSize: 26, lineHeight: 1.35, maxWidth: Math.min(1000, width - 120), color: text } }, t.length > 180 ? `${t.slice(0, 180)}…` : t)
      ));
    }

    const root = e('div', { style: { height, width, display: 'flex', flexDirection: 'column', background: bg, color: text, padding: 48, position: 'relative', fontFamily: 'Space Mono, ui-monospace, Menlo, Monaco, monospace' } },
      svg,
      e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        e('div', { style: { display: 'flex', alignItems: 'baseline' } },
          e('span', { style: { fontSize: 56, fontWeight: 700, letterSpacing: 2, lineHeight: 1, color: text, textShadow: '0 0 20px rgba(0,0,0,0.15)' } }, '2100')
        )
      ),
      e('div', { style: { marginTop: 18, fontSize: 22, color: subtext } }, singleArticle ? (singleArticle.futuristicTitle || singleArticle.originalTitle || '—') : `News from ${future.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`),
      e('div', { style: { height: 2, background: accent, width: '100%', marginTop: 12, boxShadow: `0 0 12px ${accent}` } }),
      e('div', { style: { marginTop: 24, padding: 32, borderRadius: 12, background: 'linear-gradient(135deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.02) 100%)', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' } }, ...titleNodes),
      e('div', { style: { marginTop: 20, fontSize: 16, color: subtext } }, '2100.com — Futuristic news from today')
    );
    const img = new ImageResponse(root, { width, height });
    return Buffer.from(await img.arrayBuffer());
  }

  const buffer = await buildWithDims(dims.w, dims.h);

  // Optional: local-only generation for testing
  const noUpload = hasArg('no-upload') || hasArg('dry');
  if (noUpload) {
    const outPath = getArg('out', `og-preview${suffix}.png`);
    fs.writeFileSync(outPath, buffer);
    console.log(JSON.stringify({ saved: outPath, width: dims.w, height: dims.h }, null, 2));
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  // Ensure bucket exists and public
  try { await supabase.storage.createBucket('og', { public: true }); } catch (_) {}

  const publicBase = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public`;

  // Single article image branch → store only in per-day folder
  if (singleArticle) {
    const runLabel = dailyRun && (dailyRun === '1' || dailyRun === '2') ? dailyRun : '1';
    const singlePath = `${dateString}/single_run${runLabel}_${singleIndex}${suffix}.png`;
    await supabase.storage.from('og').upload(singlePath, buffer, { upsert: true, contentType: 'image/png', cacheControl: '31536000' });
    console.log(JSON.stringify({ single: `${publicBase}/og/${singlePath}` }, null, 2));
    return;
  }

  // Daily image branch → keep only latest at root + file in per-day folder
  const latestPath = `latest${suffix}.png`;
  await supabase.storage.from('og').upload(latestPath, buffer, { upsert: true, contentType: 'image/png', cacheControl: '300' });

  const runLabel = dailyRun && (dailyRun === '1' || dailyRun === '2') ? dailyRun : '1';
  const dailyPath = `${dateString}/daily_run${runLabel}${suffix}.png`;
  await supabase.storage.from('og').upload(dailyPath, buffer, { upsert: true, contentType: 'image/png', cacheControl: '31536000' });

  console.log(JSON.stringify({ latest: `${publicBase}/og/${latestPath}`, daily: `${publicBase}/og/${dailyPath}` }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });


