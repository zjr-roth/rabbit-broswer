/**
 * Service to interact with LLM APIs via Next.js server-side API routes
 * With improved streaming implementation
 */

// Content types for different response sections
const CONTENT_TYPES = {
  expansion: 'expansion',
  contrarian: 'contrarian',
  synapse: 'synapse',
  deeper: 'deeper',
  relatedThoughts: 'relatedThoughts',
  preview: 'preview',
  default: 'default'
};

/**
 * Make a fetch request to our server-side API route
 * @param {string} userInput - The user's input text
 * @param {string} contentType - Type of content being generated
 * @param {string} personaId - Optional persona ID
 * @param {boolean} stream - Whether to request a streaming response
 * @returns {Promise<Response>} - The fetch response
 */
const fetchLLM = async (userInput, contentType = 'default', personaId = null, stream = false) => {
  // DEBUG: Log parameters
  console.log(`fetchLLM called with: contentType=${contentType}, personaId=${personaId || 'null'}, stream=${stream}`);

  // Create minimal request with only necessary parameters
  const requestBody = {
    userInput,
    contentType,
    personaId,
    stream
  };

  console.log("Request payload:", JSON.stringify(requestBody, null, 2));

  return fetch('/api/llm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
};

/**
 * Process a streaming response with improved chunk handling
 * @param {ReadableStream} stream - The response stream
 * @param {Function} onChunk - Callback for each text chunk
 * @returns {Promise<string>} - The complete response
 */
const processStream = async (stream, onChunk) => {
  // DEBUG: Verify callback is a function
  console.log("processStream called with onChunk:", typeof onChunk);

  if (typeof onChunk !== 'function') {
    console.error("ERROR: onChunk is not a function in processStream!");
    throw new Error("Invalid onChunk callback provided to processStream");
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  let buffer = '';
  let chunkCount = 0;

  try {
    console.log("Starting to process stream chunks...");

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log(`Stream completed after ${chunkCount} chunks`);
        break;
      }

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      chunkCount++;

      if (chunkCount <= 3 || chunkCount % 10 === 0) {
        console.log(`Received chunk #${chunkCount}, size: ${value.length} bytes`);
      }

      // Process complete SSE events
      const lines = buffer.split('\n');

      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
          try {
            const jsonData = JSON.parse(trimmedLine.substring(6));

            // Extract content from delta or message based on format
            let content = '';
            if (jsonData.choices && jsonData.choices.length > 0) {
              if (jsonData.choices[0].delta) {
                content = jsonData.choices[0].delta.content || '';
              } else if (jsonData.choices[0].message) {
                content = jsonData.choices[0].message.content || '';
              }
            }

            if (content) {
              fullResponse += content;
              // Call onChunk for each meaningful text chunk
              onChunk(content, fullResponse);

              if (chunkCount <= 3) {
                console.log(`Content chunk: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
              }
            }
          } catch (err) {
            // Log parsing errors for better debugging
            console.warn("JSON parse error in stream chunk:", err.message);
            console.log("Problematic line:", trimmedLine.substring(0, 100));
          }
        } else if (trimmedLine === 'data: [DONE]') {
          console.log("Received DONE signal from stream");
          break;
        }
      }
    }

    // Process any remaining data in the buffer
    if (buffer.trim()) {
      try {
        if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
          const jsonData = JSON.parse(buffer.trim().substring(6));

          let content = '';
          if (jsonData.choices && jsonData.choices.length > 0) {
            if (jsonData.choices[0].delta) {
              content = jsonData.choices[0].delta.content || '';
            } else if (jsonData.choices[0].message) {
              content = jsonData.choices[0].message.content || '';
            }
          }

          if (content) {
            fullResponse += content;
            onChunk(content, fullResponse);
          }
        }
      } catch (err) {
        // Ignore final buffer parsing errors
      }
    }

    return fullResponse;
  } catch (error) {
    console.error("Error processing stream:", error);
    throw error;
  } finally {
    reader.releaseLock();
    console.log("Stream reader released");
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
  console.warn("Could not extract content from response:", response);
  return '';
};

/**
 * Stream text from the API with improved error checking
 * @param {string} userInput - The user's input text
 * @param {string} contentType - Type of content being generated
 * @param {string} personaId - Optional persona ID
 * @param {Function} onChunk - Callback function for each text chunk
 * @returns {Promise<string>} - The complete response when done
 */
const streamText = async (userInput, contentType = 'default', personaId = null, onChunk = null) => {
  try {
    // DEBUG: Log parameters
    console.log(`streamText called with: contentType=${contentType}, personaId=${personaId || 'null'}`);
    console.log(`onChunk is ${onChunk ? 'provided' : 'NOT provided'}, type: ${typeof onChunk}`);

    // Only attempt streaming if callback is provided
    if (onChunk && typeof onChunk === 'function') {
      console.log(`Requesting streaming ${contentType} response`);

      // Make streaming request with explicitly true stream parameter
      const response = await fetchLLM(userInput, contentType, personaId, true);

      // Check if stream was actually requested in network tab
      console.log("Response headers:",
        `Content-Type: ${response.headers.get('Content-Type')}`);

      // Check response status
      if (!response.ok) {
        console.error(`Response not OK: ${response.status} ${response.statusText}`);
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      // Verify we got a readable stream back
      if (response.body instanceof ReadableStream) {
        console.log("Stream received, processing chunks");
        return await processStream(response.body, onChunk);
      } else {
        console.warn("Expected stream but got non-stream response");
        console.log("Response type:", typeof response.body);

        // Fall back to regular request
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const text = extractTextFromResponse(data);
        console.log(`Received non-streaming response (${text.length} chars)`);
        onChunk(text, text);
        return text;
      }
    } else {
      // No callback, so make a non-streaming request
      console.log(`Making NON-streaming request for ${contentType}`);
      const response = await fetchLLM(userInput, contentType, personaId, false);

      if (!response.ok) {
        console.error(`Response not OK: ${response.status} ${response.statusText}`);
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

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
const generateResponse = async (type, input, persona = null) => {
  // Generate preview response
  try {
    console.log(`generateResponse called for ${type}`);
    const personaId = persona ? persona.id : null;
    const response = await fetchLLM(input, CONTENT_TYPES.preview, personaId, false);

    if (!response.ok) {
      console.error(`Preview response not OK: ${response.status}`);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return extractTextFromResponse(data);
  } catch (error) {
    console.error("Preview generation error:", error);
    throw error;
  }
};

/**
 * Generate full content with streaming when a card is expanded
 */
const generateFullContent = async (type, input, persona = null, onChunk = null) => {
  const contentType = CONTENT_TYPES[type] || 'default';
  const personaId = persona ? persona.id : null;

  // DEBUG: Log detailed information about the call
  console.log("========= GENERATE FULL CONTENT =========");
  console.log(`Type: ${type}, Content Type: ${contentType}`);
  console.log(`Persona: ${persona ? persona.id : 'none'}`);
  console.log(`onChunk provided: ${!!onChunk}, type: ${typeof onChunk}`);

  // Validate onChunk callback
  if (!onChunk || typeof onChunk !== 'function') {
    console.error("ERROR: Missing or invalid onChunk callback in generateFullContent");
    console.error("onChunk:", onChunk);
    console.trace("Stack trace for debugging");
  }

  try {
    console.log(`Generating ${contentType} content with streaming`);
    return await streamText(input, contentType, personaId, onChunk);
  } catch (error) {
    console.error("Full content generation error:", error);
    throw error;
  }
};

/**
 * Generate related thoughts based on expanded content
 */
const generateRelatedThoughts = async (content) => {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    console.warn("generateRelatedThoughts called with invalid content.");
    return [];
  }

  try {
    console.log("Generating related thoughts (non-streaming)");

    // Truncate content if too long
    const truncatedContent = content.length > 800
      ? content.substring(0, 800) + '...'
      : content;

    // Related thoughts should not stream (needs JSON parsing)
    const response = await fetchLLM(truncatedContent, CONTENT_TYPES.relatedThoughts, null, false);

    if (!response.ok) {
      console.error(`Related thoughts response not OK: ${response.status}`);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    const relatedResponse = extractTextFromResponse(data);

    if (!relatedResponse || typeof relatedResponse !== 'string') {
      console.error('Invalid response received from LLM for related thoughts.');
      return [];
    }

    // Parse the response
    try {
      // Try parsing the direct response
      console.log("Parsing related thoughts response");
      const parsedJson = JSON.parse(relatedResponse);
      if (Array.isArray(parsedJson)) {
        return parsedJson.slice(0, 4); // Ensure max 4 items
      }

      // If it's an object, look for array properties
      if (typeof parsedJson === 'object' && parsedJson !== null) {
        for (const key in parsedJson) {
          if (Array.isArray(parsedJson[key])) {
            return parsedJson[key].slice(0, 4);
          }
        }
      }

      // Fallback to regex extraction
      console.log("Attempting regex extraction for related thoughts");
      const jsonMatch = relatedResponse.match(/\[\s*(".*?"\s*,?\s*)*\]/);
      if (jsonMatch && jsonMatch[0]) {
        const parsedMatch = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsedMatch)) {
          return parsedMatch.slice(0, 4);
        }
      }

      // Last resort line-by-line parsing
      console.warn("Using fallback line-by-line parsing for related thoughts");
      return relatedResponse
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*|-\s*|["\[\],]/g, '').trim())
        .filter(line => line.length > 5 && line.length < 100)
        .slice(0, 4);

    } catch (parseError) {
      console.error('Error parsing related thoughts response:', parseError);
      console.log("Raw response:", relatedResponse.substring(0, 200));
      return [
        "What are the key assumptions here?",
        "How could this be applied practically?",
        "What is the strongest counter-argument?",
        "Where can I learn more about this?"
      ];
    }
  } catch (error) {
    console.error('Error generating related thoughts:', error);
    return [];
  }
};

/**
 * Verify if server API is reachable
 */
const verifyServerConnection = async () => {
  try {
    console.log("Verifying server connection");
    const response = await fetch('/api/llm/status', {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`Status response not OK: ${response.status}`);
      return { ok: false, error: 'server', message: `Server returned ${response.status}` };
    }

    const data = await response.json();
    console.log("Server connection verified:", data);
    return { ok: true, configured: data.configured, message: data.message };
  } catch (error) {
    console.error('Error checking server connection:', error);
    return { ok: false, error: 'connection', message: error.message };
  }
};

export default {
  generateResponse,
  generateFullContent,
  generateRelatedThoughts,
  streamText,
  verifyServerConnection,
  CONTENT_TYPES
};