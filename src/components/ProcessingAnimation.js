import React from 'react';
import './ProcessingAnimation.css';

const ProcessingAnimation = ({ isDarkMode }) => {

  return (
    <div className="processing-animation-wrapper">
      {/* Animation Container */}
      <div className="processing-animation">
        {/* Folding Cube Spinner */}
        <div className="sk-folding-cube" style={{ margin: '0 auto 16px auto' }}>
          <div className="sk-cube1 sk-cube"></div>
          <div className="sk-cube2 sk-cube"></div>
          <div className="sk-cube4 sk-cube"></div>
          <div className="sk-cube3 sk-cube"></div>
        </div>
      </div>

      {/* Text - Separated from animation */}
      <div
        className="processing-text-standalone"
        style={{
          textAlign: 'center',
          marginTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <div
          style={{
            color: isDarkMode ? '#ffffff' : '#000000',
            fontSize: '1.1rem',
            fontWeight: 600,
            fontFamily: 'Space Mono, monospace',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}
        >
          Synchronizing
        </div>
        <div
          style={{
            color: isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)',
            fontSize: '0.85rem',
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
          }}
        >
          This can take up to 5 minutes
        </div>
      </div>
    </div>
  );
};

export default ProcessingAnimation;
