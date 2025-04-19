/**
 * Helper utility functions
 * Adapted for browser usage (unchanged from original)
 */

// Format timestamp to readable date
const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Generate a unique ID for items
  const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  // Truncate text to a specific length with ellipsis
  const truncateText = (text, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Simple debounce function
  const debounce = (func, delay) => {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  };

  // LLM parameter optimization recommendations
  const getLLMParameterRecommendations = (purpose) => {
    const recommendations = {
      creative: {
        temperature: 0.8,
        topP: 0.9,
        topK: 50,
        description: "Higher creativity, more diverse responses"
      },
      precise: {
        temperature: 0.3,
        topP: 0.7,
        topK: 20,
        description: "More focused, precise responses"
      },
      balanced: {
        temperature: 0.6,
        topP: 0.8,
        topK: 40,
        description: "Balance between creativity and focus"
      }
    };

    return recommendations[purpose] || recommendations.balanced;
  };

  export {
    formatTimestamp,
    generateId,
    truncateText,
    debounce,
    getLLMParameterRecommendations
  };