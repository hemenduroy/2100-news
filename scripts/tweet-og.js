/*
  Post the latest OG image to X (Twitter)
  Usage:
    node scripts/tweet-og.js --date=YYYY-MM-DD [--ratio=square|portrait|landscape]

  Required env (repo secrets in CI):
    TWITTER_APP_KEY
    TWITTER_APP_SECRET
    TWITTER_ACCESS_TOKEN
    TWITTER_ACCESS_SECRET
    SUPABASE_URL (to compose public URL base)
*/

/* eslint-disable no-console */
const { TwitterApi } = require('twitter-api-v2');

function getArg(name, fallback) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? m.split('=')[1] : fallback;
}

async function main() {
  const date = getArg('date');
  const ratio = getArg('ratio', 'square');
  const suffix = ratio === 'square' ? '_square' : ratio === 'portrait' ? '_portrait' : '';
  const singleIndexArg = getArg('single-index');
  const dailyRunArg = getArg('daily-run'); // optional: '1' | '2'

  const site = process.env.SUPABASE_URL;
  if (!site) throw new Error('Missing SUPABASE_URL');
  const publicBase = `${site.replace(/\/$/, '')}/storage/v1/object/public/og`;
  let imageUrl;
  const utcHour = Number(new Date().toISOString().slice(11, 13));
  const inferredRun = utcHour >= 12 ? '2' : '1';
  const runLabel = (dailyRunArg === '1' || dailyRunArg === '2') ? dailyRunArg : inferredRun;
  const dateString = date || new Date().toISOString().slice(0, 10);
  if (singleIndexArg !== undefined) {
    // Singles are stored only under per-day folder with run label
    imageUrl = `${publicBase}/${dateString}/single_run${runLabel}_${Number(singleIndexArg)}${suffix}.png`;
  } else {
    // Daily tweet uses the latest alias at bucket root
    imageUrl = `${publicBase}/latest${suffix}.png`;
  }

  const appKey = process.env.TWITTER_APP_KEY;
  const appSecret = process.env.TWITTER_APP_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;
  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error('Missing Twitter credentials');
  }

  const client = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });

  // Download image
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch image ${imageUrl}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const mediaId = await client.v1.uploadMedia(Buffer.from(arrayBuffer), { mimeType: 'image/png' });

  // Compose caption
  const base = date ? new Date(`${date}T00:00:00Z`) : new Date();
  const todayUtc = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const future = new Date(Date.UTC(todayUtc.getUTCFullYear() + 100, todayUtc.getUTCMonth(), todayUtc.getUTCDate()));
  const isSingle = singleIndexArg !== undefined;
  const caption = isSingle
    ? `From today's temporal feed — If humanity skipped a century.\n\nRead more: https://2100.wiki`
    : `News from ${future.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} — If humanity skipped a century.\n\nRead more: https://2100.wiki`;

  const tweet = await client.v2.tweet({ text: caption, media: { media_ids: [mediaId] } });
  console.log(JSON.stringify({ ok: true, tweetId: tweet.data?.id, imageUrl }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });


