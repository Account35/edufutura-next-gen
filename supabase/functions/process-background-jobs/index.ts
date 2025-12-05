import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackgroundJob {
  id: string;
  job_type: string;
  payload: Record<string, any>;
  attempts_count: number;
  max_attempts: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const workerId = crypto.randomUUID();
    console.log(`[Worker ${workerId}] Starting job processor`);

    // Claim pending jobs
    const { data: jobs, error: fetchError } = await supabaseClient
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(10);

    if (fetchError) throw fetchError;
    if (!jobs || jobs.length === 0) {
      console.log('No pending jobs found');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${jobs.length} pending jobs`);
    const results = [];

    for (const job of jobs as BackgroundJob[]) {
      // Claim job
      const { error: claimError } = await supabaseClient
        .from('background_jobs')
        .update({
          status: 'processing',
          worker_id: workerId,
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('status', 'pending'); // Ensure we only claim if still pending

      if (claimError) {
        console.error(`Failed to claim job ${job.id}:`, claimError);
        continue;
      }

      try {
        // Process job based on type
        await processJob(job, supabaseClient);

        // Mark as completed
        await supabaseClient
          .from('background_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        console.log(`✓ Completed job ${job.id} (${job.job_type})`);
        results.push({ id: job.id, status: 'completed' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`✗ Failed job ${job.id}:`, errorMessage);

        const nextAttempts = job.attempts_count + 1;
        const isFailed = nextAttempts >= job.max_attempts;

        // Calculate exponential backoff: 1min, 5min, 15min
        const backoffMinutes = Math.pow(5, nextAttempts - 1);
        const nextScheduledAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

        await supabaseClient
          .from('background_jobs')
          .update({
            status: isFailed ? 'failed' : 'pending',
            attempts_count: nextAttempts,
            error_message: errorMessage,
            scheduled_at: isFailed ? undefined : nextScheduledAt.toISOString(),
          })
          .eq('id', job.id);

        results.push({ id: job.id, status: isFailed ? 'failed' : 'retrying', error: errorMessage });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Job processor error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processJob(job: BackgroundJob, supabase: any): Promise<void> {
  console.log(`Processing ${job.job_type} job ${job.id}`);

  switch (job.job_type) {
    case 'send_email':
      await sendEmailJob(job.payload, supabase);
      break;
    case 'generate_report':
      await generateReportJob(job.payload, supabase);
      break;
    case 'process_bulk_upload':
      await processBulkUploadJob(job.payload, supabase);
      break;
    case 'cleanup_expired_sessions':
      await cleanupExpiredSessionsJob(supabase);
      break;
    default:
      throw new Error(`Unknown job type: ${job.job_type}`);
  }
}

async function sendEmailJob(payload: any, supabase: any): Promise<void> {
  // Delegate to send-notifications edge function
  const response = await supabase.functions.invoke('send-notifications', {
    body: payload,
  });
  
  if (response.error) throw response.error;
}

async function generateReportJob(payload: any, supabase: any): Promise<void> {
  // Report generation logic here
  console.log('Generating report for:', payload);
  // TODO: Implement report generation using Puppeteer/jsPDF
}

async function processBulkUploadJob(payload: any, supabase: any): Promise<void> {
  // Bulk upload processing logic
  console.log('Processing bulk upload:', payload);
  // TODO: Implement CSV/bulk data processing
}

async function cleanupExpiredSessionsJob(supabase: any): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // Cleanup old audit logs
  await supabase
    .from('user_audit_log')
    .delete()
    .lt('created_at', thirtyDaysAgo.toISOString());
  
  console.log('Cleaned up expired sessions');
}
