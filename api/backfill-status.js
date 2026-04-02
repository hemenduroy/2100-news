import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    if (req.method === 'GET') {
      // Check backfill status for a date
      const { data, error } = await supabase
        .from('news')
        .select('backfill_status')
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') {
        return res.status(500).json({ error: 'Database error' });
      }

      const status = data?.backfill_status || null;
      res.json({ status });
    } else if (req.method === 'POST') {
      const { status } = req.body;
      
      if (!status || !['in_progress', 'completed', null].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Update backfill status
      const { error } = await supabase
        .from('news')
        .upsert({
          date: date,
          backfill_status: status,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'date'
        });

      if (error) {
        return res.status(500).json({ error: 'Failed to update status' });
      }

      res.json({ success: true, status });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
