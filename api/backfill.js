export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Check if required environment variables are set
    if (!process.env.REPO_OWNER || !process.env.GH_TOKEN) {
      return res.status(500).json({ error: 'GitHub configuration missing' });
    }

    // Trigger GitHub Actions workflow for backfill
    const response = await fetch(`https://api.github.com/repos/${process.env.REPO_OWNER}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.GH_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'backfill-news',
        client_payload: {
          date: date,
          mark_as_no_data: false
        }
      })
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to trigger backfill workflow' });
    }

    res.json({ 
      success: true, 
      message: 'Backfill request submitted to GitHub Actions. Check the Actions tab for progress.',
      date: date
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
