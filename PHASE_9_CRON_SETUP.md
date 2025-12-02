# Phase 9: Background Jobs & Cron Setup

## Background Job System

The application now has a complete background job queue system for async processing:

### Database Tables Created
- `background_jobs` - Job queue with status tracking
- `api_call_log` - API call monitoring
- `user_actions` - User behavior analytics
- `performance_metrics` - Web vitals tracking
- `quiz_performance_history` - Daily quiz stats snapshots
- `certificate_queue` - Batch certificate generation
- `notification_digests` - Email digest batching
- `hourly_active_users` - Active user analytics
- `daily_content_metrics` - Content engagement metrics

### Edge Functions
- `process-background-jobs` - Job processor (run every 1 minute)
- `aggregate-daily-stats` - Daily aggregation (run at 01:00 UTC)

## Setting Up Cron Jobs (pg_cron)

To enable scheduled execution, run these SQL commands in Lovable Cloud Backend:

### 1. Enable Extensions
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 2. Schedule Job Processor (Every Minute)
```sql
SELECT cron.schedule(
  'process-background-jobs',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://umnpomycamfmsrssjuqn.supabase.co/functions/v1/process-background-jobs',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbnBvbXljYW1mbXNyc3NqdXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODgwMjYsImV4cCI6MjA3ODE2NDAyNn0.tZXSwHhsq_vuOOZjhMUi1RtY-3PjymDYpKfaSjuHWmY"}'::jsonb
  ) as request_id;
  $$
);
```

### 3. Schedule Daily Stats Aggregation (01:00 UTC)
```sql
SELECT cron.schedule(
  'aggregate-daily-stats',
  '0 1 * * *', -- Daily at 01:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://umnpomycamfmsrssjuqn.supabase.co/functions/v1/aggregate-daily-stats',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbnBvbXljYW1mbXNyc3NqdXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODgwMjYsImV4cCI6MjA3ODE2NDAyNn0.tZXSwHhsq_vuOOZjhMUi1RtY-3PjymDYpKfaSjuHWmY"}'::jsonb
  ) as request_id;
  $$
);
```

### 4. Check Scheduled Jobs
```sql
SELECT * FROM cron.job;
```

### 5. View Job Run History
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## Job Types

### Queue a Job from Frontend
```typescript
import { useJobQueue } from '@/hooks/useJobQueue';

const { queueEmailJob, queueReportGeneration } = useJobQueue();

// Queue email
await queueEmailJob('user@example.com', 'Subject', '<html>Body</html>');

// Queue report generation
await queueReportGeneration(userId, 'progress_report', { subject: 'Mathematics' });
```

### Supported Job Types
- `send_email` - Email delivery via SendGrid
- `generate_report` - PDF report generation
- `process_bulk_upload` - CSV/bulk data processing
- `cleanup_expired_sessions` - Session cleanup

## Monitoring

Access job monitoring dashboard at `/admin/jobs` (admin only)

### Features
- Real-time job status overview
- Failed job retry functionality
- Job history with filters
- Performance statistics
- Error details and debugging

## Error Tracking

### Custom Error Classes
```typescript
import { RateLimitError, ExternalServiceError, DatabaseError } from '@/lib/errors';

// Throw typed errors
throw new RateLimitError('ai_question', 3, resetTime);
throw new ExternalServiceError('openai', 'API timeout', '503', 30);
throw new DatabaseError('insert', 'users', 'Unique constraint violation');
```

### Error Boundaries
- `AppErrorBoundary` - Wraps entire app (catastrophic errors)
- `RouteErrorBoundary` - Wraps routes (page-level errors)
- `FeatureErrorBoundary` - Wraps complex features (quiz, AI chat)

### Logging
```typescript
import { trackAction, logApiCall, initPerformanceObserver } from '@/lib/logging';

// Track user actions
trackAction.quizStarted(userId, quizId);
trackAction.certificateDownloaded(userId, certId);

// Log API calls (automatic via api-wrapper)
import { db } from '@/lib/api-wrapper';
await db.select('users', () => supabase.from('users').select().eq('id', userId));

// Monitor performance
initPerformanceObserver('dashboard'); // Call on page mount
```

## Next Steps

1. ✅ Database schema created
2. ✅ Edge functions deployed
3. ⏳ Enable pg_cron extension (run SQL above in Backend)
4. ⏳ Schedule cron jobs (run SQL above in Backend)
5. ⏳ Configure monitoring alerts
6. ⏳ Integrate Sentry for production error tracking
