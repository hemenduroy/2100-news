import React from 'react';
import { format } from 'date-fns';
import './Header.css';

const Header = ({ currentDate, onCalendarClick, onGoToToday, onThemeToggle, isDarkMode, onPreviousDay, onNextDay, canGoNext = true }) => {
  const isDark = isDarkMode;

  const handleCalendarClick = (e) => {
    e.stopPropagation(); // Prevent event from bubbling up
    onCalendarClick();
  };

  const handleGoToToday = (e) => {
    e.stopPropagation(); // Prevent event from bubbling up
    onGoToToday();
  };

  const handleThemeToggle = (e) => {
    e.stopPropagation(); // Prevent event from bubbling up
    onThemeToggle();
  };

  const handlePreviousDay = (e) => {
    e.stopPropagation();
    onPreviousDay();
  };

  const handleNextDay = (e) => {
    e.stopPropagation();
    onNextDay();
  };

  return (
    <header className={`header ${isDark ? 'dark' : 'light'}`}>
      <div className="container">
        <div className="header-content">
          <div className="header-left">
            <h1 className="logo">2100</h1>
            <p className="tagline">If Humanity skipped a Century</p>
          </div>
          
          <div className="header-right">
            <div className="header-buttons">
              {/* Desktop Navigation */}
              <div className="date-navigation desktop-only">
                <button 
                  className="nav-arrow"
                  onClick={handlePreviousDay}
                  aria-label="Previous day"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15,18 9,12 15,6"></polyline>
                  </svg>
                </button>
                
                <button 
                  className="calendar-button"
                  onClick={handleCalendarClick}
                  aria-label="Select date"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>{format(currentDate, 'MMM d, yyyy')}</span>
                </button>
                
                <button 
                  className={`nav-arrow ${!canGoNext ? 'disabled' : ''}`}
                  onClick={handleNextDay}
                  aria-label="Next day"
                  disabled={!canGoNext}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9,18 15,12 9,6"></polyline>
                  </svg>
                </button>
                
                <button 
                  className="today-button"
                  onClick={handleGoToToday}
                  aria-label="Go to today"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12,6 12,12 16,14"></polyline>
                  </svg>
                  <span>Today</span>
                </button>
              </div>
              
              {/* Mobile Navigation */}
              <div className="mobile-only">
                <div className="mobile-nav-buttons">
                  <button 
                    className="mobile-calendar-button"
                    onClick={handleCalendarClick}
                    aria-label="Select date"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>Date</span>
                  </button>
                  
                  <button 
                    className="mobile-today-button"
                    onClick={handleGoToToday}
                    aria-label="Go to today"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12,6 12,12 16,14"></polyline>
                    </svg>
                    <span>Today</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="theme-toggle">
            <div className="toggle-container">
              <button 
                className={`toggle-option ${!isDark ? 'active' : ''}`}
                onClick={handleThemeToggle}
                aria-label="Light mode"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              </button>
              
              <button 
                className={`toggle-option ${isDark ? 'active' : ''}`}
                onClick={handleThemeToggle}
                aria-label="Dark mode"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 