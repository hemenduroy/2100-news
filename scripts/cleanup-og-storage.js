'use strict';

/*
  Weekly cleanup for Supabase Storage bucket 'og'.
  - Keeps root latest*.png files
  - Keeps folders for UTC today and UTC yesterday
  - Deletes older date folders (YYYY-MM-DD)

  Usage (in CI):
    env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    node scripts/cleanup-og-storage.js

  Optional env:
    DRY_RUN=true   -> logs what would be deleted, but does not delete
*/

const { createClient } = require('@supabase/supabase-js');

function utcDateString(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysDiffUTC(a, b) {
  // a, b as YYYY-MM-DD
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((da - db) / (24 * 60 * 60 * 1000));
}

function isDateFolder(name) {
  return /^\d{4}-\d{2}-\d{2}$/.test(name);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  const dry = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
  const supabase = createClient(supabaseUrl, serviceKey);

  const today = utcDateString();
  const yesterday = utcDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
  console.log(`[cleanup] starting (UTC today=${today}, yesterday=${yesterday}) dry_run=${dry}`);

  // List top-level entries in 'og' bucket
  const { data: top, error: listErr } = await supabase.storage.from('og').list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (listErr) throw listErr;
  const folders = (top || [])
    .filter((e) => e?.name && isDateFolder(e.name));

  // Determine which folders are older than yesterday
  const targets = folders
    .map((e) => e.name)
    .filter((folder) => {
      // keep today and yesterday
      if (folder === today || folder === yesterday) return false;
      // delete if date < yesterday
      return daysDiffUTC(folder, yesterday) < 0;
    });

  if (targets.length === 0) {
    console.log('[cleanup] nothing to delete');
    return;
  }

  console.log(`[cleanup] candidate folders: ${targets.join(', ')}`);

  for (const folder of targets) {
    // List contents of the folder
    const { data: files, error: subErr } = await supabase.storage.from('og').list(folder, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (subErr) {
      console.warn(`[cleanup] skip folder ${folder}: list error ${subErr.message}`);
      continue;
    }
    const paths = (files || []).map((f) => `${folder}/${f.name}`);
    if (paths.length === 0) {
      console.log(`[cleanup] folder ${folder} is empty`);
      continue;
    }
    if (dry) {
      console.log(`[cleanup] dry-run: would delete ${paths.length} objects under ${folder}`);
      continue;
    }
    const { error: delErr } = await supabase.storage.from('og').remove(paths);
    if (delErr) {
      console.warn(`[cleanup] failed to delete ${folder}: ${delErr.message}`);
      continue;
    }
    console.log(`[cleanup] deleted ${paths.length} objects in ${folder}`);
  }

  console.log('[cleanup] done');
}

main().catch((e) => { console.error(e); process.exit(1); });


