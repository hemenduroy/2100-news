import React from 'react';
import './EdgeArrows.css';

// Arrows that can be: fixed overlay (default) or inline within the news section
const EdgeArrows = ({ onPreviousDay, onNextDay, canGoPrev = true, canGoNext = true, isDarkMode, withinHeader = false, inline = false }) => {
  const wrapperClass = inline ? 'edge-arrows inline' : `edge-arrows ${withinHeader ? 'within-header' : ''}`;
  return (
    <div className={`${wrapperClass} ${isDarkMode ? 'dark' : 'light'}`} aria-hidden="false">
      <button
        className={`edge-button ${inline ? '' : 'edge-left'} ${!canGoPrev ? 'disabled' : ''}`}
        onClick={onPreviousDay}
        aria-label="Previous day"
        disabled={!canGoPrev}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15,18 9,12 15,6"></polyline>
        </svg>
      </button>

      <button
        className={`edge-button ${inline ? '' : 'edge-right'} ${!canGoNext ? 'disabled' : ''}`}
        onClick={onNextDay}
        aria-label="Next day"
        disabled={!canGoNext}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"></polyline>
        </svg>
      </button>
    </div>
  );
};

export default EdgeArrows;


