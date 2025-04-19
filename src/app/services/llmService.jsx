/**
 * Service to interact with LLM APIs via Next.js server-side API routes
 * Supports both streaming and non-streaming responses
 * Enhanced with related thoughts generation
 */

const DEFAULT_LLM_OPTIONS = {
    temperature: 0.9,  // Higher temperature for more creativity
    top_p: 0.95,       // Sample from top 95% probability mass
    top_k: 40,         // Consider top 40 tokens
    max_tokens: 1000,  // Maximum tokens in response
    model: "gpt-4o-mini" // Default model
  };

  // Build prompts for different response types
  const buildPrompt = (type, input, persona = null, previewOnly = false) => {
    // Base prompts for each type
    const basePrompts = {
      expansion: `Expand on this idea with additional depth, implications, or related angles. Structure your response with clear headings, bullet points where appropriate, and ensure a logical flow of ideas. Include concrete examples or applications where possible.`,
      contrarian: `Present a counterintuitive or opposing view to this idea. Structure your response with clear headings, supporting evidence, and logical reasoning. Challenge the initial premise respectfully but thoroughly.`,
      synapse: `Offer concepts, metaphors, or ideas from different domains that relate to this topic. Structure your response to highlight unexpected connections, cross-disciplinary insights, and novel perspectives.`,
      deeper: `Provide a deeper analysis exploring further implications, nuances, and dimensions of this idea. Include historical context, potential future implications, and multidisciplinary viewpoints.`,
      relatedThoughts: `Based on this expanded response, generate 4 thoughtful follow-up questions or ideas that would naturally extend this conversation. Each should be concise (under 15 words), thought-provoking, and directly related to the content. Format your response as a JSON array of strings without any additional text or explanation.`
    };

    // Preview versions (shorter)
    const previewPrompts = {
      expansion: `Provide a brief 1-2 sentence preview summarizing how you would expand on this idea`,
      contrarian: `Provide a brief 1-2 sentence preview of a counterintuitive or opposing view to this idea`,
      synapse: `Provide a brief 1-2 sentence preview of a concept, metaphor, or idea from a different domain that relates to`,
      deeper: `Provide a brief 1-2 sentence preview of a deeper analysis of this idea`
    };

    // Select the appropriate base prompt
    const promptBase = previewOnly ? previewPrompts[type] || previewPrompts.expansion : basePrompts[type] || basePrompts.expansion;

    // Add persona instruction if provided
    let personaPrefix = '';
    if (persona) {
      personaPrefix = `Respond as if you were ${persona.name}. ${persona.instruction} `;
    }

    return `${personaPrefix}${promptBase}: "${input}". ${previewOnly ? 'Keep it concise and compelling.' : 'Write in a clear, engaging style with well-structured paragraphs and thoughtful transitions.'}`;
  };

  /**
   * Make a fetch request to our server-side API route
   * @param {string} prompt - The prompt to send
   * @param {Object} options - LLM parameters
   * @param {boolean} stream - Whether to request a streaming response
   * @returns {Promise<Response>} - The fetch response
   */
  const fetchLLM = async (prompt, options = {}, stream = false) => {
    const requestBody = {
      prompt,
      stream,
      ...DEFAULT_LLM_OPTIONS,
      ...options
    };

    return fetch('/api/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
  };

  /**
   * Process a streaming response from fetch with Server-Sent Events (SSE)
   * @param {ReadableStream} stream - The response stream
   * @param {Function} onChunk - Callback for each text chunk
   * @returns {Promise<string>} - The complete response
   */
  const processStream = async (stream, onChunk) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Process SSE format (data: {...})
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.substring(6));
              // Extract content from the OpenAI response format
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                onChunk(content, fullResponse);
              }
            } catch (err) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
      return fullResponse;
    } catch (error) {
      console.error("Error processing stream:", error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  };

  /**
   * Extract text content from a non-streaming API response
   * @param {Object} response - The parsed API response
   * @returns {string} - The extracted text content
   */
  const extractTextFromResponse = (response) => {
    if (response?.choices?.[0]?.message?.content) {
      return response.choices[0].message.content;
    }
    return '';
  };

  /**
   * Stream text from the API with simulated typing effect if streaming is not available
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} options - LLM parameters
   * @param {Function} onChunk - Callback function for each text chunk
   * @param {boolean} simulateTyping - Whether to simulate typing animation for non-streaming APIs
   * @returns {Promise<string>} - The complete response when done
   */
  const streamText = async (prompt, options = {}, onChunk = null, simulateTyping = true) => {
    try {
      // Try to use native streaming if onChunk is provided
      if (onChunk && typeof onChunk === 'function') {
        // Make streaming request
        const response = await fetchLLM(prompt, options, true);

        // Check if streaming is supported
        if (response.ok && response.body instanceof ReadableStream) {
          // Process the stream
          return await processStream(response.body, onChunk);
        } else {
          // Streaming failed or not supported, fall back to regular request
          const data = await response.json();

          if (data.error) {
            throw new Error(data.error);
          }

          const text = extractTextFromResponse(data);

          if (simulateTyping) {
            // Simulate typing with setTimeout and small chunks
            return new Promise((resolve) => {
              let fullText = '';
              let index = 0;

              // Determine chunk size (characters per "tick")
              const chunkSize = 3;

              // Function to send next chunk
              const sendNextChunk = () => {
                // If we've sent everything, resolve
                if (index >= text.length) {
                  resolve(fullText);
                  return;
                }

                // Calculate end of this chunk
                const endIndex = Math.min(index + chunkSize, text.length);
                const chunk = text.substring(index, endIndex);

                // Update full text and call onChunk
                fullText += chunk;
                onChunk(chunk, fullText);

                // Move to next position
                index = endIndex;

                // Random delay between 10-50ms for natural typing feel
                const delay = Math.floor(Math.random() * 40) + 10;
                setTimeout(sendNextChunk, delay);
              };

              // Start sending chunks
              sendNextChunk();
            });
          } else {
            // No typing simulation, just send the full response
            onChunk(text, text);
            return text;
          }
        }
      } else {
        // No callback provided or streaming not requested
        const response = await fetchLLM(prompt, options, false);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        return extractTextFromResponse(data);
      }
    } catch (error) {
      console.error("LLM request error:", error);
      throw new Error(`Failed to get response: ${error.message}`);
    }
  };

  /**
   * Generate preview response
   */
  const generateResponse = async (type, input, options = {}, persona = null) => {
    // Generate preview response with fewer tokens for speed
    const previewPrompt = buildPrompt(type, input, persona, true);
    const previewOptions = {
      ...DEFAULT_LLM_OPTIONS,
      ...options,
      max_tokens: 100 // Limit tokens for preview
    };

    const response = await fetchLLM(previewPrompt, previewOptions);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return extractTextFromResponse(data);
  };

  /**
   * Generate full content with streaming when a card is expanded
   */
  const generateFullContent = async (type, input, options = {}, persona = null, onChunk = null) => {
    const prompt = buildPrompt(type, input, persona, false);
    const fullOptions = {
      ...DEFAULT_LLM_OPTIONS,
      ...options,
      max_tokens: 1000 // More tokens for full content
    };

    if (onChunk) {
      return await streamText(prompt, fullOptions, onChunk);
    } else {
      const response = await fetchLLM(prompt, fullOptions);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return extractTextFromResponse(data);
    }
  };

  /**
   * Generate related thoughts based on expanded content
   * @param {string} content - The expanded content to generate related thoughts from
   * @param {Object} options - LLM parameters
   * @returns {Promise<Array<string>>} - Array of related thought strings
   */
  const generateRelatedThoughts = async (content, options = {}) => {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.warn("generateRelatedThoughts called with invalid content.");
      return [];
    }

    try {
      // Truncate content if too long to avoid excessive token usage
      const truncatedContent = content.length > 800 // Reduced slightly for safety
        ? content.substring(0, 800) + '...'
        : content;

      // Create prompt for related thoughts
      // Refined prompt for better JSON adherence
      const relatedPrompt = `Based on the following text:
  """
  ${truncatedContent}
  """
  Generate exactly 4 thoughtful follow-up questions or ideas that would naturally extend this conversation.
  Each item should be:
  1. Concise (under 15 words).
  2. Thought-provoking.
  3. Directly related to the provided text.
  Format your response ONLY as a valid JSON array of strings, like this:
  ["Question 1?", "Idea 2.", "Question 3?", "Idea 4."]
  Do not include any introductory text, explanations, markdown formatting, or numbering outside the JSON array itself.`;

      // Set options
      const relatedOptions = {
        ...DEFAULT_LLM_OPTIONS,
        ...options,
        model: "gpt-4o-mini", // Explicitly use a capable model if needed
        temperature: 0.8, // Slightly lower temp for more focused thoughts
        max_tokens: 200, // Should be enough for 4 short thoughts in JSON
        response_format: { type: "json_object" }, // Request JSON format if API supports it
      };

      // Get response
      const response = await fetchLLM(relatedPrompt, relatedOptions);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const relatedResponse = extractTextFromResponse(data);

      if (!relatedResponse || typeof relatedResponse !== 'string') {
          console.error('Invalid response received from LLM for related thoughts.');
          return [];
      }

      // Parse response
      try {
        // Attempt to parse the entire response as JSON first
        const parsedJson = JSON.parse(relatedResponse);
        // Check if it's an array (some models might wrap it in an object)
        if (Array.isArray(parsedJson)) {
            return parsedJson.slice(0, 4); // Ensure max 4 items
        } else if (typeof parsedJson === 'object' && parsedJson !== null) {
            // Look for a key that might contain the array (e.g., "thoughts", "questions")
            const key = Object.keys(parsedJson).find(k => Array.isArray(parsedJson[k]));
            if (key) {
                return parsedJson[key].slice(0, 4);
            }
        }

        // If direct parsing fails, try extracting JSON array using regex
        const jsonMatch = relatedResponse.match(/\[\s*(".*?"\s*,?\s*)*\]/);
        if (jsonMatch && jsonMatch[0]) {
          const parsedMatch = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsedMatch)) {
              return parsedMatch.slice(0, 4);
          }
        }

        // Fallback: Split by newlines and clean up (less reliable)
        console.warn("LLM did not return valid JSON for related thoughts. Falling back to text parsing.");
        return relatedResponse
          .split('\n')
          .map(line => line.replace(/^\d+\.\s*|-\s*|["\[\],]/g, '').trim()) // More aggressive cleaning
          .filter(line => line.length > 5 && line.length < 100) // Basic sanity check
          .slice(0, 4);

      } catch (parseError) {
        console.error('Error parsing related thoughts response:', parseError, 'Raw response:', relatedResponse);
        // Final fallback if parsing fails completely
        return [
          "What are the key assumptions here?",
          "How could this be applied practically?",
          "What is the strongest counter-argument?",
          "Where can I learn more about this?"
        ].slice(0, 4);
      }
    } catch (error) {
      console.error('Error generating related thoughts:', error);
      return []; // Return empty array on error
    }
  };

  /**
   * Verify if server API is reachable
   * @returns {Promise<boolean>} - True if API is reachable
   */
  const verifyServerConnection = async () => {
    try {
      const response = await fetch('/api/llm/status', {
        method: 'GET',
        cache: 'no-store'
      });
      return response.ok;
    } catch (error) {
      console.error('Error checking server connection:', error);
      return false;
    }
  };

  export default {
    generateResponse,
    generateFullContent,
    generateRelatedThoughts,
    streamText,
    DEFAULT_LLM_OPTIONS,
    verifyServerConnection
  };