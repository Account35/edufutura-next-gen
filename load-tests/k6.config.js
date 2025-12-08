// k6 Load Testing Configuration for EduFutura
// Run with: k6 run load-tests/scenarios/[scenario].js

export const BASE_URL = __ENV.BASE_URL || 'https://umnpomycamfmsrssjuqn.supabase.co';
export const FUNCTIONS_URL = `${BASE_URL}/functions/v1`;
export const API_URL = `${BASE_URL}/rest/v1`;

// Test user credentials (create dedicated test accounts)
export const TEST_USERS = {
  free: {
    email: 'loadtest-free@edufutura.test',
    password: 'LoadTest2024!Free'
  },
  premium: {
    email: 'loadtest-premium@edufutura.test', 
    password: 'LoadTest2024!Premium'
  }
};

// Load profiles
export const LOAD_PROFILES = {
  baseline: {
    vus: 100,
    duration: '30m',
    rampUp: '5m',
    rampDown: '2m'
  },
  highLoad: {
    vus: 500,
    duration: '30m',
    rampUp: '5m',
    rampDown: '3m'
  },
  stress: {
    vus: 1000,
    duration: '30m',
    rampUp: '10m',
    rampDown: '5m'
  },
  spike: {
    vus: 1500,
    duration: '10m',
    rampUp: '1m',
    rampDown: '2m'
  }
};

// Performance thresholds
export const THRESHOLDS = {
  // HTTP metrics
  http_req_duration: ['p(95)<2000', 'p(99)<5000'],
  http_req_failed: ['rate<0.01'],
  http_reqs: ['rate>100'],
  
  // Custom metrics thresholds
  login_duration: ['p(95)<1500'],
  dashboard_load: ['p(95)<2000'],
  quiz_submission: ['p(95)<3000'],
  chat_message: ['p(95)<500'],
  search_query: ['p(95)<1000'],
  certificate_generation: ['p(95)<10000']
};

// Think time ranges (milliseconds)
export const THINK_TIME = {
  min: 1000,
  max: 5000,
  reading: {
    min: 10000,
    max: 30000
  },
  typing: {
    min: 5000,
    max: 15000
  }
};

// API endpoints
export const ENDPOINTS = {
  auth: {
    login: '/auth/v1/token?grant_type=password',
    refresh: '/auth/v1/token?grant_type=refresh_token',
    logout: '/auth/v1/logout'
  },
  api: {
    users: '/users',
    subjects: '/curriculum_subjects',
    chapters: '/curriculum_chapters',
    progress: '/user_progress',
    quizzes: '/quizzes',
    quizAttempts: '/quiz_attempts',
    forums: '/forums',
    forumPosts: '/forum_posts',
    studyGroups: '/study_groups',
    groupMessages: '/group_chat_messages',
    notifications: '/notifications',
    certificates: '/user_certificates',
    bookmarks: '/bookmarks'
  },
  functions: {
    generateQuiz: '/generate-quiz',
    gradeAnswer: '/grade-short-answer',
    generateCertificate: '/generate-certificate',
    aiChat: '/ai-cerebras',
    matchBuddies: '/match-study-buddies'
  }
};
