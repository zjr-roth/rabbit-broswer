import { NextResponse } from 'next/server';

/**
 * API route handler for LLM requests
 * Supports both streaming and non-streaming responses
 */
export async function POST(request) {
  try {
    // Extract request data
    const requestData = await request.json();
    const { prompt, stream, model, temperature, top_p, top_k, max_tokens, response_format } = requestData;

    // Verify API key is configured
    const API_KEY = process.env.OPENAI_API_KEY;
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Build request body for OpenAI
    const openaiRequestBody = {
      model: model || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: temperature !== undefined ? temperature : 0.9,
      top_p: top_p !== undefined ? top_p : 0.95,
      max_tokens: max_tokens || 1000,
      stream: !!stream
    };

    // Add top_k if supported and provided
    if (top_k !== undefined) {
      openaiRequestBody.top_k = top_k;
    }

    // Add response_format if provided
    if (response_format) {
      openaiRequestBody.response_format = response_format;
    }

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
    if (stream) {
      // Create a TransformStream to process the SSE data
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // Return the stream directly, maintaining SSE format
      return new NextResponse(openaiResponse.body);
    }

    // Handle non-streaming response
    const data = await openaiResponse.json();

    if (data.error) {
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