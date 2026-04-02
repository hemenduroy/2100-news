import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, addYears } from 'date-fns';
import { fetchNewsForDate } from '../services/newsService';
import './OGPreviewPage.css';

function StaticNetBackground() {
  // Random polygonal web (nearest-neighbor network) akin to Vanta NET, static
  const width = 1200;
  const height = 630;
  const lines = [];
  const dots = [];
  const color = '#0f1216';

  // Seeded PRNG for determinism
  let seed = 2100;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Generate scattered points with padding
  const num = 140;
  const pad = 12;
  const pts = Array.from({ length: num }, () => ({
    x: pad + rand() * (width - pad * 2),
    y: pad + rand() * (height - pad * 2),
  }));

  // Connect each point to k nearest neighbors within a distance threshold
  const k = 3;
  const maxDist = 240; // px
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const distances = [];
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      const b = pts[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.hypot(dx, dy);
      distances.push([j, d]);
    }
    distances.sort((m, n) => m[1] - n[1]);
    for (let n = 0; n < k; n++) {
      const [j, d] = distances[n];
      if (d > maxDist) continue;
      const b = pts[j];
      const opacity = 0.08 + (1 - d / maxDist) * 0.08;
      lines.push(
        <line key={`l-${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1} opacity={opacity} />
      );
    }
  }

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    dots.push(<circle key={`d-${i}`} cx={p.x} cy={p.y} r={1.2} fill={color} opacity={0.16} />);
  }

  return (
    <svg className="og-net" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {lines}
      {dots}
    </svg>
  );
}

export default function OGPreviewPage() {
  const [params] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const date = useMemo(() => {
    const raw = params.get('date');
    if (!raw) return new Date();
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      return new Date(y, mo, d); // local midnight to avoid UTC shift
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [params]);

  const futureDate = useMemo(() => addYears(date, 100), [date]);

  useEffect(() => {
    let isCancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchNewsForDate(date);
        if (!isCancelled) setArticles((res?.articles || []).slice(0, 8));
      } catch {
        if (!isCancelled) setArticles([]);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, [date]);

  // No JS measuring needed; underline handled by CSS ::after

  const rawTitles = (articles || [])
    .map(a => a?.futuristicTitle || a?.originalTitle || '')
    .filter(Boolean)
    .map(t => t.replace(/^"|"$/g, ''));

  const titles = useMemo(() => {
    // Match the panel dimensions from CSS: top 188px, bottom 56px -> available 386px
    const PANEL_HEIGHT = 630 - 188 - 56;
    // Inner padding 32 top + 32 bottom
    const INNER = PANEL_HEIGHT - 64;
    const CHAR_PER_LINE = 68; // approx for Space Mono 26px within ~1000px width
    const LINE_H = 26 * 1.35;
    const GAP = 16;
    const result = [];
    let used = 0;
    for (const t of rawTitles) {
      const lines = Math.max(1, Math.ceil(t.length / CHAR_PER_LINE));
      const block = lines * LINE_H + (result.length > 0 ? GAP : 0);
      if (used + block > INNER) break;
      used += block;
      result.push(t);
    }
    return result;
  }, [rawTitles]);

  return (
    <div className="og-wrapper">
      <div className="og-canvas" role="img" aria-label="Open Graph preview">
        <StaticNetBackground />

        <div className="og-header">
          <div className="og-brand">
            <div className="og-logo">2100</div>
            <div className="og-tagline">If Humanity skipped a Century</div>
          </div>
        </div>

        <div className="og-date">{`News from ${format(futureDate, 'EEEE, MMMM d, yyyy')}`}</div>
        <div className="og-divider" />

        <div className="og-card">
          {loading && <div className="og-loading">Loading…</div>}
          {!loading && titles.length === 0 && (
            <div className="og-empty">A glimpse into 2100 awaits…</div>
          )}
          {!loading && titles.length > 0 && (
            <div className="og-list">
              {titles.map((t, i) => (
                <div className="og-item" key={i}>
                  <span className="og-dot" />
                  <span className="og-text">{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="og-footer">2100.wiki — Futuristic news from today</div>
      </div>
    </div>
  );
}


