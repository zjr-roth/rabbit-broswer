import React from 'react';
import { FiCopy, FiX } from 'react-icons/fi';

/**
 * ResultBlock component for displaying preview cards in horizontal layout
 * Enhanced for browser usage
 */
const ResultBlock = ({
  title,
  preview,
  isExpanded = false,
  isLoading = false,
  onClick,
  onCopy,
  onClose,
  persona = null,
  streamingContent = null,
  fullContent = null
}) => {
  // Prevent propagation when clicking copy button
  const handleCopyClick = (e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    if (onCopy && typeof onCopy === 'function') {
      onCopy();
    }
  };

  // Handle close button click with proper event handling
  const handleCloseClick = (e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  // Safe click handler for main component
  const handleClick = () => {
    if (onClick && typeof onClick === 'function') {
      onClick();
    }
  };

  // Personalized border color if persona is defined
  const borderStyle = persona ? { borderColor: persona.color } : {};

  return (
    <div
      className={`result-block ${isExpanded ? 'expanded' : ''}`}
      onClick={handleClick}
      style={borderStyle}
    >
      <div className="result-header">
        <h3>
          {persona && <span className="persona-icon">{persona.icon}</span>} {title}
        </h3>
        {!isExpanded && (
          <button
            className="copy-button"
            onClick={handleCopyClick}
            aria-label="Copy content"
          >
            <FiCopy size="14"/>
          </button>
        )}
      </div>

      {isExpanded ? (
        <>
          <button
            className="close-button"
            onClick={handleCloseClick}
            aria-label="Close"
          >
            <FiX size="16"/>
          </button>
          <button
            className="copy-button"
            onClick={handleCopyClick}
            aria-label="Copy content"
          >
            <FiCopy size="16"/>
          </button>

          <div className="full-content">
            {isLoading ? (
              <div className="loading-indicator">
                <div className="spinner"></div>
                <p>Generating full analysis...</p>
              </div>
            ) : (
              <div>
                {streamingContent || fullContent || preview}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="preview-content">
          <p>Click to view</p>
        </div>
      )}

      {/* Blinking cursor for streaming effect */}
      {isExpanded && isLoading && (
        <span className="blinking-cursor"></span>
      )}
    </div>
  );
};

export default ResultBlock;