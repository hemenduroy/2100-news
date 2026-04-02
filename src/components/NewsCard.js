import React, { useState } from 'react';
import { format } from 'date-fns';
import './NewsCard.css';

const NewsCard = ({ article, index, isDarkMode }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const formatTime = (dateString) => {
    if (!dateString) return 'Just now';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
      return format(date, 'MMM d');
    } catch {
      return 'Recent';
    }
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div 
      className={`news-card-container ${isDarkMode ? 'dark' : 'light'}`} 
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className={`news-card ${isFlipped ? 'flipped' : ''}`} onClick={handleCardClick}>
        {/* Front side - Futuristic news */}
        <div className="card-front">
          <div className="card-header">
            <div className="article-category">{article.category}</div>
            <div className="article-time">{formatTime(article.publishedAt)}</div>
          </div>
          
          <h3 className="article-title">{article.futuristicTitle}</h3>
          
          <p className="article-caption">{article.futuristicCaption}</p>
          
          <div className="card-footer">
            <div className="article-source">
              <span className="source-label">Source:</span>
              <span className="source-name">{article.source}</span>
            </div>
          </div>
        </div>

        {/* Back side - Original news */}
        <div className="card-back">
          <div className="card-header">
            <div className="article-category original">ORIGINAL</div>
            <div className="article-time">{formatTime(article.publishedAt)}</div>
          </div>
          
          <h3 className="article-title original-title">{article.originalTitle}</h3>
          
          <p className="article-caption original-caption">{article.description}</p>
          
          <div className="card-footer">
            <div className="article-source">
              <span className="source-label">Source:</span>
              <span className="source-name">{article.source}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsCard; 