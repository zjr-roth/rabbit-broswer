import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { GoArrowRight } from 'react-icons/go';
import { FiRefreshCw } from 'react-icons/fi';
import PersonaSelector from './PersonaSelector';

/**
 * Enhanced input field component that grows with content
 * Adapted for browser usage
 */
const EnhancedInputField = forwardRef(({
  value,
  onChange,
  onGenerate,
  isGenerating,
  personas,
  selectedPersona,
  onSelectPersona,
  usePersona,
  onTogglePersona,
  hasResults = false,
  onRandomThought = () => {},
  onResetCollapsed = () => {},
  placeholder: propPlaceholder = "Ask anything..."
}, ref) => {
  const inputRef = useRef(null);
  const [placeholder, setPlaceholder] = useState(propPlaceholder);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isMultiline, setIsMultiline] = useState(false);
  const clickHandlerRef = useRef(null);

  const RANDOM_THOUGHTS = [
    "What if consciousness is fundamental to the universe?",
    "Could all human motivation be reduced to seeking pleasure and avoiding pain?",
    "How might society change if we lived twice as long?",
    "Is language a tool for thinking or just for communication?",
    "Do our technological tools enhance or diminish our humanity?",
    "What if we optimized education for curiosity instead of test scores?",
    "How would society change if we could read each other's thoughts?",
    "Is reality objective or constructed by our perceptions?"
  ];

  // Combine refs (from forwardRef and internal)
  React.useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  // Cycle through placeholders
  useEffect(() => {
    const placeholderInterval = setInterval(() => {
      const nextIndex = (placeholderIndex + 1) % RANDOM_THOUGHTS.length;
      setPlaceholderIndex(nextIndex);
      setPlaceholder(`Drop a thought...`);
    }, 8000);

    return () => clearInterval(placeholderInterval);
  }, [placeholderIndex]);

  // Safely remove event listeners on unmount
  useEffect(() => {
    return () => {
      // Cleanup function to remove any listeners
      if (inputRef.current && clickHandlerRef.current) {
        inputRef.current.removeEventListener('click', clickHandlerRef.current);
      }
    };
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (!inputRef.current) return;

    // Reset height to get accurate scrollHeight
    inputRef.current.style.height = 'auto';

    // Calculate new height based on content
    const newHeight = Math.max(48, Math.min(inputRef.current.scrollHeight, window.innerHeight * 0.45));
    inputRef.current.style.height = `${newHeight}px`;

    // Check if multiline (more than one row)
    setIsMultiline(inputRef.current.scrollHeight > 60);

  }, [value]);

  // Focus on mount and when generation completes
  useEffect(() => {
    if (inputRef.current && !isGenerating) {
      inputRef.current.focus();
    }
  }, [isGenerating]);

  // Handle key presses
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating && value.trim()) {
      e.preventDefault(); // Prevent new line on Enter
      handleGenerate();
    }
  };

  // Safely handle input changes
  const handleInputChange = (e) => {
    if (onChange && typeof onChange === 'function') {
      onChange(e.target.value);
    }
  };

  // Handle random thought generation
  const getRandomThought = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_THOUGHTS.length);
    if (onChange && typeof onChange === 'function') {
      onChange(RANDOM_THOUGHTS[randomIndex]);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle generate button click
  const handleGenerate = () => {
    if (onGenerate && typeof onGenerate === 'function' && !isGenerating && value.trim()) {
      // Store the current input to use when generating
      const currentInput = value.trim();

      // Clear the input field immediately
      if (onChange && typeof onChange === 'function') {
        onChange('');
      }

      // Call the generate function with the stored input
      onGenerate(currentInput);
    }
  };

  return (
    <div className="overall-input-area">
      <div className={`input-field-container ${isMultiline ? 'multiline' : ''}`}>
        <textarea
          ref={inputRef}
          className="thought-input"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={false}
          rows={1}
          autoFocus
        />

        <div className="input-buttons-wrapper">
          {/* Persona selector - always enabled */}
          <PersonaSelector
            personas={personas}
            selectedPersona={selectedPersona}
            onSelectPersona={onSelectPersona}
            usePersona={usePersona}
            onTogglePersona={onTogglePersona}
          />

          {/* Generate button - disabled while generating */}
          <button
            className="generate-button"
            onClick={handleGenerate}
            disabled={isGenerating || !value.trim()}
            title={isGenerating ? "Generating..." : "Generate"}
            aria-label={isGenerating ? "Generating thought" : "Generate thought"}
          >
            {isGenerating ? (
              <div className="spinner"></div>
            ) : (
              <GoArrowRight size="16px" />
            )}
          </button>
        </div>
      </div>

      {/* Random thought trigger - positioned below input */}
      <button
        className="random-text-trigger"
        onClick={onRandomThought || getRandomThought}
        disabled={isGenerating}
      >
        <FiRefreshCw size="12px" />
        Try a random thought
      </button>
    </div>
  );
});

export default EnhancedInputField;