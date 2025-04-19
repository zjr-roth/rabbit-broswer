import React from 'react';
import { FiClock, FiX } from 'react-icons/fi';

/**
 * HistorySidebar component that slides in from the right side of the screen
 * Adapted for browser usage
 */
const HistorySidebar = ({
  history = [],
  onSelectHistoryItem,
  visible = false,
  onToggleVisibility
}) => {
  // Format the timestamp for display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Handle history item selection
  const handleSelectItem = (entry) => {
    if (onSelectHistoryItem) {
      onSelectHistoryItem(entry);
    }
  };

  return (
    <>
      {/* Overlay when sidebar is visible on mobile */}
      {visible && (
        <div
          className="sidebar-overlay"
          onClick={onToggleVisibility}
        />
      )}

      {/* Toggle button - always visible */}
      <button
        className="sidebar-toggle"
        onClick={onToggleVisibility}
        aria-label={visible ? "Close history" : "Open history"}
      >
        {visible ? <FiX size="20" /> : <FiClock size="20" />}
      </button>

      {/* Sidebar with history items */}
      <div className={`history-sidebar ${visible ? 'visible' : 'hidden'}`}>
        <div className="sidebar-header">
          <h3>
            <FiClock className="header-icon" />
            Recent Thoughts
          </h3>
        </div>

        <div className="sidebar-content">
          {history && history.length > 0 ? (
            <ul className="history-list">
              {history.map((entry, index) => (
                <li
                  key={`${entry.timestamp}-${index}`}
                  className="history-item"
                  onClick={() => handleSelectItem(entry)}
                >
                  <div className="history-item-inner">
                    <div className="history-item-content">
                      <div className="history-item-text">
                        {entry.input}
                      </div>
                      <div className="history-item-time">
                        {formatTime(entry.timestamp)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-history">
              <p>No thoughts yet</p>
              <div className="empty-history-sub">
                Start typing to generate your first thought
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;