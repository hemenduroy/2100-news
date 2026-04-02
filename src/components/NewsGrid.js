import React, { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import NewsCard from './NewsCard';
import ProcessingAnimation from './ProcessingAnimation';
import { supabase } from '../services/newsService';
import './NewsGrid.css';
import EdgeArrows from './EdgeArrows';

const NewsGrid = ({ news, loading, selectedDate, noDataAvailable, isDarkMode, onPreviousDay, onNextDay, canGoNext }) => {
  const [backfillStatus, setBackfillStatus] = useState(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);
  const [checkedDates, setCheckedDates] = useState(new Set()); // Track which dates we've already checked
  const currentDateRef = useRef(null);

  const checkBackfillStatus = useCallback(async (dateString) => {
    try {
      if (!supabase) {
        setBackfillStatus(null);
        return null;
      }
      
      const { data, error } = await supabase
        .from('news')
        .select('backfill_status')
        .eq('date', dateString)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        setBackfillStatus(null);
        return null;
      }
      
      const status = data?.backfill_status || null;
      setBackfillStatus(status);
      return status;
    } catch (error) {
      setBackfillStatus(null);
      return null;
    }
  }, []);

  const startStatusChecks = useCallback((dateString) => {
    // Clear any existing interval
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }
    
    // Start checking every 60 seconds
    const interval = setInterval(async () => {
      const status = await checkBackfillStatus(dateString);
      if (status === 'completed' || status === null) {
        // Backfill completed or failed, stop checking
        clearInterval(interval);
        setStatusCheckInterval(null);
      }
    }, 60000); // Check every 60 seconds
    
    setStatusCheckInterval(interval);
  }, [statusCheckInterval, checkBackfillStatus]);

  // Check status when component mounts or date changes
  React.useEffect(() => {
    if (selectedDate) {
      const currentDate = new Date(selectedDate);
      currentDate.setFullYear(currentDate.getFullYear() - 100);
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Only check if the date actually changed
      if (currentDateRef.current !== dateString) {
        currentDateRef.current = dateString;
        
        // Only check if we haven't already checked this date
        if (!checkedDates.has(dateString)) {
          const checkAndStartMonitoring = async () => {
            const status = await checkBackfillStatus(dateString);
            // If backfill is in progress, start monitoring
            if (status === 'in_progress') {
              startStatusChecks(dateString);
            }
            // Mark this date as checked
            setCheckedDates(prev => new Set([...prev, dateString]));
          };
          
          checkAndStartMonitoring();
        }
      }
    }
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup interval when component unmounts
  React.useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  const handleBackfill = async () => {
    try {
      const currentDate = new Date(selectedDate);
      currentDate.setFullYear(currentDate.getFullYear() - 100);
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Set status to in_progress immediately to show animation
      if (!supabase) {
        return;
      }
      
      const { error } = await supabase
        .from('news')
        .upsert({
          date: dateString,
          backfill_status: 'in_progress',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'date'
        });
        
      if (error) {
        return;
      }
      
      // Immediately update local state to show animation
      setBackfillStatus('in_progress');
      
      // Clear checked dates since we're starting a new backfill
      setCheckedDates(new Set());
      
      // Start periodic status checks
      startStatusChecks(dateString);
      
      // Call GitHub API directly
      const response = await fetch(`https://api.github.com/repos/hemenduroy/2100-news/dispatches`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${process.env.REACT_APP_GH_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'backfill-news',
          client_payload: {
            date: dateString,
            mark_as_no_data: false
          }
        })
      });
      
      if (response.ok) {
        // Success - status will be updated by GitHub Action
      } else {
        // Reset status on error using direct Supabase call
        if (supabase) {
          await supabase
            .from('news')
            .upsert({
              date: dateString,
              backfill_status: null,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'date'
            });
        }
      }
    } catch (error) {
      // Error handling - status will be reset by GitHub Action
    }
  };

  if (loading && (!news || news.length === 0)) {
    return (
      <div className="news-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Scanning temporal frequencies...</p>
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="news-container">
        <div className="empty-state">
          <h2 className="empty-title">
            {noDataAvailable ? 'No Data Available' : 'Temporal Distortion Detected'}
          </h2>
          <p className="empty-text">
            {noDataAvailable 
              ? `No news data available for ${format(selectedDate, 'MMMM d, yyyy')}. This date has been permanently marked as having no data.`
              : `No news data available for ${format(selectedDate, 'MMMM d, yyyy')}. The temporal feed may be experiencing interference.`
            }
          </p>
          {!noDataAvailable && (
            <div className="backfill-section">
              <p className="backfill-text">
                Want to try to fetch news for this date?
              </p>
              {backfillStatus === 'in_progress' ? (
                <ProcessingAnimation isDarkMode={isDarkMode} />
              ) : (
                <button 
                  className={`backfill-button ${isDarkMode ? 'dark' : 'light'}`}
                  onClick={handleBackfill}
                  disabled={backfillStatus === 'in_progress'}
                >
                  Initiate Uplink
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="news-container">
      <div className="news-header" style={{ position: 'relative' }}>
        <h2 className="news-date">
          News from {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h2>
        <p className="news-count">{news.length} records fetched</p>
        {/* Inline arrows directly under header; align to container edges and follow theme */}
        <div style={{ marginTop: '8px', width: '100%' }}>
          <EdgeArrows inline onPreviousDay={onPreviousDay} onNextDay={onNextDay} isDarkMode={isDarkMode} canGoNext={canGoNext} />
        </div>
      </div>
      
      <div className={`news-grid ${isDarkMode ? 'dark' : 'light'}`} style={{ position: 'relative', '--edge-top': 'calc(100px + 2rem)' }}>
        {news.map((article, index) => (
          <NewsCard 
            key={`${article.id}-${index}`}
            article={article}
            index={index}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
    </div>
  );
};

export default NewsGrid; 