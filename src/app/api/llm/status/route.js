import { NextResponse } from 'next/server';
import { withCors } from '../../../middleware/cors';

/**
 * API route handler to check API status and configuration
 * Protected with CORS to prevent unauthorized access
 */
async function statusRouteHandler(request) {
  try {
    const API_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    if (!API_KEY) {
      return NextResponse.json(
        {
          status: 'error',
          configured: false,
          message: 'API key not configured'
        },
        { status: 200 } // Changed to 200 to indicate the request was processed
      );
    }

    return NextResponse.json(
      {
        status: 'ok',
        configured: true,
        message: 'API configured correctly'
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        configured: false,
        message: 'Error checking API configuration'
      },
      { status: 500 }
    );
  }
}


export const GET = withCors(statusRouteHandler);