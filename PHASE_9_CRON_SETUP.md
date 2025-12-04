# Phase 9: Backend Infrastructure & API Integration

## Overview

Phase 9 implements comprehensive backend infrastructure supporting all EduFutura features including background job processing, monitoring, API services, and deployment management.

## Infrastructure Components

### 1. Edge Functions (18 Total)
| Function | Purpose | Auth Required |
|----------|---------|---------------|
| ai-cerebras | Quick AI responses (<1s) | Yes |
| ai-gpt4 | Detailed AI explanations | Yes |
| analyze-career-fit | Career matching algorithm | Yes |
| analyze-report | Year-end report OCR | Yes |
| generate-certificate | PDF certificate generation | Yes |
| generate-quiz | AI quiz creation | Yes |
| grade-short-answer | AI grading | Yes |
| health-check | Deployment validation | No |
| match-study-buddies | Buddy matching algorithm | Yes |
| moderate-content | AI content moderation | Yes |
| payfast-webhook | Payment processing | No |
| process-background-jobs | Job queue processor | No |
| aggregate-daily-stats | Daily analytics | No |
| recalculate-reputation | Reputation recalc | No |
| send-notifications | Email delivery | No |
| send-password-reset | Password reset emails | No |
| track-login | Login tracking & streaks | Yes |
| welcome-new-user | New user onboarding | No |

### 2. Database Tables for Monitoring
- `background_jobs` - Async job queue with status tracking
- `api_call_log` - API call monitoring with latency
- `user_actions` - User behavior analytics
- `performance_metrics` - Web vitals (FCP, LCP, TTFB)
- `quiz_performance_history` - Daily quiz stats snapshots
- `certificate_queue` - Batch certificate generation
- `notification_digests` - Email digest batching
- `hourly_active_users` - Active user analytics
- `daily_content_metrics` - Content engagement metrics
- `rate_limit_log` - Rate limit violations

### 3. Monitoring & Logging
- **API Logging**: All Supabase calls logged with duration, status, errors
- **Performance Observer**: Auto-tracks FCP, LCP, TTFB, page load times
- **User Actions**: Tracks quiz starts, completions, forum posts, etc.
- **Error Classes**: Typed errors (RateLimitError, DatabaseError, ExternalServiceError)

## Setting Up Cron Jobs (pg_cron)

### 1. Enable Extensions
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 2. Schedule Job Processor (Every Minute)
```sql
SELECT cron.schedule(
  'process-background-jobs',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://umnpomycamfmsrssjuqn.supabase.co/functions/v1/process-background-jobs',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbnBvbXljYW1mbXNyc3NqdXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODgwMjYsImV4cCI6MjA3ODE2NDAyNn0.tZXSwHhsq_vuOOZjhMUi1RtY-3PjymDYpKfaSjuHWmY"}'::jsonb
  ) as request_id;
  $$
);
```

### 3. Schedule Daily Stats (01:00 UTC)
```sql
SELECT cron.schedule(
  'aggregate-daily-stats',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://umnpomycamfmsrssjuqn.supabase.co/functions/v1/aggregate-daily-stats',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbnBvbXljYW1mbXNyc3NqdXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODgwMjYsImV4cCI6MjA3ODE2NDAyNn0.tZXSwHhsq_vuOOZjhMUi1RtY-3PjymDYpKfaSjuHWmY"}'::jsonb
  ) as request_id;
  $$
);
```

### 4. Schedule Reputation Recalculation (02:00 UTC)
```sql
SELECT cron.schedule(
  'recalculate-reputation',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://umnpomycamfmsrssjuqn.supabase.co/functions/v1/recalculate-reputation',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbnBvbXljYW1mbXNyc3NqdXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODgwMjYsImV4cCI6MjA3ODE2NDAyNn0.tZXSwHhsq_vuOOZjhMUi1RtY-3PjymDYpKfaSjuHWmY"}'::jsonb
  ) as request_id;
  $$
);
```

### 5. View Scheduled Jobs
```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## Health Check Endpoint

Validate deployments by calling:
```bash
curl https://umnpomycamfmsrssjuqn.supabase.co/functions/v1/health-check
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-04T...",
  "services": {
    "database": { "status": "up", "latencyMs": 45 },
    "storage": { "status": "up" },
    "auth": { "status": "up" },
    "edgeFunctions": { "status": "up", "latencyMs": 120 }
  },
  "metrics": {
    "dbLatencyMs": 45,
    "storageAvailable": true
  },
  "version": "1.0.0"
}
```

## Deployment Pipeline

### Pre-Deployment Checklist
- [ ] All migrations tested on development
- [ ] Environment variables configured
- [ ] Health check endpoint responsive
- [ ] Rate limits configured
- [ ] Cron jobs scheduled

### Post-Deployment Verification
1. Call health-check endpoint
2. Verify all services return "up"
3. Check job monitoring dashboard
4. Verify cron jobs running

### Rollback Procedure
1. Identify failing deployment via health-check
2. Revert Edge Functions via Lovable
3. Run rollback migration if needed
4. Verify health-check returns healthy

## Rate Limiting

| Action | Free Limit | Premium Limit |
|--------|------------|---------------|
| AI Questions | 3/day | Unlimited |
| Quiz Generation | 3/day | Unlimited |
| Resource Upload | 10/day | 25/day |
| Forum Posts | 20/day | 50/day |

## Job Queue Usage

```typescript
import { useJobQueue } from '@/hooks/useJobQueue';

const { queueEmailJob, queueReportGeneration, queueCertificateGeneration } = useJobQueue();

// Queue email
await queueEmailJob('user@example.com', 'Subject', '<html>Body</html>');

// Queue report
await queueReportGeneration(userId, 'progress_report', { subject: 'Mathematics' });

// Queue certificate
await queueCertificateGeneration(userId, 'Mathematics');
```

## Error Handling

```typescript
import { RateLimitError, ExternalServiceError, DatabaseError } from '@/lib/errors';

try {
  await someOperation();
} catch (error) {
  if (error instanceof RateLimitError) {
    toast.error(error.getUserMessage());
  } else if (error instanceof ExternalServiceError) {
    if (error.isRetryable) {
      // Implement retry logic
    }
  }
}
```

## Monitoring Dashboard

Access job monitoring at `/admin/jobs` (admin only):
- Real-time job status overview
- Failed job retry functionality
- Job history with filters
- Performance statistics

## Environment Variables

### Edge Functions (Supabase Secrets)
- `SUPABASE_URL` - Auto-provided
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided
- `OPENAI_API_KEY` - Required for AI features
- `CEREBRAS_API_KEY` - Required for quick AI

### Frontend (.env)
- `VITE_SUPABASE_URL` - Auto-provided
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Auto-provided
- `VITE_SUPABASE_PROJECT_ID` - Auto-provided

## Completion Status

- [x] Edge Functions deployed (18 total)
- [x] Logging utilities (API, actions, performance)
- [x] Error handling classes
- [x] Rate limiting service
- [x] Job monitoring dashboard
- [x] Health check endpoint
- [x] Auth events integration
- [x] Activity feed hooks
- [x] Performance stats hooks
- [x] Content moderation utilities
- [ ] Enable pg_cron extension (run SQL above)
- [ ] Schedule cron jobs (run SQL above)
- [ ] Configure external monitoring (Sentry optional)
