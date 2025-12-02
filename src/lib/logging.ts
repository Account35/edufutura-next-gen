import { supabase } from '@/integrations/supabase/client';

interface ApiCallLog {
  endpoint: string;
  method: string;
  parameters?: Record<string, any>;
  status: number;
  duration_ms: number;
  user_id?: string;
  error_message?: string;
}

interface UserAction {
  action_type: string;
  action_data?: Record<string, any>;
  user_id: string;
  session_id?: string;
  device_type?: string;
  browser?: string;
}

interface PerformanceMetric {
  page: string;
  metric_name: 'page_load' | 'ttfb' | 'fcp' | 'lcp' | 'tti';
  value_ms: number;
  device_type: string;
  user_id?: string;
}

/**
 * API Call Logger - Tracks all Supabase service calls
 */
export async function logApiCall(log: ApiCallLog): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('api_call_log' as any).insert({
      endpoint: log.endpoint,
      method: log.method,
      parameters: log.parameters,
      status: log.status,
      duration_ms: log.duration_ms,
      user_id: log.user_id || user?.id,
      error_message: log.error_message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log API call:', error);
  }
}

/**
 * User Action Logger - Tracks significant user actions
 */
export async function logUserAction(action: UserAction): Promise<void> {
  try {
    const sessionId = sessionStorage.getItem('session_id') || crypto.randomUUID();
    sessionStorage.setItem('session_id', sessionId);

    const userAgent = navigator.userAgent;
    const deviceType = /mobile/i.test(userAgent) ? 'mobile' : 
                      /tablet/i.test(userAgent) ? 'tablet' : 'desktop';
    
    const browser = userAgent.includes('Chrome') ? 'Chrome' :
                   userAgent.includes('Firefox') ? 'Firefox' :
                   userAgent.includes('Safari') ? 'Safari' : 'Other';

    await supabase.from('user_actions' as any).insert({
      action_type: action.action_type,
      action_data: action.action_data,
      user_id: action.user_id,
      session_id: sessionId,
      device_type: deviceType,
      browser: browser,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log user action:', error);
  }
}

/**
 * Performance Logger - Measures critical user journeys
 */
export async function logPerformanceMetric(metric: PerformanceMetric): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('performance_metrics' as any).insert({
      page: metric.page,
      metric_name: metric.metric_name,
      value_ms: metric.value_ms,
      device_type: metric.device_type,
      user_id: user?.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log performance metric:', error);
  }
}

/**
 * Performance Observer - Auto-tracks Web Vitals
 */
export function initPerformanceObserver(pageName: string): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  const deviceType = /mobile/i.test(navigator.userAgent) ? 'mobile' : 
                    /tablet/i.test(navigator.userAgent) ? 'tablet' : 'desktop';

  // Track First Contentful Paint
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          logPerformanceMetric({
            page: pageName,
            metric_name: 'fcp',
            value_ms: entry.startTime,
            device_type: deviceType
          });
        }
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });
  } catch (e) {
    console.warn('FCP observer not supported');
  }

  // Track Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      logPerformanceMetric({
        page: pageName,
        metric_name: 'lcp',
        value_ms: lastEntry.startTime,
        device_type: deviceType
      });
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('LCP observer not supported');
  }

  // Track Page Load Time
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const ttfb = perfData.responseStart - perfData.navigationStart;

      logPerformanceMetric({
        page: pageName,
        metric_name: 'page_load',
        value_ms: pageLoadTime,
        device_type: deviceType
      });

      logPerformanceMetric({
        page: pageName,
        metric_name: 'ttfb',
        value_ms: ttfb,
        device_type: deviceType
      });
    }, 0);
  });
}

/**
 * Helper to track common user actions
 */
export const trackAction = {
  quizStarted: (userId: string, quizId: string) => 
    logUserAction({ action_type: 'quiz_started', action_data: { quizId }, user_id: userId }),
  
  quizCompleted: (userId: string, quizId: string, score: number) =>
    logUserAction({ action_type: 'quiz_completed', action_data: { quizId, score }, user_id: userId }),
  
  certificateDownloaded: (userId: string, certificateId: string) =>
    logUserAction({ action_type: 'certificate_downloaded', action_data: { certificateId }, user_id: userId }),
  
  subscriptionUpgraded: (userId: string, plan: string) =>
    logUserAction({ action_type: 'subscription_upgraded', action_data: { plan }, user_id: userId }),
  
  forumPostCreated: (userId: string, postId: string, forumId: string) =>
    logUserAction({ action_type: 'forum_post_created', action_data: { postId, forumId }, user_id: userId }),
  
  studyGroupJoined: (userId: string, groupId: string) =>
    logUserAction({ action_type: 'study_group_joined', action_data: { groupId }, user_id: userId }),
  
  aiQuestionAsked: (userId: string, conversationId: string) =>
    logUserAction({ action_type: 'ai_question_asked', action_data: { conversationId }, user_id: userId }),
  
  chapterCompleted: (userId: string, chapterId: string) =>
    logUserAction({ action_type: 'chapter_completed', action_data: { chapterId }, user_id: userId })
};
