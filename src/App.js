import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { format, addYears, parseISO } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './App.css';
import NewsGrid from './components/NewsGrid';
import Header from './components/Header';
import { fetchNewsForDate } from './services/newsService';
import VantaBackground from './components/VantaBackground';
// EdgeArrows used inline inside NewsGrid
import OGPreviewPage from './pages/OGPreviewPage';

// Theme context removed; using local state only

// Main content component that handles URL parameters
function MainContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Helper: get "today" based on UTC calendar (same Y-M-D globally)
  const getUtcTodayLocalDate = useCallback(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();
    // Construct a local Date for the UTC Y-M-D so formatting shows that date universally
    return new Date(y, m, d);
  }, []);

  // Get date from URL or default to UTC "today"
  const getDateFromURL = useCallback(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      try {
        return parseISO(dateParam);
      } catch (error) {
        // If invalid date, return UTC today
        return getUtcTodayLocalDate();
      }
    }
    return getUtcTodayLocalDate();
  }, [searchParams, getUtcTodayLocalDate]);

  const [selectedDate, setSelectedDate] = useState(getDateFromURL);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  // Initialize theme from saved preference or system setting
  const getInitialTheme = () => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch (_) {
      // ignore storage errors
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    return false;
  };
  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme); // persisted theme
  const [noDataAvailable, setNoDataAvailable] = useState(false);
  // Simple fade transition state
  const [fadePhase, setFadePhase] = useState('idle'); // 'idle' | 'out' | 'in'
  const calendarRef = useRef(null);
  const hasInitialized = useRef(false);

  // Helper: run after the next paint (2 RAFs) so CSS effects like backdrop-filter are ready
  const afterNextPaint = (callback) => {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  };

  // Convert current date to "future" date (100 years ahead)
  const getFutureDate = (date) => {
    return addYears(date, 100);
  };

  // Set min and max dates for the calendar
  const minDate = new Date(2000, 0, 1); // Jan 1, 2000 (displays as Jan 1, 2100)
  const maxDate = getUtcTodayLocalDate(); // UTC-based today

  // Update URL when date changes
  const updateURL = (date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setSearchParams({ date: dateString });
  };

  const handleDateChange = async (date) => {
    setSelectedDate(date);
    updateURL(date);
    setShowCalendar(false);
    await loadNewsForDate(date);
  };

  const handleCalendarClick = (e) => {
    // Close calendar when clicking outside of it
    if (calendarRef.current && !calendarRef.current.contains(e.target)) {
      setShowCalendar(false);
    }
  };

  const handleCalendarToggle = () => {
    setShowCalendar(!showCalendar);
  };

  const handleGoToToday = () => {
    const today = getUtcTodayLocalDate();
    setSelectedDate(today);
    updateURL(today);
    loadNewsForDate(today);
  };

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handlePreviousDay = () => {
    const previousDate = new Date(selectedDate);
    previousDate.setDate(previousDate.getDate() - 1);
    
    // Don't go before the minimum date
    if (previousDate >= minDate) {
      // Fade out → change → fade in
      setFadePhase('out');
      setTimeout(async () => {
        await handleDateChange(previousDate);
        afterNextPaint(() => {
          setFadePhase('in');
          setTimeout(() => setFadePhase('idle'), 180);
        });
      }, 180);
    }
  };

  const handleNextDay = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Don't go beyond today
    if (nextDate <= maxDate) {
      setFadePhase('out');
      setTimeout(async () => {
        await handleDateChange(nextDate);
        afterNextPaint(() => {
          setFadePhase('in');
          setTimeout(() => setFadePhase('idle'), 180);
        });
      }, 180);
    }
  };

  // Swipe navigation removed to avoid accidental triggers

  const loadNewsForDate = async (date) => {
    setLoading(true);
    try {
      const newsData = await fetchNewsForDate(date);
      setNews(newsData.articles || []);
      setNoDataAvailable(newsData.no_data || false);
    } catch (error) {
      setNews([]);
      setNoDataAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  // Load news when component mounts or URL changes
  useEffect(() => {
    const urlDate = getDateFromURL();
    // Only update if the date actually changed or if we haven't initialized yet
    if (!hasInitialized.current || urlDate.getTime() !== selectedDate.getTime()) {
      hasInitialized.current = true;
      setSelectedDate(urlDate);
      loadNewsForDate(urlDate);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add click listener when calendar is shown
  useEffect(() => {
    if (showCalendar) {
      // Use a longer delay to prevent immediate closing
      const timer = setTimeout(() => {
        document.addEventListener('click', handleCalendarClick);
      }, 200);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleCalendarClick);
      };
    }
  }, [showCalendar]);

  // Apply and persist theme
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';
    try {
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    } catch (_) {
      // ignore storage errors
    }
  }, [isDarkMode]);

  return (
    <div className={`App ${isDarkMode ? 'dark' : 'light'}`}>
      <div className={`bg-fallback ${isDarkMode ? 'dark' : 'light'}`} />
      <VantaBackground isDarkMode={isDarkMode} />
      <Header 
        currentDate={getFutureDate(selectedDate)}
        onCalendarClick={handleCalendarToggle}
        onGoToToday={handleGoToToday}
        onThemeToggle={handleThemeToggle}
        isDarkMode={isDarkMode}
        onPreviousDay={handlePreviousDay}
        onNextDay={handleNextDay}
        canGoNext={selectedDate.toDateString() !== maxDate.toDateString()}
      />
      
      <main 
        className={`main-content`}
      >
        <div className="container">
          {showCalendar && (
            <div className="calendar-overlay" onClick={(e) => {
              // Close calendar when clicking on the overlay (background)
              if (e.target === e.currentTarget) {
                setShowCalendar(false);
              }
            }}>
              <div className="calendar-container" ref={calendarRef}>
                <Calendar
                  onChange={handleDateChange}
                  value={selectedDate}
                  minDate={minDate}
                  maxDate={maxDate}
                  className="future-calendar"
                  formatDay={(locale, date) => {
                    // Display dates as if they're 100 years in the future
                    const futureDate = getFutureDate(date);
                    return format(futureDate, 'd');
                  }}
                  formatMonth={(locale, date) => {
                    // Display month names normally
                    return format(date, 'MMMM');
                  }}
                  formatYear={(locale, date) => {
                    // Display year as 100 years in the future
                    const futureDate = getFutureDate(date);
                    return format(futureDate, 'yyyy');
                  }}
                  formatMonthYear={(locale, date) => {
                    // Display month and year as 100 years in the future
                    const futureDate = getFutureDate(date);
                    return format(futureDate, 'MMMM yyyy');
                  }}
                  onClickDay={(value, event) => {
                    // Prevent event bubbling when clicking on days
                    event.stopPropagation();
                  }}
                  onClickDecade={(value, event) => {
                    // Prevent event bubbling when clicking on decade
                    event.stopPropagation();
                  }}
                  onClickMonth={(value, event) => {
                    // Prevent event bubbling when clicking on month
                    event.stopPropagation();
                  }}
                  onClickYear={(value, event) => {
                    // Prevent event bubbling when clicking on year
                    event.stopPropagation();
                  }}
                />
              </div>
            </div>
          )}
          <div className={`content-fader ${fadePhase === 'out' ? 'fade-out' : fadePhase === 'in' ? 'fade-in' : ''}`}>
            <NewsGrid 
              news={news} 
              loading={loading}
              selectedDate={getFutureDate(selectedDate)}
              noDataAvailable={noDataAvailable}
              isDarkMode={isDarkMode}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              canGoNext={selectedDate.toDateString() !== maxDate.toDateString()}
            />
          </div>
        </div>
      </main>
      {/* Footer with X logo link */}
      <footer style={{ textAlign: 'center', padding: '12px 0 24px 0' }}>
        <a
          href="https://x.com/2100_wiki"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit 2100 on X"
          style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit', textDecoration: 'none', opacity: 0.85 }}
        >
          {/* X logo (Bootstrap bi-twitter-x) */}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" role="img">
            <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/>
          </svg>
        </a>
      </footer>
      {/* No fixed overlay arrows; arrows are rendered inline within NewsGrid under the header */}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainContent />} />
        <Route path="/og-preview" element={<OGPreviewPage />} />
      </Routes>
    </Router>
  );
}

export default App; 