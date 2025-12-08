// k6 Load Testing Helper Utilities
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, API_URL, FUNCTIONS_URL, THINK_TIME } from '../k6.config.js';

// Custom metrics
export const metrics = {
  loginDuration: new Trend('login_duration'),
  dashboardLoad: new Trend('dashboard_load'),
  quizSubmission: new Trend('quiz_submission'),
  chatMessage: new Trend('chat_message'),
  searchQuery: new Trend('search_query'),
  certificateGeneration: new Trend('certificate_generation'),
  errors: new Counter('custom_errors'),
  rateLimitHits: new Counter('rate_limit_hits')
};

// Authentication helper
export function login(email, password) {
  const startTime = Date.now();
  
  const res = http.post(
    `${BASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': __ENV.SUPABASE_ANON_KEY
      }
    }
  );
  
  metrics.loginDuration.add(Date.now() - startTime);
  
  const success = check(res, {
    'login successful': (r) => r.status === 200,
    'has access token': (r) => r.json('access_token') !== undefined
  });
  
  if (!success) {
    metrics.errors.add(1);
    return null;
  }
  
  return {
    accessToken: res.json('access_token'),
    refreshToken: res.json('refresh_token'),
    user: res.json('user')
  };
}

// Authenticated request helper
export function authRequest(method, endpoint, body, token, customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': __ENV.SUPABASE_ANON_KEY,
    ...customHeaders
  };
  
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  
  let res;
  switch (method.toUpperCase()) {
    case 'GET':
      res = http.get(url, { headers });
      break;
    case 'POST':
      res = http.post(url, JSON.stringify(body), { headers });
      break;
    case 'PATCH':
      res = http.patch(url, JSON.stringify(body), { headers });
      break;
    case 'DELETE':
      res = http.del(url, null, { headers });
      break;
    default:
      res = http.get(url, { headers });
  }
  
  // Track rate limit hits
  if (res.status === 429) {
    metrics.rateLimitHits.add(1);
  }
  
  return res;
}

// Edge function request helper
export function callEdgeFunction(functionName, body, token) {
  const url = `${FUNCTIONS_URL}/${functionName}`;
  
  const res = http.post(url, JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  return res;
}

// Random think time
export function think(type = 'default') {
  const times = type === 'reading' ? THINK_TIME.reading : 
                type === 'typing' ? THINK_TIME.typing : 
                THINK_TIME;
  
  const duration = Math.random() * (times.max - times.min) + times.min;
  sleep(duration / 1000);
}

// Random selection from array
export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Random string generator
export function randomString(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate realistic forum post content
export function generateForumPost() {
  const topics = [
    'Can someone explain quadratic equations?',
    'Study tips for Physical Sciences exam',
    'Best resources for Life Sciences?',
    'How to solve this calculus problem?',
    'Grade 12 preparation strategies',
    'Understanding chemical bonding',
    'History essay writing tips',
    'Geography map reading help needed'
  ];
  
  const content = `
    I'm struggling with this topic and would really appreciate some help from the community.
    Has anyone found good resources or study techniques that worked for them?
    I've been studying for about 2 hours daily but still finding it challenging.
    Any tips or explanations would be greatly appreciated!
    Thanks in advance for your help.
  `.trim();
  
  return {
    title: randomChoice(topics),
    content: content,
    tags: ['help', 'study', 'exam-prep']
  };
}

// Generate quiz answers
export function generateQuizAnswers(questionCount = 15) {
  const answers = {};
  for (let i = 1; i <= questionCount; i++) {
    answers[`q${i}`] = randomChoice(['A', 'B', 'C', 'D']);
  }
  return answers;
}

// Check response and log errors
export function checkResponse(res, checks, context = '') {
  const success = check(res, checks);
  
  if (!success) {
    console.error(`[${context}] Check failed - Status: ${res.status}, Body: ${res.body.substring(0, 200)}`);
    metrics.errors.add(1);
  }
  
  return success;
}

// Batch request helper for concurrent operations
export function batchRequests(requests, token) {
  const responses = http.batch(
    requests.map(req => ({
      method: req.method || 'GET',
      url: req.url.startsWith('http') ? req.url : `${API_URL}${req.url}`,
      body: req.body ? JSON.stringify(req.body) : null,
      params: {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': __ENV.SUPABASE_ANON_KEY
        }
      }
    }))
  );
  
  return responses;
}
