import { NextResponse } from 'next/server';
import { withCors } from '../../middleware/cors';
import serverConfig from '../../services/serverConfig';

/**
 * API route handler for LLM requests
 * With improved streaming support and debugging
 */
async function llmRouteHandler(request) {
  try {
    // Extract request data
    const requestData = await request.json();
    const {
      userInput,
      contentType,
      personaId,
      stream
    } = requestData;

    console.log(`API Request: contentType=${contentType}, personaId=${personaId || 'null'}, stream=${stream}`);

    // Validate required parameters
    if (!userInput || typeof userInput !== 'string' || userInput.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid or missing input' },
        { status: 400 }
      );
    }

    // Default to 'default' content type if not specified
    const safeContentType = contentType || 'default';

    // Verify API key is configured
    const API_KEY = process.env.OPENAI_API_KEY;
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Use stream parameter directly from request - don't override it
    const shouldStream = !!stream;
    console.log(`Processing ${safeContentType} request, streaming: ${shouldStream}`);

    // Build request body using server-side configuration
    const openaiRequestBody = serverConfig.buildOpenAIRequestBody(
      userInput,
      safeContentType,
      personaId,
      shouldStream
    );

    // Configure API endpoint
    const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

    // Make request to OpenAI
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(openaiRequestBody)
    });

    // Handle streaming response
    if (shouldStream) {
      console.log("Streaming mode active, preparing stream response");

      // Ensure the response is ok before streaming
      if (!openaiResponse.ok) {
        console.error(`OpenAI API error: ${openaiResponse.status}`);
        const errorData = await openaiResponse.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData.error?.message || `OpenAI API error: ${openaiResponse.status}` },
          { status: openaiResponse.status }
        );
      }

      // Direct streaming implementation
      const transformStream = new TransformStream();
      const writer = transformStream.writable.getWriter();

      // Pipe the OpenAI response directly
      streamOpenAIResponse(openaiResponse.body, writer).catch(error => {
        console.error("Stream processing error:", error);
        writer.abort(error);
      });

      // Create a streaming response
      const response = new NextResponse(transformStream.readable);

      // Add critical headers for streaming
      response.headers.set('Content-Type', 'text/event-stream');
      response.headers.set('Cache-Control', 'no-cache');
      response.headers.set('Connection', 'keep-alive');
      response.headers.set('Transfer-Encoding', 'chunked');
      response.headers.set('X-Accel-Buffering', 'no'); // Prevents Nginx buffering

      return response;
    }

    // Handle non-streaming response
    const data = await openaiResponse.json();

    if (data.error) {
      console.error('OpenAI API error:', data.error);
      return NextResponse.json(
        { error: data.error.message || 'Error from OpenAI API' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in LLM API route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Stream chunks from OpenAI directly to the client
 * @param {ReadableStream} openaiStream - The OpenAI response stream
 * @param {WritableStreamDefaultWriter} writer - The writer for the output stream
 */
async function streamOpenAIResponse(openaiStream, writer) {
  const reader = openaiStream.getReader();
  let counter = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log(`Stream completed after ${counter} chunks`);
        await writer.close();
        break;
      }

      // Write each chunk immediately without processing
      await writer.write(value);
      counter++;

      if (counter <= 3 || counter % 20 === 0) {
        console.log(`Streamed chunk #${counter}, size: ${value.length} bytes`);
      }
    }
  } catch (error) {
    console.error('Error streaming response:', error);
    writer.abort(error);
  }
}

// Apply CORS protection middleware to the handler
export const POST = withCors(llmRouteHandler);