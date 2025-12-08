// k6 Load Test: Complete Student Journey
// Simulates typical student workflow through the platform

import { sleep, group } from 'k6';
import { LOAD_PROFILES, THRESHOLDS, TEST_USERS } from '../k6.config.js';
import { 
  login, 
  authRequest, 
  callEdgeFunction,
  think, 
  randomChoice,
  generateQuizAnswers,
  generateForumPost,
  checkResponse,
  metrics,
  batchRequests
} from '../utils/helpers.js';

// Test configuration
export const options = {
  scenarios: {
    studentJourney: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },   // Ramp up to baseline
        { duration: '25m', target: 100 },  // Stay at baseline
        { duration: '5m', target: 500 },   // Ramp to high load
        { duration: '20m', target: 500 },  // Stay at high load
        { duration: '5m', target: 0 }      // Ramp down
      ],
      gracefulRampDown: '2m'
    }
  },
  thresholds: THRESHOLDS
};

// Main test function
export default function() {
  // Login
  const session = login(TEST_USERS.premium.email, TEST_USERS.premium.password);
  
  if (!session) {
    console.error('Login failed, skipping iteration');
    return;
  }
  
  const { accessToken, user } = session;
  
  // 1. Load Dashboard
  group('Dashboard Load', () => {
    const startTime = Date.now();
    
    // Batch load dashboard data
    const responses = batchRequests([
      { url: `/users?id=eq.${user.id}&select=*` },
      { url: `/user_progress?user_id=eq.${user.id}&select=*` },
      { url: `/achievements?user_id=eq.${user.id}&select=*,order=earned_at.desc,limit=5` },
      { url: `/activity_log?user_id=eq.${user.id}&select=*&order=timestamp.desc&limit=10` },
      { url: `/notifications?user_id=eq.${user.id}&is_read=eq.false&select=*&limit=20` }
    ], accessToken);
    
    metrics.dashboardLoad.add(Date.now() - startTime);
    
    responses.forEach((res, i) => {
      checkResponse(res, {
        [`dashboard request ${i} successful`]: (r) => r.status === 200
      }, 'Dashboard');
    });
    
    think();
  });
  
  // 2. Browse Curriculum
  group('Browse Curriculum', () => {
    // Get subjects
    const subjectsRes = authRequest('GET', '/curriculum_subjects?is_published=eq.true&select=*', null, accessToken);
    checkResponse(subjectsRes, {
      'subjects loaded': (r) => r.status === 200
    }, 'Subjects');
    
    think();
    
    // Select a subject and load chapters
    const subjects = subjectsRes.json();
    if (subjects && subjects.length > 0) {
      const subject = randomChoice(subjects);
      
      const chaptersRes = authRequest(
        'GET', 
        `/curriculum_chapters?subject_id=eq.${subject.id}&is_published=eq.true&select=*&order=chapter_number`, 
        null, 
        accessToken
      );
      
      checkResponse(chaptersRes, {
        'chapters loaded': (r) => r.status === 200
      }, 'Chapters');
      
      think();
      
      // Read a chapter (simulate content viewing)
      const chapters = chaptersRes.json();
      if (chapters && chapters.length > 0) {
        const chapter = randomChoice(chapters);
        
        // Update progress
        authRequest('POST', '/user_chapter_progress', {
          user_id: user.id,
          chapter_id: chapter.id,
          status: 'in_progress',
          progress_percentage: Math.floor(Math.random() * 100),
          last_accessed: new Date().toISOString()
        }, accessToken);
        
        think('reading');
      }
    }
  });
  
  // 3. Take Quiz
  group('Quiz Taking', () => {
    const startTime = Date.now();
    
    // Get available quizzes
    const quizzesRes = authRequest('GET', '/quizzes?status=eq.published&select=*&limit=10', null, accessToken);
    
    if (quizzesRes.status === 200) {
      const quizzes = quizzesRes.json();
      
      if (quizzes && quizzes.length > 0) {
        const quiz = randomChoice(quizzes);
        
        think('typing');
        
        // Submit quiz attempt
        const answers = generateQuizAnswers(quiz.total_questions || 15);
        
        const submitRes = authRequest('POST', '/quiz_attempts', {
          quiz_id: quiz.id,
          user_id: user.id,
          answers: answers,
          started_at: new Date(Date.now() - 900000).toISOString(), // 15 min ago
          completed_at: new Date().toISOString(),
          status: 'completed'
        }, accessToken);
        
        metrics.quizSubmission.add(Date.now() - startTime);
        
        checkResponse(submitRes, {
          'quiz submitted': (r) => r.status === 201 || r.status === 200
        }, 'Quiz Submit');
      }
    }
    
    think();
  });
  
  // 4. Forum Interaction
  group('Forum Activity', () => {
    // Load forums
    const forumsRes = authRequest('GET', '/forums?is_active=eq.true&select=*', null, accessToken);
    
    if (forumsRes.status === 200) {
      const forums = forumsRes.json();
      
      if (forums && forums.length > 0) {
        const forum = randomChoice(forums);
        
        // Load forum posts
        authRequest('GET', `/forum_posts?forum_id=eq.${forum.id}&select=*&order=created_at.desc&limit=20`, null, accessToken);
        
        think();
        
        // Create a post (20% chance)
        if (Math.random() < 0.2) {
          const post = generateForumPost();
          
          authRequest('POST', '/forum_posts', {
            forum_id: forum.id,
            user_id: user.id,
            post_title: post.title,
            post_content: post.content,
            tags: post.tags,
            moderation_status: 'pending'
          }, accessToken);
        }
      }
    }
    
    think();
  });
  
  // 5. Study Group Chat
  group('Group Chat', () => {
    const startTime = Date.now();
    
    // Get user's groups
    const groupsRes = authRequest(
      'GET', 
      `/group_members?user_id=eq.${user.id}&select=*,study_groups(*)`, 
      null, 
      accessToken
    );
    
    if (groupsRes.status === 200) {
      const memberships = groupsRes.json();
      
      if (memberships && memberships.length > 0) {
        const membership = randomChoice(memberships);
        const groupId = membership.group_id;
        
        // Load recent messages
        authRequest(
          'GET',
          `/group_chat_messages?group_id=eq.${groupId}&select=*&order=created_at.desc&limit=50`,
          null,
          accessToken
        );
        
        think();
        
        // Send messages (5 messages)
        for (let i = 0; i < 5; i++) {
          const msgRes = authRequest('POST', '/group_chat_messages', {
            group_id: groupId,
            sender_id: user.id,
            message_content: `Load test message ${i + 1} - ${Date.now()}`,
            created_at: new Date().toISOString()
          }, accessToken);
          
          if (i === 0) {
            metrics.chatMessage.add(Date.now() - startTime);
          }
          
          sleep(1); // Small delay between messages
        }
      }
    }
    
    think();
  });
  
  // 6. Search
  group('Search', () => {
    const startTime = Date.now();
    
    const searchTerms = ['algebra', 'photosynthesis', 'history', 'economics', 'chemistry'];
    const term = randomChoice(searchTerms);
    
    const searchRes = authRequest(
      'GET',
      `/curriculum_chapters?or=(chapter_title.ilike.*${term}*,chapter_description.ilike.*${term}*)&select=*&limit=20`,
      null,
      accessToken
    );
    
    metrics.searchQuery.add(Date.now() - startTime);
    
    checkResponse(searchRes, {
      'search successful': (r) => r.status === 200
    }, 'Search');
    
    think();
  });
  
  // 7. View Notifications
  group('Notifications', () => {
    // Mark notifications as read
    authRequest(
      'PATCH',
      `/notifications?user_id=eq.${user.id}&is_read=eq.false`,
      { is_read: true, read_at: new Date().toISOString() },
      accessToken
    );
    
    think();
  });
}

// Setup function - runs once before test
export function setup() {
  console.log('Starting Student Journey Load Test');
  console.log(`Base URL: ${__ENV.BASE_URL || 'default'}`);
  
  // Verify test accounts exist
  const session = login(TEST_USERS.premium.email, TEST_USERS.premium.password);
  
  if (!session) {
    throw new Error('Test account login failed - ensure test accounts are created');
  }
  
  return { verified: true };
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log('Student Journey Load Test Complete');
}
