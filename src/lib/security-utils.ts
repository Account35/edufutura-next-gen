/**
 * Security Utilities - Input validation, password strength, and security helpers
 */

import DOMPurify from 'dompurify';

// Common passwords to check against (subset for client-side)
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'shadow', '123123', '654321', 'superman', 'qazwsx',
  'michael', 'football', 'password1', 'password123', 'passw0rd', 'edufutura'
];

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-5
  strength: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
  errors: string[];
  suggestions: string[];
}

/**
 * Validate password strength with comprehensive checks
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  
  // Length checks
  if (password.length < 10) {
    errors.push('Password must be at least 10 characters long');
  } else {
    score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
  }
  
  // Character class checks
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'/`~]/.test(password);
  
  if (!hasLowercase) errors.push('Include at least one lowercase letter');
  else score += 0.5;
  
  if (!hasUppercase) errors.push('Include at least one uppercase letter');
  else score += 0.5;
  
  if (!hasNumbers) errors.push('Include at least one number');
  else score += 0.5;
  
  if (!hasSpecial) {
    suggestions.push('Add special characters for a stronger password');
  } else {
    score += 0.5;
  }
  
  // Check against common passwords
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
    errors.push('Password contains a commonly used word');
    score = Math.max(0, score - 2);
  }
  
  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    suggestions.push('Avoid repeated characters');
    score = Math.max(0, score - 1);
  }
  
  // Check for keyboard patterns
  const keyboardPatterns = ['qwerty', 'asdfgh', 'zxcvbn', '123456', 'qazwsx'];
  if (keyboardPatterns.some(pattern => lowerPassword.includes(pattern))) {
    errors.push('Avoid keyboard patterns');
    score = Math.max(0, score - 1);
  }
  
  // Determine strength
  let strength: PasswordValidationResult['strength'];
  if (score < 1) strength = 'very-weak';
  else if (score < 2) strength = 'weak';
  else if (score < 3) strength = 'medium';
  else if (score < 4) strength = 'strong';
  else strength = 'very-strong';
  
  return {
    isValid: errors.length === 0 && score >= 2,
    score: Math.min(5, Math.max(0, Math.round(score))),
    strength,
    errors,
    suggestions,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();
  
  if (!trimmed) {
    return { valid: false, error: 'Email is required' };
  }
  
  if (trimmed.length > 255) {
    return { valid: false, error: 'Email is too long' };
  }
  
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\\s@]+@[^\\s@]+\.[^\\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

/**
 * Validate phone number (South African format)
 */
export function validatePhoneNumber(phone: string): { valid: boolean; formatted?: string; error?: string } {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // South African numbers
  if (digits.startsWith('27') && digits.length === 11) {
    return { valid: true, formatted: `+${digits}` };
  }
  
  if (digits.startsWith('0') && digits.length === 10) {
    return { valid: true, formatted: `+27${digits.slice(1)}` };
  }
  
  if (digits.length === 9 && !digits.startsWith('0')) {
    return { valid: true, formatted: `+27${digits}` };
  }
  
  return { valid: false, error: 'Invalid South African phone number' };
}

/**
 * Sanitize HTML content for safe rendering
 */
export function sanitizeHTML(html: string, options?: {
  allowIframes?: boolean;
  allowImages?: boolean;
}): string {
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'i', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'mark'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'title'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
    ADD_TAGS: [] as string[],
    ADD_ATTR: [] as string[],
  };
  
  if (options?.allowImages) {
    config.ALLOWED_TAGS.push('img');
    config.ALLOWED_ATTR.push('src', 'alt', 'width', 'height');
  }
  
  if (options?.allowIframes) {
    config.ADD_TAGS = ['iframe'];
    config.ADD_ATTR = ['allow', 'allowfullscreen', 'frameborder', 'scrolling'];
  }
  
  // Add safe link attributes
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('rel', 'noopener noreferrer');
      if (node.getAttribute('target') === '_blank') {
        // Already has target, keep it
      } else if (node.getAttribute('href')?.startsWith('http')) {
        node.setAttribute('target', '_blank');
      }
    }
  });
  
  return DOMPurify.sanitize(html, config) as string;
}

/**
 * Validate URL is safe (no javascript: protocol)
 */
export function validateURL(url: string): { valid: boolean; sanitized?: string; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }
  
  const trimmed = url.trim();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmed.toLowerCase();
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return { valid: false, error: 'Invalid URL protocol' };
    }
  }
  
  // Ensure URL has valid protocol
  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Invalid URL protocol' };
    }
    return { valid: true, sanitized: parsed.href };
  } catch {
    // Try adding https:// if no protocol
    try {
      const withProtocol = `https://${trimmed}`;
      const parsed = new URL(withProtocol);
      return { valid: true, sanitized: parsed.href };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }
}

/**
 * Escape string for safe use in regex
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a string using SHA-256 (for non-sensitive use like cache keys)
 */
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if current session might be suspicious (different IP/UA pattern)
 */
export function detectSessionAnomaly(
  storedFingerprint: string | null,
  currentFingerprint: string
): boolean {
  if (!storedFingerprint) return false;
  return storedFingerprint !== currentFingerprint;
}

/**
 * Generate a simple browser fingerprint for session validation
 */
export function generateBrowserFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  return btoa(components.join('|'));
}

/**
 * Rate limit helper for client-side
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkClientRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetAt - now };
}

export default {
  validatePassword,
  validateEmail,
  validatePhoneNumber,
  sanitizeHTML,
  validateURL,
  escapeRegex,
  generateSecureToken,
  hashString,
  detectSessionAnomaly,
  generateBrowserFingerprint,
  checkClientRateLimit,
};
