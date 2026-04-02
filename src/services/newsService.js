import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;



let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (error) {
    // Silent error handling
  }
} else {
  // Silent fallback
}

// Export the shared client
export { supabase };

// Fetch news for a specific date
export const fetchNewsForDate = async (date) => {
  try {
    if (!supabase) {
      return { articles: [], no_data: false };
    }

    // Use local timezone to avoid UTC shifting to next day
    const dateString = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    
    const { data, error } = await supabase
      .from('news')
      .select('articles, no_data')
      .eq('date', dateString)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return { articles: [], no_data: false };
    }

    if (!data) {
      return { articles: [], no_data: false };
    }

    return {
      articles: data.articles || [],
      no_data: data.no_data || false
    };
  } catch (error) {
    return { articles: [], no_data: false };
  }
};

// Fetch latest news
export const fetchLatestNews = async () => {
  try {
    if (!supabase) {
      return { articles: [], no_data: false };
    }

    const { data, error } = await supabase
      .from('news')
      .select('articles, no_data')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { articles: [], no_data: false };
    }

    return {
      articles: data.articles || [],
      no_data: data.no_data || false
    };
  } catch (error) {
    return { articles: [], no_data: false };
  }
};

// Fetch available dates
export const fetchAvailableDates = async () => {
  try {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('news')
      .select('date')
      .order('date', { ascending: false });

    if (error) {
      return [];
    }

    return data.map(record => new Date(record.date));
  } catch (error) {
    return [];
  }
}; 