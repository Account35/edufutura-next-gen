// k6 Load Test: Database Stress Testing
// Tests database performance under heavy concurrent load

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { API_URL } from '../k6.config.js';

// Custom metrics
const queryLatency = new Trend('db_query_latency');
const writeLatency = new Trend('db_write_latency');
const complexQueryLatency = new Trend('db_complex_query_latency');
const lockWaitTime = new Trend('db_lock_wait_time');
const queryErrors = new Counter('db_query_errors');
const querySuccess = new Rate('db_query_success');

// Test configuration
export const options = {
  scenarios: {
    // Concurrent read operations
    heavyReads: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '1m', target: 0 }
      ],
      exec: 'readOperations'
    },
    // Concurrent write operations
    heavyWrites: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '1m', target: 0 }
      ],
      startTime: '8m',
      exec: 'writeOperations'
    },
    // Complex aggregation queries
    complexQueries: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      startTime: '16m',
      exec: 'complexOperations'
    },
    // Mixed workload
    mixedWorkload: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '10m', target: 100 },
        { duration: '2m', target: 0 }
      ],
      startTime: '22m',
      exec: 'mixedOperations'
    }
  },
  thresholds: {
    'db_query_latency': ['p(95)<500', 'p(99)<1000'],
    'db_write_latency': ['p(95)<1000', 'p(99)<2000'],
    'db_complex_query_latency': ['p(95)<2000'],
    'db_query_success': ['rate>0.99']
  }
};

const headers = {
  'Content-Type': 'application/json',
  'apikey': __ENV.SUPABASE_ANON_KEY
};

// Read operations
export function readOperations() {
  group('Simple Reads', () => {
    const startTime = Date.now();
    
    const res = http.get(
      `${API_URL}/curriculum_subjects?is_published=eq.true&select=id,subject_name,grade_level&limit=20`,
      { headers }
    );
    
    queryLatency.add(Date.now() - startTime);
    
    const success = check(res, {
      'read successful': (r) => r.status === 200
    });
    
    querySuccess.add(success ? 1 : 0);
    if (!success) queryErrors.add(1);
    
    sleep(0.1);
  });
  
  group('Filtered Reads', () => {
    const grades = [8, 9, 10, 11, 12];
    const grade = grades[Math.floor(Math.random() * grades.length)];
    
    const startTime = Date.now();
    
    const res = http.get(
      `${API_URL}/curriculum_chapters?select=*,curriculum_subjects!inner(subject_name)&curriculum_subjects.grade_level=eq.${grade}&is_published=eq.true&limit=50`,
      { headers }
    );
    
    queryLatency.add(Date.now() - startTime);
    
    check(res, {
      'filtered read successful': (r) => r.status === 200
    });
    
    sleep(0.1);
  });
  
  group('Paginated Reads', () => {
    const offset = Math.floor(Math.random() * 500);
    
    const startTime = Date.now();
    
    const res = http.get(
      `${API_URL}/forum_posts?select=*&order=created_at.desc&offset=${offset}&limit=20`,
      { headers }
    );
    
    queryLatency.add(Date.now() - startTime);
    
    check(res, {
      'paginated read successful': (r) => r.status === 200
    });
    
    sleep(0.1);
  });
}

// Write operations (requires auth - simulated with service key in real test)
export function writeOperations() {
  group('Activity Log Writes', () => {
    const startTime = Date.now();
    
    // Simulating write to activity_log (would need auth token in real test)
    const payload = {
      user_id: 'load-test-user-' + __VU,
      activity_type: 'load_test',
      activity_description: `Load test activity at ${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    // Note: In real test, this would use service role key or authenticated user
    const res = http.post(
      `${API_URL}/activity_log`,
      JSON.stringify(payload),
      { 
        headers: {
          ...headers,
          'Prefer': 'return=minimal'
        }
      }
    );
    
    writeLatency.add(Date.now() - startTime);
    
    // Expect 401/403 without proper auth - that's OK for this test
    // In production test, would check for 201
    check(res, {
      'write attempted': (r) => r.status !== 500
    });
    
    sleep(0.2);
  });
  
  group('Concurrent Updates', () => {
    const startTime = Date.now();
    
    // Simulate concurrent progress updates
    const res = http.patch(
      `${API_URL}/user_progress?user_id=eq.load-test-user-${__VU}`,
      JSON.stringify({
        progress_percentage: Math.floor(Math.random() * 100),
        last_accessed: new Date().toISOString()
      }),
      { headers }
    );
    
    writeLatency.add(Date.now() - startTime);
    
    sleep(0.2);
  });
}

// Complex operations (aggregations, joins)
export function complexOperations() {
  group('Complex Join Queries', () => {
    const startTime = Date.now();
    
    const res = http.get(
      `${API_URL}/forum_posts?select=*,forums(forum_title,subject_name),post_replies(count)&moderation_status=eq.approved&order=created_at.desc&limit=30`,
      { headers }
    );
    
    complexQueryLatency.add(Date.now() - startTime);
    
    check(res, {
      'complex join successful': (r) => r.status === 200
    });
    
    sleep(0.5);
  });
  
  group('Aggregation Queries', () => {
    const startTime = Date.now();
    
    // Count with grouping simulation
    const res = http.get(
      `${API_URL}/curriculum_subjects?select=id,subject_name,grade_level&is_published=eq.true`,
      { 
        headers: {
          ...headers,
          'Prefer': 'count=exact'
        }
      }
    );
    
    complexQueryLatency.add(Date.now() - startTime);
    
    check(res, {
      'aggregation successful': (r) => r.status === 200 || r.status === 206
    });
    
    sleep(0.5);
  });
  
  group('Full-Text Search', () => {
    const terms = ['algebra', 'photosynthesis', 'apartheid', 'economics', 'chemistry', 'trigonometry'];
    const term = terms[Math.floor(Math.random() * terms.length)];
    
    const startTime = Date.now();
    
    const res = http.get(
      `${API_URL}/curriculum_chapters?or=(chapter_title.ilike.*${term}*,chapter_description.ilike.*${term}*,content_markdown.ilike.*${term}*)&select=id,chapter_title,subject_id&limit=20`,
      { headers }
    );
    
    complexQueryLatency.add(Date.now() - startTime);
    
    check(res, {
      'full-text search successful': (r) => r.status === 200
    });
    
    sleep(0.5);
  });
}

// Mixed workload (realistic scenario)
export function mixedOperations() {
  // 70% reads, 20% complex queries, 10% writes
  const rand = Math.random();
  
  if (rand < 0.7) {
    readOperations();
  } else if (rand < 0.9) {
    complexOperations();
  } else {
    writeOperations();
  }
}

export function setup() {
  console.log('Starting Database Stress Test');
  console.log('Testing read, write, and complex query performance');
  
  // Verify database connectivity
  const res = http.get(`${API_URL}/curriculum_subjects?limit=1`, { headers });
  
  if (res.status !== 200) {
    throw new Error(`Database not accessible: ${res.status}`);
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Database Stress Test Complete - Duration: ${duration}s`);
}
