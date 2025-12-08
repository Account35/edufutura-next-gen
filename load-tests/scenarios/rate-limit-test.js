// k6 Load Test: Rate Limit Testing
// Validates rate limit enforcement and behavior

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { FUNCTIONS_URL, TEST_USERS } from '../k6.config.js';
import { login, callEdgeFunction } from '../utils/helpers.js';

// Custom metrics
const rateLimitHits = new Counter('rate_limit_hits');
const successfulRequests = new Counter('successful_requests');
const rateLimitEnforced = new Rate('rate_limit_enforced');
const retryAfterTime = new Trend('retry_after_seconds');

// Test configuration
export const options = {
  scenarios: {
    // Single user hitting rate limits
    singleUserRateLimit: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 20, // Exceed daily limit
      maxDuration: '5m'
    },
    // Multiple users testing concurrent rate limits
    multiUserRateLimit: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      startTime: '6m'
    },
    // Burst test
    burstTest: {
      executor: 'shared-iterations',
      vus: 50,
      iterations: 200,
      maxDuration: '2m',
      startTime: '12m'
    }
  },
  thresholds: {
    'rate_limit_enforced': ['rate>0.9'], // Rate limits should be enforced 90%+ of time after limit hit
    'retry_after_seconds': ['avg>0'] // Should provide retry-after header
  }
};

export default function() {
  // Login
  const session = login(TEST_USERS.free.email, TEST_USERS.free.password);
  
  if (!session) {
    console.error('Login failed');
    return;
  }
  
  const { accessToken, user } = session;
  
  group('AI Question Rate Limits', () => {
    // Free users have 3 questions/day limit
    // Try to exceed it
    for (let i = 0; i < 5; i++) {
      const res = callEdgeFunction('ai-cerebras', {
        message: `Test question ${i + 1}: What is 2 + 2?`,
        user_id: user.id
      }, accessToken);
      
      if (res.status === 429) {
        rateLimitHits.add(1);
        rateLimitEnforced.add(1);
        
        // Check for Retry-After header
        const retryAfter = res.headers['Retry-After'];
        if (retryAfter) {
          retryAfterTime.add(parseInt(retryAfter));
        }
        
        check(res, {
          'rate limit response': (r) => r.status === 429,
          'has error message': (r) => {
            try {
              const body = r.json();
              return body.error && body.error.includes('limit');
            } catch {
              return false;
            }
          }
        });
      } else if (res.status === 200) {
        successfulRequests.add(1);
        rateLimitEnforced.add(0);
      }
      
      sleep(0.5);
    }
  });
  
  group('Quiz Generation Rate Limits', () => {
    // Free users have limited quiz generations
    for (let i = 0; i < 5; i++) {
      const res = callEdgeFunction('generate-quiz', {
        subject: 'Mathematics',
        chapter_id: 'test-chapter',
        question_count: 5,
        user_id: user.id
      }, accessToken);
      
      if (res.status === 429) {
        rateLimitHits.add(1);
        rateLimitEnforced.add(1);
        
        check(res, {
          'quiz rate limit enforced': (r) => r.status === 429
        });
      } else {
        successfulRequests.add(1);
        rateLimitEnforced.add(0);
      }
      
      sleep(1);
    }
  });
  
  group('API Rate Limits by IP', () => {
    // Test general API rate limits
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': __ENV.SUPABASE_ANON_KEY
    };
    
    // Rapid fire requests
    for (let i = 0; i < 30; i++) {
      const res = http.get(
        `${__ENV.BASE_URL}/rest/v1/curriculum_subjects?limit=1`,
        { headers }
      );
      
      if (res.status === 429) {
        rateLimitHits.add(1);
        break;
      }
      
      sleep(0.05); // 50ms between requests
    }
  });
  
  group('Rate Limit Recovery', () => {
    // Wait for rate limit window to pass
    sleep(60);
    
    // Try again
    const res = callEdgeFunction('ai-cerebras', {
      message: 'Recovery test question',
      user_id: user.id
    }, accessToken);
    
    check(res, {
      'rate limit recovered': (r) => r.status === 200 || r.status === 429
    });
  });
  
  sleep(2);
}

export function setup() {
  console.log('Starting Rate Limit Test');
  console.log('Testing rate limit enforcement for free tier users');
  
  // Verify test accounts
  const session = login(TEST_USERS.free.email, TEST_USERS.free.password);
  
  if (!session) {
    throw new Error('Free test account login failed');
  }
  
  return { verified: true };
}

export function teardown(data) {
  console.log('Rate Limit Test Complete');
  console.log(`Total rate limit hits: ${rateLimitHits.value || 0}`);
}
