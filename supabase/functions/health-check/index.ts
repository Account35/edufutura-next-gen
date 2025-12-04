import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceStatus;
    storage: ServiceStatus;
    auth: ServiceStatus;
    edgeFunctions: ServiceStatus;
  };
  metrics: {
    dbLatencyMs: number;
    storageAvailable: boolean;
    activeConnections?: number;
  };
  version: string;
}

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'down' },
      storage: { status: 'down' },
      auth: { status: 'down' },
      edgeFunctions: { status: 'up', latencyMs: 0 },
    },
    metrics: {
      dbLatencyMs: 0,
      storageAvailable: false,
    },
    version: '1.0.0',
  };

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Check database connectivity
  try {
    const dbStart = Date.now();
    const { data, error } = await supabaseClient
      .from('users')
      .select('count')
      .limit(1);
    
    const dbLatency = Date.now() - dbStart;
    results.metrics.dbLatencyMs = dbLatency;

    if (error) {
      results.services.database = { 
        status: 'down', 
        message: error.message,
        latencyMs: dbLatency 
      };
    } else {
      results.services.database = { 
        status: dbLatency > 1000 ? 'degraded' : 'up',
        latencyMs: dbLatency,
        message: dbLatency > 1000 ? 'High latency detected' : undefined
      };
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    results.services.database = { 
      status: 'down', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }

  // Check storage connectivity
  try {
    const { data: buckets, error } = await supabaseClient
      .storage
      .listBuckets();
    
    if (error) {
      results.services.storage = { status: 'down', message: error.message };
    } else {
      results.services.storage = { status: 'up' };
      results.metrics.storageAvailable = true;
    }
  } catch (error) {
    console.error('Storage health check failed:', error);
    results.services.storage = { 
      status: 'down', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }

  // Check auth service
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    // No error means auth service is responsive
    results.services.auth = { status: 'up' };
  } catch (error) {
    console.error('Auth health check failed:', error);
    results.services.auth = { 
      status: 'down', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }

  // Edge functions are healthy if we got here
  results.services.edgeFunctions = { 
    status: 'up', 
    latencyMs: Date.now() - startTime 
  };

  // Determine overall status
  const serviceStatuses = Object.values(results.services);
  const hasDown = serviceStatuses.some(s => s.status === 'down');
  const hasDegraded = serviceStatuses.some(s => s.status === 'degraded');

  if (hasDown) {
    results.status = 'unhealthy';
  } else if (hasDegraded) {
    results.status = 'degraded';
  }

  // Log health check results
  console.log(`[health-check] Status: ${results.status}, DB: ${results.services.database.status}, Latency: ${results.metrics.dbLatencyMs}ms`);

  const httpStatus = results.status === 'healthy' ? 200 : 
                     results.status === 'degraded' ? 200 : 503;

  return new Response(
    JSON.stringify(results),
    { 
      status: httpStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
