'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ResultBlock from './components/ResultBlock';
import HistorySidebar from './components/HistorySidebar';
import PersonaSelector from './components/PersonaSelector';
import EnhancedInputField from './components/InputField';
import ThoughtStream from './components/ThoughtStream';
import RelatedThoughts from './components/RelatedThoughts';
import llmService from './services/llmService';
import storageService from './services/storageService';
import personaService from './services/personaService';
import { getLLMParameterRecommendations } from './helpers/helperFunctions';
import { FiX, FiClock, FiAlertTriangle } from 'react-icons/fi';
import './globals.css';

function App() {
  // State management
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationThread, setConversationThread] = useState([]);
  const [expandedThreadIndex, setExpandedThreadIndex] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [history, setHistory] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [llmSettings, setLlmSettings] = useState(getLLMParameterRecommendations('balanced'));
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [usePersona, setUsePersona] = useState(false);
  const [placeholder, setPlaceholder] = useState("Ask anything...");
  const [apiStatus, setApiStatus] = useState({
    checked: false,
    configured: false,
    message: "Checking API configuration..."
  });

  // Refs for elements
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const currentThreadRef = useRef(null);

  // Random thoughts for suggestions
  const RANDOM_THOUGHTS = [
    "What if consciousness is fundamental to the universe?",
    "Could all human motivation be reduced to seeking pleasure and avoiding pain?",
    "How might society change if we lived twice as long?",
    "Is language a tool for thinking or just for communication?",
    "Do our technological tools enhance or diminish our humanity?",
    "What if we optimized education for curiosity instead of test scores?",
    "How would society change if we could read each other's thoughts?",
    "Is reality objective or constructed by our perceptions?",
    "What would happen if money had an expiration date?",
    "Could emotions be accurately mapped and quantified?",
    "What if we could upload memories to a digital cloud?",
    "How might art evolve if machines became the primary creators?",
    "Is free will an illusion created by neural processes?",
    "What if every decision you made created a parallel universe?",
    "Can morality exist without religion or cultural norms?",
    "What if we could communicate with plants at a consciousness level?",
    "How would life change if we all shared one global language?",
    "Are we living in a simulation, and how would we know?",
    "What if time travel was possible only for observing, not interacting?",
    "Could society function without any form of government?",
    "What if dreams were messages from an alternate reality?",
    "Is beauty universal or entirely subjective?",
    "What if true empathy could be programmed into AI?",
    "Could memories be erased and replaced like software updates?",
    "What if we could see the world through someone else's eyes at will?",
    "Is there a limit to human creativity, or is it infinite?",
    "What if language determined the limits of our reality?",
    "Could we ever achieve a society without conflict?",
    "What if every person on Earth shared the same experience simultaneously?",
    "How would human relationships change if we could never lie?"
  ];

  // Check API configuration on mount
  useEffect(() => {
    const checkApiConfiguration = async () => {
      try {
        const response = await fetch('/api/llm/status', {
          method: 'GET',
          cache: 'no-store'
        });

        if (response.ok) {
          const data = await response.json();
          setApiStatus({
            checked: true,
            configured: data.configured,
            message: data.message
          });

          // Update placeholder based on API status
          if (!data.configured) {
            setPlaceholder("API key not configured. Please check .env file.");
          }
        } else {
          setApiStatus({
            checked: true,
            configured: false,
            message: "Error checking API configuration"
          });
          setPlaceholder("Could not verify API configuration");
        }
      } catch (error) {
        console.error('Error checking API configuration:', error);
        setApiStatus({
          checked: true,
          configured: false,
          message: "Could not connect to API server"
        });
        setPlaceholder("Could not connect to API server");
      }
    };

    checkApiConfiguration();
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (expandedThreadIndex === null && conversationThread.length > 0) {
      // Scroll the newly appended entry (last in array) up to the top
      const lastIndex = conversationThread.length - 1;
      document.getElementById(`thread-${lastIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (expandedThreadIndex !== null) {
      // When expanding an old entry, scroll that into view
      currentThreadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [conversationThread.length, expandedThreadIndex]);

  // Load initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load history from browser storage
        const savedHistory = await storageService.getHistory();
        if (savedHistory && Array.isArray(savedHistory) && savedHistory.length) {
          setHistory(savedHistory);
        } else {
          setHistory([]);
        }

        // Initialize with default personas if the service is available
        let availablePersonas = [];
        let defaultPersona = null;

        try {
          // Check if personaService is correctly loaded
          if (personaService && typeof personaService.getAllPersonas === 'function') {
            availablePersonas = personaService.getAllPersonas() || [];
            defaultPersona = personaService.getDefaultPersona();
          } else {
            // Fallback default persona if service is unavailable
            defaultPersona = {
              id: 'default',
              name: 'AI Assistant',
              icon: '🤖',
              color: '#038a29',
              description: 'Balanced responses',
              instruction: 'Provide a thoughtful, balanced response.'
            };
            availablePersonas = [defaultPersona];
          }
        } catch (personaError) {
          console.error('Error loading personas:', personaError);
          // Fallback if there's an error
          defaultPersona = {
            id: 'default',
            name: 'AI Assistant',
            icon: '🤖',
            color: '#038a29',
            description: 'Balanced responses',
            instruction: 'Provide a thoughtful, balanced response.'
          };
          availablePersonas = [defaultPersona];
        }

        setPersonas(availablePersonas);
        setSelectedPersona(defaultPersona);
        setUsePersona(false); // Start with no persona by default

      } catch (err) {
        console.error('Failed to load initial data:', err);
        setHistory([]);

        // Ensure we still have a default persona even on error
        const fallbackPersona = {
          id: 'default',
          name: 'AI Assistant',
          icon: '🤖',
          color: '#038a29',
          description: 'Balanced responses',
          instruction: 'Provide a thoughtful, balanced response.'
        };
        setPersonas([fallbackPersona]);
        setSelectedPersona(fallbackPersona);
      }
    };

    loadInitialData();

    // Theme Handling - use browser preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);

    // Listen for theme changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener('change', handleDarkModeChange);

    return () => {
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
    };
  }, []);

  // Toggle sidebar visibility
  const toggleSidebar = useCallback(() => {
    setSidebarVisible(prev => !prev);
  }, []);

  // Toggle persona usage on/off
  const togglePersonaUsage = useCallback((value) => {
    setUsePersona(typeof value === 'boolean' ? value : !usePersona);
  }, [usePersona]);

  // Handle persona selection
  const handleSelectPersona = useCallback((persona) => {
    if (persona) {
      setSelectedPersona(persona);
    }
  }, []);

  // Handle input change
  const handleInputChange = useCallback((value) => {
    setInput(value);
  }, []);

  // Generate initial preview responses
  const generateResponses = useCallback(async (inputText) => {
    // Don't proceed if API is not configured
    if (!apiStatus.configured) {
      alert('API key not configured. Please set OPENAI_API_KEY in your .env file.');
      return;
    }

    const textToProcess = (inputText || input).trim();
    if (!textToProcess || isGenerating) return;

    setIsGenerating(true);
    const displayInput = textToProcess;
    if (!inputText) { // Clear input only if submitted via button/enter
        setInput('');
    }

    // Create a new thread entry
    const newThreadEntry = {
      id: Date.now(),
      timestamp: Date.now(),
      input: displayInput,
      results: { // Initialize results structure
        expansion: { title: 'Expansion', preview: '', fullContent: null, streamingContent: '', isLoading: false, generated: false },
        contrarian: { title: 'Contrarian Take', preview: '', fullContent: null, streamingContent: '', isLoading: false, generated: false },
        synapse: { title: 'Synapse Link', preview: '', fullContent: null, streamingContent: '', isLoading: false, generated: false }
      },
      expandedSection: null, // No section expanded initially
      relatedThoughts: [], // Initialize empty related thoughts
      showRelatedThoughts: false, // Initially false
      persona: usePersona && selectedPersona ? {
        id: selectedPersona.id,
        name: selectedPersona.name,
        icon: selectedPersona.icon,
        color: selectedPersona.color,
        instruction: selectedPersona.instruction // Pass instruction for prompt building
      } : null
    };

    // Add to conversation thread
    setConversationThread(prevThread => [...prevThread, newThreadEntry]);

    // Close any previously expanded section
    setExpandedSection(null);
    setExpandedThreadIndex(null);

    try {
      // Add to history (ensure history is array)
      const currentHistory = Array.isArray(history) ? history : [];
      const newHistoryEntry = {
        timestamp: newThreadEntry.timestamp,
        input: newThreadEntry.input,
        // Store persona used for this entry in history
        persona: newThreadEntry.persona ? { id: newThreadEntry.persona.id, name: newThreadEntry.persona.name } : null,
      };
      const updatedHistory = [newHistoryEntry, ...currentHistory];
      setHistory(updatedHistory);
      await storageService.saveHistory(updatedHistory);

    } catch (error) {
      console.error('Error generating responses or saving history:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [input, isGenerating, history, selectedPersona, usePersona, apiStatus.configured]);

  // FIXED: Handle card click to expand/collapse with correct parameter order
  const handleCardClick = useCallback(async (section, threadIndex) => {
    if (typeof threadIndex !== 'number' || !section) return;

    const currentThreadEntry = conversationThread[threadIndex];
    if (!currentThreadEntry) return;

    // --- Collapse Logic ---
    if (expandedThreadIndex === threadIndex && expandedSection === section) {
      setExpandedSection(null);
      setExpandedThreadIndex(null);
      return;
    }

    // --- Expand Logic ---
    setExpandedSection(section);
    setExpandedThreadIndex(threadIndex);
    // Set the ref for scrolling *before* potential async operations
    currentThreadRef.current = document.getElementById(`thread-${threadIndex}`);

    const currentResults = currentThreadEntry.results[section];
    const personaToUse = currentThreadEntry.persona; // Use the persona stored in the thread entry

    // Check if content needs generation
    if (!currentResults.generated) {
      // Set loading state specifically for this section
      setConversationThread(prevThread => {
        const updatedThread = [...prevThread];
        if (updatedThread[threadIndex]) {
          const updatedResults = { ...updatedThread[threadIndex].results };
          updatedResults[section] = {
            ...updatedResults[section],
            isLoading: true,
            streamingContent: '' // Reset streaming content
          };
          updatedThread[threadIndex] = {
            ...updatedThread[threadIndex],
            results: updatedResults,
            showRelatedThoughts: false, // Hide related thoughts while generating
            relatedThoughts: [] // Clear old related thoughts
          };
        }
        return updatedThread;
      });

      let finalContent = '';
      try {
        console.log(`Generating content for ${section} with streaming enabled`);

        // FIXED: Generate full content via streaming with CORRECT PARAMETER ORDER
        finalContent = await llmService.generateFullContent(
          section,                   // The content type
          currentThreadEntry.input,  // The user input
          personaToUse,              // Persona (correctly positioned)
          (chunk, fullResponse) => { // onChunk callback function
            console.log(`Received chunk of ${chunk.length} characters`);
            // Update streaming content in state progressively
            setConversationThread(prevThread => {
              const updatedThread = [...prevThread];
              // Check if the thread entry and section still exist (user might have closed it)
              if (updatedThread[threadIndex]?.results?.[section]) {
                updatedThread[threadIndex].results[section].streamingContent = fullResponse ?? '';
              }
              return updatedThread;
            });
          }
        );

        console.log(`Content generation complete for ${section}`);

        // --- Content Generation Finished ---
        // Now generate related thoughts using the final content
        let relatedThoughtsResult = [];
        if (finalContent && finalContent.trim().length > 0) {
            relatedThoughtsResult = await llmService.generateRelatedThoughts(finalContent);
        } else {
            console.warn("Full content generation resulted in empty content, skipping related thoughts.");
        }

        // Update state one final time after everything is done
        setConversationThread(prevThread => {
          const updatedThread = [...prevThread];
          if (updatedThread[threadIndex]) {
            const updatedResults = { ...updatedThread[threadIndex].results };
            updatedResults[section] = {
              ...updatedResults[section],
              fullContent: finalContent, // Store final complete content
              generated: true,          // Mark as generated
              isLoading: false,         // Turn off loading
              // streamingContent could be cleared here if desired, or kept same as fullContent
            };
            updatedThread[threadIndex] = {
              ...updatedThread[threadIndex],
              results: updatedResults,
              relatedThoughts: relatedThoughtsResult, // Set the generated thoughts
              showRelatedThoughts: relatedThoughtsResult.length > 0 // Show if thoughts were generated
            };
          }
          return updatedThread;
        });

      } catch (error) {
        console.error(`Error generating full content or related thoughts for ${section}:`, error);
        // Reset loading state on error and potentially show an error message
        setConversationThread(prevThread => {
          const updatedThread = [...prevThread];
          if (updatedThread[threadIndex]?.results?.[section]) {
            updatedThread[threadIndex].results[section].isLoading = false;
            updatedThread[threadIndex].results[section].fullContent = "Error generating content."; // Placeholder error
            updatedThread[threadIndex].results[section].generated = true; // Mark as generated (with error)
            updatedThread[threadIndex].relatedThoughts = [];
            updatedThread[threadIndex].showRelatedThoughts = false;
          }
          return updatedThread;
        });
      }
    } else {
        // Content was already generated, just ensure related thoughts are shown if they exist
        setConversationThread(prevThread => {
            const updatedThread = [...prevThread];
            if (updatedThread[threadIndex]) {
                updatedThread[threadIndex] = {
                    ...updatedThread[threadIndex],
                    // Ensure showRelatedThoughts reflects existing thoughts
                    showRelatedThoughts: (updatedThread[threadIndex].relatedThoughts?.length || 0) > 0
                };
            }
            return updatedThread;
        });
    }

    // Ensure scroll happens after state update cycle
    setTimeout(() => {
        currentThreadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);

  }, [conversationThread, expandedSection, expandedThreadIndex]);

  // Handle closing an expanded card
  const handleCloseCard = useCallback(() => {
    setExpandedSection(null);
    setExpandedThreadIndex(null);
  }, []);

  // Copy content to clipboard
  const copyToClipboard = useCallback((text) => {
    if (text) {
      try {
        navigator.clipboard.writeText(text)
          .catch(err => console.error('Failed to copy:', err));
        // Optional: add visual feedback for successful copy
      } catch (error) {
        console.error('Copy operation failed:', error);
      }
    }
  }, []);

  // Handle related thought click
  const handleRelatedThoughtClick = useCallback((thought) => {
    if (thought && typeof thought === 'string') {
      // trigger a new generation cycle
      generateResponses(thought); // Pass the thought directly
    }
  }, [generateResponses]); // Depend on generateResponses

  // Load history item
  const loadHistoryItem = useCallback((entry) => {
    if (!entry || !entry.input) return;

    setInput(entry.input); // Set input field

    // Create a new thread entry structure matching the current state shape
    const newThreadEntry = {
      id: Date.now(), // New ID for this session instance
      timestamp: entry.timestamp || Date.now(),
      input: entry.input,
      results: { // Reset results
        expansion: { title: 'Expansion', preview: '', fullContent: null, streamingContent: '', isLoading: false, generated: false },
        contrarian: { title: 'Contrarian Take', preview: '', fullContent: null, streamingContent: '', isLoading: false, generated: false },
        synapse: { title: 'Synapse Link', preview: '', fullContent: null, streamingContent: '', isLoading: false, generated: false }
      },
      expandedSection: null,
      relatedThoughts: [],
      showRelatedThoughts: false,
      persona: null // Initialize persona as null
    };

    // Attempt to load persona if it exists in the history entry
    let loadedPersona = null;
    if (entry.persona && entry.persona.id) {
      try {
        // Find the full persona object from the available personas
        loadedPersona = personas.find(p => p.id === entry.persona.id) || personaService.getPersonaById(entry.persona.id);
        if (loadedPersona) {
          newThreadEntry.persona = { // Store necessary details
             id: loadedPersona.id,
             name: loadedPersona.name,
             icon: loadedPersona.icon,
             color: loadedPersona.color,
             instruction: loadedPersona.instruction // Keep instruction if needed by llmService
          };
          setSelectedPersona(loadedPersona); // Update the global selector state
          setUsePersona(true); // Enable persona mode
        } else {
           setUsePersona(false); // Persona from history not found
        }
      } catch (error) {
        console.error('Error loading persona from history:', error);
        setUsePersona(false);
      }
    } else {
      // No persona in this history entry, disable persona mode
      setUsePersona(false);
    }

    // Replace the conversation thread with just this entry
    setConversationThread([newThreadEntry]);

    // Reset expansion state
    setExpandedSection(null);
    setExpandedThreadIndex(null);

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      setSidebarVisible(false);
    }
  }, [personas]); // Add personas as dependency

  // Get a random thought
  const getRandomThought = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * RANDOM_THOUGHTS.length);
    setInput(RANDOM_THOUGHTS[randomIndex]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Clear the conversation thread
  const clearConversation = useCallback(() => {
    setConversationThread([]);
    setExpandedSection(null);
    setExpandedThreadIndex(null);
  }, []);

  // --- Render ---
  return (
    <div className={`window-wrapper ${isDarkMode ? 'dark' : 'light'}`}>
      <div className={`app-container ${isDarkMode ? 'dark' : 'light'}`}>
        {/* Main conversation thread area */}
        <div className="thread-layout" ref={wrapperRef}>
          {conversationThread.length === 0 && (
            <div className="empty-conversation">
                <h2>Welcome to Rabbit</h2>
                <p>Drop a thought below to start exploring different perspectives.</p>
            </div>
          )}

          {/* Render each thread entry */}
          {conversationThread.map((threadEntry, threadIndex) => {
            // Determine if the current thread item is the one that's expanded
            const isExpanded = expandedThreadIndex === threadIndex;
            const currentExpandedSection = isExpanded ? expandedSection : null;
            const resultsForExpandedSection = currentExpandedSection ? threadEntry.results[currentExpandedSection] : null;

            return (
              <div
                key={threadEntry.id} // Use stable ID
                className="thread-entry"
                id={`thread-${threadIndex}`}
                ref={isExpanded ? currentThreadRef : null} // Assign ref if this is the expanded item
              >
                {/* User's input display */}
                <div className="user-thought-display">
                  <div className="user-thought-header">
                    <div className="user-thought-icon">You</div>
                    <div className="user-thought-timestamp">
                      {new Date(threadEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p>{threadEntry.input}</p>
                </div>

                {/* AI response section */}
                <div className="ai-response-section">
                  {/* Non-expanded view: horizontal cards */}
                  {!currentExpandedSection && (
                    <div className="card-horizontal-container">
                      {Object.keys(threadEntry.results).map((key) => (
                        <ResultBlock
                          key={key}
                          title={threadEntry.results[key].title}
                          preview={threadEntry.results[key].preview || ''} // Show preview if available
                          isExpanded={false}
                          // Show loading only if this specific card is clicked and generating
                          isLoading={false} // Loading handled by ThoughtStream now
                          onClick={() => handleCardClick(key, threadIndex)}
                          onCopy={() => copyToClipboard(threadEntry.results[key].fullContent)}
                          persona={threadEntry.persona}
                        />
                      ))}
                    </div>
                  )}

                  {/* Expanded view: full thought stream */}
                  {isExpanded && currentExpandedSection && resultsForExpandedSection && (
                    <div className="thought-stream-container">
                      <ThoughtStream
                        section={currentExpandedSection}
                        // Use streamingContent during loading, fallback to fullContent
                        content={resultsForExpandedSection.isLoading
                                  ? resultsForExpandedSection.streamingContent
                                  : resultsForExpandedSection.fullContent}
                        isLoading={resultsForExpandedSection.isLoading}
                        onClose={handleCloseCard} // Use the simplified close handler
                        onCopy={() => copyToClipboard(resultsForExpandedSection.fullContent)}
                        persona={threadEntry.persona}
                      />
                    </div>
                  )}

                  {/* Dedicated RelatedThoughts component rendered *after* ThoughtStream */}
                  {/* Show only if this thread is expanded AND related thoughts exist AND content is not loading */}
                  {isExpanded && !resultsForExpandedSection?.isLoading && threadEntry.showRelatedThoughts && threadEntry.relatedThoughts?.length > 0 && (
                    <div className="related-thoughts-wrapper">
                        <RelatedThoughts
                          thoughts={threadEntry.relatedThoughts}
                          onThoughtClick={handleRelatedThoughtClick}
                        />
                    </div>
                  )}
                </div>
              </div>
            );
          })}


        </div>

        {/* Input container fixed at bottom */}
        <div className="input-container">
          <EnhancedInputField
            ref={inputRef} // Pass ref if needed by EnhancedInputField
            value={input}
            onChange={handleInputChange}
            onGenerate={() => generateResponses()} // Call without args to use state `input`
            isGenerating={isGenerating}
            placeholder={placeholder} // Use placeholder state
            personas={personas}
            selectedPersona={selectedPersona}
            onSelectPersona={handleSelectPersona}
            usePersona={usePersona}
            onTogglePersona={togglePersonaUsage}
            // Pass getRandomThought if the input field has a button for it
            onRandomThought={getRandomThought}
            // Indicate if there's content to potentially clear
            hasContent={conversationThread.length > 0}
            // Disable input if API is not configured
            disabled={!apiStatus.configured}
          />
        </div>

        {/* Action buttons (e.g., Clear Conversation) */}
        {conversationThread.length > 0 && (
          <div className="action-buttons">
            <button className="clear-conversation" onClick={clearConversation} title="Clear current conversation">
              <FiX size="14" /> Clear
            </button>
          </div>
        )}

        {/* History sidebar */}
        <HistorySidebar
          history={history}
          onSelectHistoryItem={loadHistoryItem}
          visible={sidebarVisible}
          onToggleVisibility={toggleSidebar}
        />
      </div>
    </div>
  );
}

export default App;