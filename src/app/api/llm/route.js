import { NextResponse } from 'next/server';
import { withCors } from '../../middleware/cors';
import serverConfig from '../../services/serverConfig';
import Anthropic from '@anthropic-ai/sdk';

// Configure route for streaming (prevents timeout on Vercel)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Maximum duration in seconds for streaming

/**
 * API route handler for LLM requests using Claude
 * With streaming support
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
    const API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: API_KEY,
    });

    // Use stream parameter directly from request
    const shouldStream = !!stream;
    console.log(`Processing ${safeContentType} request, streaming: ${shouldStream}`);

    // Build request body using server-side configuration
    const claudeRequestBody = serverConfig.buildClaudeRequestBody(
      userInput,
      safeContentType,
      personaId,
      shouldStream
    );

    // Handle streaming response
    if (shouldStream) {
      console.log("Streaming mode active, preparing stream response");

      try {
        // Create streaming message
        const stream = await anthropic.messages.create({
          ...claudeRequestBody,
          stream: true,
        });

        // Create a transform stream to handle the Claude stream
        const transformStream = new TransformStream();
        const writer = transformStream.writable.getWriter();

        // Process Claude stream
        streamClaudeResponse(stream, writer).catch(error => {
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
        response.headers.set('X-Accel-Buffering', 'no');

        return response;
      } catch (error) {
        console.error('Claude API streaming error:', error);
        return NextResponse.json(
          { error: error.message || 'Error from Claude API' },
          { status: 500 }
        );
      }
    }

    // Handle non-streaming response
    try {
      const message = await anthropic.messages.create(claudeRequestBody);

      // Transform Claude response to match expected format
      const response = {
        id: message.id,
        model: message.model,
        content: message.content[0]?.text || '',
        role: message.role,
        stop_reason: message.stop_reason,
        usage: message.usage
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Claude API error:', error);
      return NextResponse.json(
        { error: error.message || 'Error from Claude API' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in LLM API route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Stream chunks from Claude to the client in SSE format
 * @param {Stream} claudeStream - The Claude response stream
 * @param {WritableStreamDefaultWriter} writer - The writer for the output stream
 */
async function streamClaudeResponse(claudeStream, writer) {
  const encoder = new TextEncoder();
  let counter = 0;
  let textChunks = 0;

  try {
    for await (const event of claudeStream) {
      counter++;

      // Log all event types for debugging
      if (counter <= 5) {
        console.log(`Event #${counter}: type=${event.type}`);
      }

      // Handle different event types from Claude
      if (event.type === 'content_block_delta') {
        // Extract text from delta
        const text = event.delta?.text || '';

        if (text) {
          textChunks++;
          // Format as SSE compatible with OpenAI format
          const sseData = {
            choices: [{
              delta: {
                content: text
              }
            }]
          };

          const sseMessage = `data: ${JSON.stringify(sseData)}\n\n`;
          await writer.write(encoder.encode(sseMessage));

          if (textChunks <= 3 || textChunks % 20 === 0) {
            console.log(`Streamed text chunk #${textChunks}`);
          }
        }
      } else if (event.type === 'message_stop') {
        // Send [DONE] marker
        await writer.write(encoder.encode('data: [DONE]\n\n'));
        console.log(`Stream completed: ${counter} total events, ${textChunks} text chunks`);
      }
    }

    // Ensure we close the writer after the stream ends
    await writer.close();
    console.log('Writer closed successfully');
  } catch (error) {
    console.error('Error streaming Claude response:', error);
    try {
      await writer.abort(error);
    } catch (abortError) {
      console.error('Error aborting writer:', abortError);
    }
  }
}

// Apply CORS protection middleware to the handler
export const POST = withCors(llmRouteHandler);
