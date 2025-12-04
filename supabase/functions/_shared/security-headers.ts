/**
 * Security Headers Utility for Edge Functions
 * Provides common security headers and CORS configuration
 */

// Standard security headers for all Edge Functions
export const securityHeaders = {
  // CORS headers
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  
  // Security headers
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
  
  // Cache control for sensitive data
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// Minimal CORS headers for preflight
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Create response with security headers
export const createSecureResponse = (
  body: string | object,
  status: number = 200,
  additionalHeaders?: Record<string, string>
): Response => {
  const responseBody = typeof body === 'string' ? body : JSON.stringify(body);
  
  return new Response(responseBody, {
    status,
    headers: {
      ...securityHeaders,
      'Content-Type': 'application/json',
      ...additionalHeaders,
    },
  });
};

// Handle CORS preflight requests
export const handleCorsPreflightRequest = (): Response => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

// Validate request origin (optional stricter CORS)
export const validateOrigin = (request: Request, allowedOrigins: string[]): boolean => {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Allow requests without origin (non-browser)
  return allowedOrigins.some(allowed => 
    allowed === '*' || origin === allowed || origin.endsWith(allowed)
  );
};

// Rate limit by IP (simple in-memory implementation)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const checkRateLimit = (
  ip: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetAt: number } => {
  const now = Date.now();
  const key = ip;
  
  const record = rateLimitStore.get(key);
  
  if (!record || record.resetAt < now) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
};

// Extract client IP from request
export const getClientIp = (request: Request): string => {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';
};

// Sanitize input to prevent injection
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validate UUID format
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Create error response
export const createErrorResponse = (
  message: string,
  status: number = 400
): Response => {
  return createSecureResponse({ error: message }, status);
};
