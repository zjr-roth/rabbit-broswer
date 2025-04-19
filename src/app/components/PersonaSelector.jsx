import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

/**
 * PersonaSelector component for choosing AI response styles
 * Adapted for browser usage
 */
const PersonaSelector = ({
  personas = [],
  selectedPersona,
  onSelectPersona,
  usePersona = false,
  onTogglePersona = () => {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Filter out the default AI Assistant from the persona options
  const filteredPersonas = personas.filter(p => p.id !== 'default');

  // Use a safe selected persona
  const safeSelectedPersona = selectedPersona || { icon: '🤖', name: 'AI Assistant' };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectPersona = (persona) => {
    if (persona && onSelectPersona) {
      onSelectPersona(persona);
      onTogglePersona(true); // Enable persona usage when selecting a persona
    }
    setIsOpen(false);
  };

  // Set tooltip text based on whether a persona is in use
  const tooltipText = usePersona
    ? safeSelectedPersona.name
    : "Choose a persona";

  return (
    <div className="persona-selector-container" ref={dropdownRef}>
      <button
        className={`persona-button ${!usePersona ? 'persona-disabled' : ''}`}
        onClick={toggleDropdown}
        aria-label={tooltipText}
      >
        <span className="persona-field">{usePersona ? safeSelectedPersona.icon : '🤖'}</span>
        <span className="persona-tooltip">{tooltipText}</span>
      </button>

      {isOpen && (
        <div className="persona-dropdown">
          <div className="persona-toggle-container">
            <span>Use Persona</span>
            <button
              className="persona-toggle-button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePersona(!usePersona);
              }}
            >
              {usePersona ?
                <div className="toggle-on">ON</div> :
                <div className="toggle-off">OFF</div>
              }
            </button>
          </div>

          <div className="persona-divider"></div>

          {/* Only show non-default personas */}
          {filteredPersonas.map(persona => (
            <div
              key={persona.id}
              className={`persona-option ${usePersona && selectedPersona && selectedPersona.id === persona.id ? 'selected' : ''}`}
              onClick={() => handleSelectPersona(persona)}
            >
              <span className="persona-icon" style={{ color: persona.color }}>{persona.icon || '🤖'}</span>
              <div className="persona-details">
                <span className="persona-option-name">{persona.name || 'Unknown'}</span>
                <span className="persona-description">{persona.description || ''}</span>
              </div>
              {usePersona && selectedPersona && selectedPersona.id === persona.id && (
                <FiCheck className="persona-check" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonaSelector;