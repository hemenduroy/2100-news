-- Create the news table
CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  articles JSONB DEFAULT '[]',
  no_data BOOLEAN DEFAULT FALSE,
  backfill_status TEXT DEFAULT NULL, -- 'in_progress', 'completed', or NULL
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on date for faster queries
CREATE INDEX IF NOT EXISTS idx_news_date ON news(date);

-- Create index on backfill_status for status checks
CREATE INDEX IF NOT EXISTS idx_news_backfill_status ON news(backfill_status);

-- Create index on updated_at for latest news queries
CREATE INDEX IF NOT EXISTS idx_news_updated_at ON news(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON news
  FOR SELECT USING (true);

-- Create policy to allow insert/update from API
CREATE POLICY "Allow API write access" ON news
  FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_news_updated_at 
  BEFORE UPDATE ON news 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 