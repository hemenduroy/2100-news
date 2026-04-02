// Dynamic share HTML that sets OG tags for a specific date, then redirects users to SPA route

module.exports = async (req, res) => {
  const { searchParams, pathname } = new URL(req.url, 'http://localhost');
  // Accept both /api/share?date=YYYY-MM-DD and rewrites like /share/2025-08-08
  let dateParam = searchParams.get('date');
  const match = pathname.match(/\/share\/(\d{4}-\d{2}-\d{2})/);
  if (!dateParam && match) dateParam = match[1];

  const date = dateParam || new Date().toISOString().slice(0, 10);
  const site = process.env.SITE_ORIGIN || 'https://2100.wiki';
  const storageBase = process.env.SUPABASE_PUBLIC_BUCKET || 'https://qyjaxrazuxpdaoplwkrt.supabase.co/storage/v1/object/public';
  const ogImage = `${storageBase}/og/${encodeURIComponent(date)}.png`;
  const title = '2100 - If Humanity skipped a Century';
  const desc = "Today's news, rewritten as if it's the year 2100 — witty, futuristic, and fun.";
  const target = `${site}/?date=${encodeURIComponent(date)}`;

  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <meta property="og:type" content="website" />
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${desc}" />
      <meta property="og:image" content="${ogImage}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${title}" />
      <meta name="twitter:description" content="${desc}" />
      <meta name="twitter:image" content="${ogImage}" />
      <meta http-equiv="refresh" content="0; url=${target}" />
    </head>
    <body>
      <p>Redirecting to <a href="${target}">${target}</a>…</p>
    </body>
  </html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).end(html);
};


