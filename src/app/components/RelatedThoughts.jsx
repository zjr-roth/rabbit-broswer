import React from 'react';
import { FiMessageSquare, FiChevronRight } from 'react-icons/fi';

/**
 * RelatedThoughts component displays dynamically generated follow-up questions
 * Adapted for browser usage
 */
const RelatedThoughts = ({
  thoughts = [],
  onThoughtClick,
}) => {
  // Return null if no thoughts array or it's empty
  if (!Array.isArray(thoughts) || thoughts.length === 0) {
    return null;
  }

  return (
    <div className="related-thoughts-container">
      <h3 className="related-thoughts-header">
        <FiMessageSquare size="16" style={{ marginRight: '8px' }}/>
        Related Thoughts
      </h3>
      <div className="related-thoughts-list">
        {thoughts.map((thought, index) => (
          // Ensure thought is a string before rendering
          typeof thought === 'string' && thought.trim() !== '' ? (
            <div
              key={index}
              className="related-thought-item"
              onClick={() => onThoughtClick(thought)}
              title={thought}
            >
              <span>{thought}</span>
              <FiChevronRight size="16" className="thought-arrow" />
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
};

export default RelatedThoughts;