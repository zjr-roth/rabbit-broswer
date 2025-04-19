import { NextResponse } from 'next/server';

/**
 * API route handler to check API status and configuration
 */
export async function GET() {
  try {
    // Check if API key is configured
    const API_KEY = process.env.OPENAI_API_KEY;

    if (!API_KEY) {
      return NextResponse.json(
        {
          status: 'error',
          configured: false,
          message: 'API key not configured'
        },
        { status: 200 } // Return 200 even for configuration issues
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