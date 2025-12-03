import { supabase } from '@/integrations/supabase/client';

interface ModerationResult {
  approved: boolean;
  decision: 'approved' | 'flagged' | 'removed';
  issues: string[];
  confidence: number;
}

/**
 * Client-side content moderation helper
 * Calls the moderate-content Edge Function
 */
export async function moderateContent(
  content: string,
  contentType: 'forum_post' | 'chat_message' | 'resource' | 'profile_bio',
  userId: string
): Promise<ModerationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: {
        content,
        content_type: contentType,
        user_id: userId,
      },
    });

    if (error) {
      console.error('Moderation error:', error);
      // Default to allowing content if moderation fails (fail-open)
      return {
        approved: true,
        decision: 'approved',
        issues: [],
        confidence: 0,
      };
    }

    return {
      approved: data.approved,
      decision: data.decision,
      issues: data.issues || [],
      confidence: data.confidence || 0,
    };
  } catch (error) {
    console.error('Content moderation failed:', error);
    return {
      approved: true,
      decision: 'approved',
      issues: [],
      confidence: 0,
    };
  }
}

/**
 * Check if content contains personal information
 * Quick client-side check before sending to backend
 */
export function containsPersonalInfo(content: string): boolean {
  const patterns = [
    // Phone numbers (SA format)
    /\b0[678]\d{8}\b/,
    /\+27\s?\d{9,10}/,
    // Email addresses
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    // ID numbers (13 digits)
    /\b\d{13}\b/,
    // Street addresses
    /\d+\s+[A-Za-z]+\s+(street|road|avenue|drive|lane|way)/i,
  ];

  return patterns.some(pattern => pattern.test(content));
}

/**
 * Filter profanity with asterisks
 * Basic client-side filter for immediate feedback
 */
export function filterProfanity(content: string): string {
  const profanityList = [
    // Basic list - backend has more comprehensive filtering
    'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'piss',
  ];

  let filtered = content;
  profanityList.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });

  return filtered;
}

/**
 * Validate content before submission
 * Returns validation errors or empty array if valid
 */
export function validateContent(
  content: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowLinks?: boolean;
    allowImages?: boolean;
  } = {}
): string[] {
  const errors: string[] = [];
  const {
    minLength = 1,
    maxLength = 10000,
    allowLinks = true,
    allowImages = true,
  } = options;

  if (content.length < minLength) {
    errors.push(`Content must be at least ${minLength} characters`);
  }

  if (content.length > maxLength) {
    errors.push(`Content must be less than ${maxLength} characters`);
  }

  if (!allowLinks && /https?:\/\/[^\s]+/.test(content)) {
    errors.push('Links are not allowed');
  }

  if (!allowImages && /<img|!\[/.test(content)) {
    errors.push('Images are not allowed');
  }

  if (containsPersonalInfo(content)) {
    errors.push('Please remove personal information (email, phone, etc.)');
  }

  return errors;
}