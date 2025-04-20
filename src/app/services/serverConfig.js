/**
 * Server-side configuration service for LLM parameters
 * Centralizes model settings and prevents client-side manipulation
 */

// Default configuration values
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'gpt-4o-mini';
const DEFAULT_MAX_TOKENS = parseInt(process.env.DEFAULT_MAX_TOKENS || '1000');
const DEFAULT_TEMPERATURE = parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7');
const DEFAULT_TOP_P = parseFloat(process.env.DEFAULT_TOP_P || '0.95');

// Preset configurations for different response types
const PRESETS = {
  // Standard balanced preset (default)
  default: {
    model: DEFAULT_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    top_p: DEFAULT_TOP_P,
    max_tokens: DEFAULT_MAX_TOKENS
  },

  // More creative responses
  creative: {
    model: DEFAULT_MODEL,
    temperature: 0.9,
    top_p: 0.95,
    max_tokens: DEFAULT_MAX_TOKENS
  },

  // More focused, precise responses
  precise: {
    model: DEFAULT_MODEL,
    temperature: 0.3,
    top_p: 0.7,
    max_tokens: DEFAULT_MAX_TOKENS
  },

  // Shorter responses (preview mode)
  preview: {
    model: DEFAULT_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    top_p: DEFAULT_TOP_P,
    max_tokens: 200 // Limited tokens for preview
  },

  // JSON-optimized responses
  json: {
    model: DEFAULT_MODEL,
    temperature: 0.3, // Lower temperature for more deterministic output
    top_p: 0.7,
    max_tokens: 500,
    response_format: { type: "json_object" }
  }
};

// Prompt templates for different content types - these stay on the server side
const PROMPT_TEMPLATES = {
  expansion: `Expand on this idea with additional depth, implications, or related angles. Structure your response with clear headings, bullet points where appropriate, and ensure a logical flow of ideas. Include concrete examples or applications where possible.`,

  contrarian: `Present a counterintuitive or opposing view to this idea. Structure your response with clear headings, supporting evidence, and logical reasoning. Challenge the initial premise respectfully but thoroughly.`,

  synapse: `Offer concepts, metaphors, or ideas from different domains that relate to this topic. Structure your response to highlight unexpected connections, cross-disciplinary insights, and novel perspectives.`,

  deeper: `Provide a deeper analysis exploring further implications, nuances, and dimensions of this idea. Include historical context, potential future implications, and multidisciplinary viewpoints.`,

  relatedThoughts: `Based on this expanded response, generate 4 thoughtful follow-up questions or ideas that would naturally extend this conversation. Each should be concise (under 15 words), thought-provoking, and directly related to the content. Format your response as a JSON array of strings without any additional text or explanation.`,

  preview: `Generate a brief preview summary of the following idea. Keep it concise and compelling.`,

  default: `Provide a thoughtful, balanced response to the following idea.`
};

// Persona templates for different persona types - these stay on the server side
const PERSONA_TEMPLATES = {
  default: {
    name: 'AI Assistant',
    instruction: 'Provide a thoughtful, balanced response.'
  },
  naval: {
    name: 'Naval',
    instruction: 'Channel Naval Ravikant\'s philosophical approach to wealth, happiness, and life optimization. Use concise, tweet-like wisdom with occasional paradoxes. Focus on long-term thinking, mental models, and the pursuit of happiness through freedom.'
  },
  graham: {
    name: 'Paul Graham',
    instruction: 'Write like Paul Graham with clear, thoughtful analysis. Use simple language to explain complex ideas. Focus on startups, innovation, and contrarian thinking about conventional wisdom. Include occasional personal anecdotes and practical wisdom.'
  },
  trump:  {
    name: 'Donald Trump',
    instruction: 'Write in Donald Trump\'s distinctive style: confident, bombastic, and direct. Use simple vocabulary, short sentences, frequent superlatives ("tremendous", "the best"), and occasional ALL CAPS for emphasis. Make bold, declarative statements and add "Believe me" or similar phrases.',
    description: 'Chaotic, confident, punchy',
    color: '#e63946',
    icon: '🔥'
  },
  nietzsche: {
    name: 'Nietzsche',
    instruction: 'Write in Friedrich Nietzsche\'s philosophical style: profound, poetic, and challenging conventional morality. Use aphorisms, paradoxes, and metaphors. Emphasize will to power, the übermensch concept, and critique of societal values. Be existential and harsh when necessary.',
    description: 'Existential and harsh',
    color: '#800020',
    icon: '⚡'
  },
  aristotle: {
    name: 'Aristotle',
    instruction: 'Write in Aristotle\'s scholarly style: methodical, logical, and ethically grounded. Construct arguments using clear premises and conclusions, draw upon empirical observations, emphasize the Golden Mean and virtue ethics, and illustrate points with concrete examples. Maintain a balanced, moderate tone and seek the underlying purpose (telos) of each topic.',
    description: 'Logical, empirical, balanced',
    color: '#DAA520',
    icon: '🦉'
  },
  future: {
    name: 'Future Self',
    instruction: 'Respond as if you are the user\'s future self, looking back with wisdom gained from experience. Offer perspective that comes from having lived through challenges and seen long-term patterns. Be encouraging but realistic.',
    description: 'Imaginative projection',
    color: '#8A00C4',
    icon: '🔮'
  }
};

/**
 * Get configuration for a specific preset
 * @param {string} presetName - Name of the preset to use
 * @returns {Object} - Configuration object with LLM parameters
 */
function getPresetConfig(presetName) {
  // Default to 'default' preset if the requested one doesn't exist
  return PRESETS[presetName] || PRESETS.default;
}

/**
 * Get configuration for a specific type of content
 * Maps content types to appropriate presets
 * @param {string} contentType - Type of content being generated
 * @returns {Object} - Configuration object with LLM parameters
 */
function getConfigForContentType(contentType) {
  // Map content types to presets
  const contentTypeMap = {
    'expansion': 'default',
    'contrarian': 'default',
    'synapse': 'creative',
    'deeper': 'default',
    'relatedThoughts': 'json',
    'preview': 'preview'
  };

  const preset = contentTypeMap[contentType] || 'default';
  return getPresetConfig(preset);
}

/**
 * Build a prompt using server-side templates
 * @param {string} userInput - The user's input text
 * @param {string} contentType - Type of content being generated
 * @param {string} personaId - ID of the persona to use (optional)
 * @returns {string} - Complete prompt to send to the LLM
 */
function buildPrompt(userInput, contentType, personaId = null) {
  // Get the appropriate prompt template
  const promptTemplate = PROMPT_TEMPLATES[contentType] || PROMPT_TEMPLATES.default;

  // Add persona instruction if provided
  let personaPrefix = '';
  if (personaId && PERSONA_TEMPLATES[personaId]) {
    const persona = PERSONA_TEMPLATES[personaId];
    personaPrefix = `Respond as if you were ${persona.name}. ${persona.instruction} `;
  }

  // For preview contentType, use a shorter format
  const formatInstructions = contentType === 'preview' ?
    'Keep it concise and compelling.' :
    'Write in a clear, engaging style with well-structured paragraphs and thoughtful transitions.';

  // Build the complete prompt
  return `${personaPrefix}${promptTemplate}: "${userInput}". ${formatInstructions}`;
}

/**
 * Build the OpenAI API request body
 * @param {string} userInput - The user's input text (not the full prompt)
 * @param {string} contentType - Type of content being generated
 * @param {string} personaId - ID of the persona to use (optional)
 * @param {boolean} stream - Whether to enable streaming response
 * @returns {Object} - Complete request body for OpenAI API
 */
function buildOpenAIRequestBody(userInput, contentType, personaId = null, stream = false) {
  // Get configuration based on content type
  const config = getConfigForContentType(contentType);

  // Build the prompt using server-side templates
  const completePrompt = buildPrompt(userInput, contentType, personaId);

  // Log the request for debugging
  console.log(`Building OpenAI request for ${contentType}, streaming: ${stream}`);

  // Build the request body
  const requestBody = {
    model: config.model,
    messages: [{ role: "user", content: completePrompt }],
    temperature: config.temperature,
    top_p: config.top_p,
    max_tokens: config.max_tokens,
    stream: !!stream
  };

  // Add response_format if specified in the config
  if (config.response_format) {
    requestBody.response_format = config.response_format;
  }

  return requestBody;
}

/**
 * Get available preset names (for documentation/UI)
 * @returns {string[]} - Array of available preset names
 */
function getAvailablePresets() {
  return Object.keys(PRESETS);
}

/**
 * Get available persona IDs (for documentation/UI)
 * @returns {string[]} - Array of available persona IDs
 */
function getAvailablePersonas() {
  return Object.keys(PERSONA_TEMPLATES);
}

// Make sure to export all functions that will be used externally
export default {
  getPresetConfig,
  getConfigForContentType,
  buildOpenAIRequestBody,
  buildPrompt,
  getAvailablePresets,
  getAvailablePersonas,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS
};