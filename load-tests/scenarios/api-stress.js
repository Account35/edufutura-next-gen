// k6 Load Test: API Stress Testing
// Tests API endpoints under extreme load conditions

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, API_URL, THRESHOLDS } from '../k6.config.js';

// Custom metrics
const apiLatency = new Trend('api_latency');
const dbQueryTime = new Trend('db_query_time');
const errorRate = new Rate('error_rate');
const throughput = new Counter('requests_made');

// Stress test configuration
export const options = {
  scenarios: {
    // Constant load baseline
    constantLoad: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
      startTime: '0s'
    },
    // Ramping stress test
    stressTest: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 800 },
        { duration: '5m', target: 800 },
        { duration: '2m', target: 1000 },
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 0 }
      ],
      startTime: '10m'
    },
    // Spike test
    spikeTest: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1500 },
        { duration: '1m', target: 1500 },
        { duration: '30s', target: 0 }
      ],
      startTime: '50m'
    }
  },
  thresholds: {
    ...THRESHOLDS,
    'api_latency': ['p(95)<3000', 'p(99)<5000'],
    'db_query_time': ['p(95)<1000'],
    'error_rate': ['rate<0.05']
  }
};

const ANON_KEY = __ENV.SUPABASE_ANON_KEY;

// API endpoint tests
export default function() {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY
  };
  
  group('Read Operations', () => {
    // Test curriculum subjects (public read)
    const startTime = Date.now();
    
    const subjectsRes = http.get(
      `${API_URL}/curriculum_subjects?is_published=eq.true&select=id,subject_name,grade_level`,
      { headers }
    );
    
    apiLatency.add(Date.now() - startTime);
    throughput.add(1);
    
    const success = check(subjectsRes, {
      'subjects status 200': (r) => r.status === 200,
      'subjects has data': (r) => r.json().length > 0
    });
    
    if (!success) errorRate.add(1);
    else errorRate.add(0);
    
    sleep(0.1);
  });
  
  group('Complex Queries', () => {
    // Test complex join query
    const startTime = Date.now();
    
    const chaptersRes = http.get(
      `${API_URL}/curriculum_chapters?select=*,curriculum_subjects(subject_name)&is_published=eq.true&limit=50`,
      { headers }
    );
    
    dbQueryTime.add(Date.now() - startTime);
    throughput.add(1);
    
    check(chaptersRes, {
      'chapters query successful': (r) => r.status === 200
    });
    
    sleep(0.1);
  });
  
  group('Full-Text Search', () => {
    const searchTerms = ['mathematics', 'science', 'biology', 'physics', 'chemistry', 'history'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    const startTime = Date.now();
    
    const searchRes = http.get(
      `${API_URL}/curriculum_chapters?or=(chapter_title.ilike.*${term}*,chapter_description.ilike.*${term}*)&select=id,chapter_title,chapter_number&limit=20`,
      { headers }
    );
    
    apiLatency.add(Date.now() - startTime);
    throughput.add(1);
    
    check(searchRes, {
      'search successful': (r) => r.status === 200
    });
    
    sleep(0.1);
  });
  
  group('Aggregation Queries', () => {
    // Test count query (simulates dashboard stats)
    const startTime = Date.now();
    
    const statsRes = http.get(
      `${API_URL}/curriculum_subjects?select=id&is_published=eq.true`,
      { 
        headers: {
          ...headers,
          'Prefer': 'count=exact'
        }
      }
    );
    
    dbQueryTime.add(Date.now() - startTime);
    throughput.add(1);
    
    check(statsRes, {
      'stats query successful': (r) => r.status === 200 || r.status === 206
    });
    
    sleep(0.1);
  });
  
  group('Paginated Queries', () => {
    // Test pagination with offset
    const offset = Math.floor(Math.random() * 100);
    const limit = 20;
    
    const startTime = Date.now();
    
    const pageRes = http.get(
      `${API_URL}/forums?is_active=eq.true&select=*&offset=${offset}&limit=${limit}`,
      { headers }
    );
    
    apiLatency.add(Date.now() - startTime);
    throughput.add(1);
    
    check(pageRes, {
      'pagination successful': (r) => r.status === 200
    });
    
    sleep(0.1);
  });
  
  group('Concurrent Batch Requests', () => {
    // Simulate dashboard loading multiple resources
    const startTime = Date.now();
    
    const responses = http.batch([
      ['GET', `${API_URL}/curriculum_subjects?is_published=eq.true&select=id,subject_name&limit=10`, null, { headers }],
      ['GET', `${API_URL}/forums?is_active=eq.true&select=id,forum_title&limit=5`, null, { headers }],
      ['GET', `${API_URL}/career_paths?select=id,career_name&limit=10`, null, { headers }]
    ]);
    
    apiLatency.add(Date.now() - startTime);
    throughput.add(3);
    
    responses.forEach((res, i) => {
      check(res, {
        [`batch request ${i} ok`]: (r) => r.status === 200
      });
    });
    
    sleep(0.2);
  });
}

export function setup() {
  console.log('Starting API Stress Test');
  console.log('Testing public API endpoints under extreme load');
  
  // Verify API is accessible
  const testRes = http.get(`${API_URL}/curriculum_subjects?limit=1`, {
    headers: { 'apikey': ANON_KEY }
  });
  
  if (testRes.status !== 200) {
    throw new Error(`API not accessible: ${testRes.status}`);
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`API Stress Test Complete - Duration: ${duration}s`);
}
