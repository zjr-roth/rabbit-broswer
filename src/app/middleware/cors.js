/**
 * CORS middleware for Next.js API routes
 * Restricts API access to authorized origins only
 */

// List of allowed origins that can access the API
// Get from environment variable or use defaults
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://tryrabbit.xyz,https://www.tryrabbit.xyz')
  .split(',')
  .map(origin => origin.trim());

/**
 * Check if the origin is allowed
 * @param {string} origin - Request origin
 * @returns {boolean} - Whether the origin is allowed
 */
function isAllowedOrigin(origin) {
  // If no origin, deny (this is unusual but possible with some requests)
  if (!origin) return false;

  // In development mode, allow localhost and undefined origin
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  // Check if origin is in allowed list
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Apply CORS headers to response
 * @param {Response} response - Next.js response object
 * @param {string|null} origin - Request origin
 * @returns {Response} - Response with CORS headers
 */
export function applyCorsHeaders(response, origin) {
  // If origin is allowed, set Access-Control-Allow-Origin to the specific origin
  // This is more secure than using a wildcard *
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    // For disallowed origins, don't set Access-Control-Allow-Origin
    // This effectively blocks the request due to browser CORS policy
  }

  // Set other CORS headers
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  return response;
}

/**
 * Handle preflight OPTIONS requests
 * @param {Request} request - Next.js request object
 * @returns {Response|null} - Response for OPTIONS or null for other methods
 */
export function handleCorsPreflightRequest(request) {
  // Get origin from request headers
  const origin = request.headers.get('origin');

  // Handle OPTIONS (preflight) requests
  if (request.method === 'OPTIONS') {
    // Create an empty response
    const response = new Response(null, { status: 204 }); // No content

    // Apply CORS headers and return
    return applyCorsHeaders(response, origin);
  }

  // For non-OPTIONS requests, return null to continue processing
  return null;
}

/**
 * Apply CORS middleware to an API route
 * @param {Function} handler - The API route handler function
 * @returns {Function} - Wrapped handler with CORS protection
 */
export function withCors(handler) {
  return async function(request, ...args) {
    // Get origin from request headers
    const origin = request.headers.get('origin');

    // Handle preflight requests (OPTIONS)
    const preflightResponse = handleCorsPreflightRequest(request);
    if (preflightResponse) {
      return preflightResponse;
    }

    // In development mode, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      const response = await handler(request, ...args);
      return applyCorsHeaders(response, origin);
    }

    // Check if origin is allowed
    if (origin && !isAllowedOrigin(origin)) {
      // Origin not allowed, return 403 Forbidden
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'Origin not allowed' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Process the request with the original handler
    const response = await handler(request, ...args);

    // Add CORS headers to the response
    return applyCorsHeaders(response, origin);
  };
}