import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Rate limiting for OpenAI API (max 2 requests per minute)
let openAICallCount = 0;
let lastResetTime = Date.now();
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const MAX_CALLS_PER_MINUTE = 2;

const checkRateLimit = () => {
  const now = Date.now();
  
  // Reset counter if window has passed
  if (now - lastResetTime > RATE_LIMIT_WINDOW) {
    openAICallCount = 0;
    lastResetTime = now;
  }
  
  // Check if we're at the limit
  if (openAICallCount >= MAX_CALLS_PER_MINUTE) {
    const timeUntilReset = RATE_LIMIT_WINDOW - (now - lastResetTime);
    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(timeUntilReset / 1000)} seconds.`);
  }
  
  // Increment counter
  openAICallCount++;
  return true;
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// News API configuration
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_SOURCES = [
  { id: 'reuters', name: 'Reuters', category: 'World' },
  { id: 'bbc-news', name: 'BBC News', category: 'World' },
  { id: 'techcrunch', name: 'TechCrunch', category: 'Technology' },
  { id: 'the-verge', name: 'The Verge', category: 'Technology' }
];

// Enhanced prompt for GPT API that creates truly futuristic and humorous scenarios
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

Examples of good transformations:
- "Tesla recalls cars" → "Tesla Recalls Quantum Hover Cars After AI Drivers Develop Existential Crisis"
- "New iPhone released" → "Apple Launches Neural Interface Phone That Reads Your Dreams"
- "Climate summit" → "Global Leaders Meet on Mars to Discuss Terraforming Earth Back to Habitable State"

Format your response as:
TITLE: [creative futuristic title with humor]
CAPTION: [one witty sentence explaining the 2100 scenario while cleverly referencing the original news]`;

// Transform headline using GPT API
const transformHeadline = async (headline, description = '') => {
  try {
    // Check rate limit before making API call
    checkRateLimit();
    
    const prompt = FUTURISTIC_PROMPT
      .replace('{headline}', headline)
      .replace('{description}', description);
    

    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4.1-nano-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are a creative and witty futuristic news editor from 2100. You transform current news into entertaining sci-fi scenarios that are genuinely funny and imaginative. Your responses should make readers laugh and think "wow, that would be wild if it happened in 2100!" Be creative, use advanced sci-fi concepts, and make the humor clever and unexpected.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.8
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    const content = response.data.choices[0].message.content;
    const titleMatch = content.match(/TITLE:\s*(.+)/);
    const captionMatch = content.match(/CAPTION:\s*(.+)/);
    
    return {
      title: titleMatch ? titleMatch[1].trim() : headline,
      caption: captionMatch ? captionMatch[1].trim() : 'If Humanity skipped a Century...'
    };
  } catch (error) {
    if (error.message && error.message.includes('Rate limit exceeded')) {
      return {
        title: `${headline} (2100 Edition)`,
        caption: `In the year 2100, this news would be even more amazing!`
      };
    }
    
    return {
      title: headline,
      caption: 'If Humanity skipped a Century...'
    };
  }
};

// Fetch news from News API with proper parsing
const fetchNewsFromAPI = async (sourceId, targetDate) => {
  try {
    // Try to get articles from the specific date using 'everything' endpoint
    const response = await axios.get(`https://newsapi.org/v2/everything`, {
      params: {
        sources: sourceId,
        apiKey: NEWS_API_KEY,
        from: targetDate,
        to: targetDate,
        sortBy: 'relevancy',
        pageSize: 10
      }
    });
    
    let articles = response.data.articles || [];
    
    // If no articles found for specific date, fall back to top headlines
    if (articles.length === 0) {
      const topHeadlinesResponse = await axios.get(`https://newsapi.org/v2/top-headlines`, {
        params: {
          sources: sourceId,
          apiKey: NEWS_API_KEY,
          pageSize: 5
        }
      });
      articles = topHeadlinesResponse.data.articles || [];
    }
    
    return articles;
        } catch (error) {
        return [];
      }
};

// Transform all headlines for articles with proper parsing
const transformHeadlines = async (articles, sourceName, category) => {
  const transformed = [];
  
  for (const article of articles) {
    // Extract the relevant fields from News API response
    const originalTitle = article.title || '';
    const description = article.description || article.content || '';
    const url = article.url || '';
    const publishedAt = article.publishedAt || new Date().toISOString();
    const sourceName = article.source?.name || sourceName;
    


    const result = await transformHeadline(originalTitle, description);
    transformed.push({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      originalTitle: originalTitle,
      futuristicTitle: result.title,
      futuristicCaption: result.caption,
      source: sourceName,
      category: category,
      publishedAt: publishedAt,
      link: url,
      description: description
    });
  }
  
  return transformed;
};

// Main function to fetch and process news
const fetchAndProcessNews = async (targetDate = null) => {
  try {
    // Use provided date or today's date
    const dateToFetch = targetDate || new Date().toISOString().split('T')[0];
    
    const allArticles = [];
    
    // Fetch from all sources
    for (const source of NEWS_SOURCES) {
      const articles = await fetchNewsFromAPI(source.id, dateToFetch);
      
      if (articles.length > 0) {
        const transformedArticles = await transformHeadlines(articles, source.name, source.category);
        allArticles.push(...transformedArticles);
      }
    }
    
    if (allArticles.length === 0) {
      return;
    }
    
    // Save to Supabase
    const dateToSave = dateToFetch;
    
    const { error } = await supabase
      .from('news')
      .upsert({
        date: dateToSave,
        articles: allArticles,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'date'
      });
    
    if (error) {
      // Error saving to database
    }
    
    return allArticles;
  } catch (error) {
    throw error;
  }
};

// API Routes
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { date } = req.query;

  try {
    if (req.method === 'GET') {
      if (date) {
        // Get news for specific date
        const { data, error } = await supabase
          .from('news')
          .select('articles, no_data')
          .eq('date', date)
          .single();

        if (error || !data) {
          return res.json({ articles: [], no_data: false });
        }

        res.json({ articles: data.articles || [], no_data: data.no_data || false });
      } else {
        // Get latest news
        const { data, error } = await supabase
          .from('news')
          .select('articles, no_data')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (error || !data) {
          return res.json({ articles: [], no_data: false });
        }

        res.json({ articles: data.articles || [], no_data: data.no_data || false });
      }
    } else if (req.method === 'POST') {
      // Trigger news fetch and processing
      const { date: requestDate } = req.body;
      const articles = await fetchAndProcessNews(requestDate);
      res.json({ success: true, articles });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 