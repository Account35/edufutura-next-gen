-- AI Response Cache table for intelligent caching
CREATE TABLE public.ai_response_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  response_json JSONB NOT NULL,
  model_used TEXT NOT NULL,
  context_hash TEXT,
  template_name TEXT,
  grade_level INTEGER,
  subject_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  hit_count INTEGER NOT NULL DEFAULT 0,
  ttl_seconds INTEGER NOT NULL DEFAULT 86400,
  cache_tags TEXT[] DEFAULT '{}',
  generation_cost_cents NUMERIC DEFAULT 0,
  response_time_ms INTEGER
);

-- Create indexes for fast lookups
CREATE UNIQUE INDEX idx_ai_response_cache_query_hash ON public.ai_response_cache(query_hash);
CREATE INDEX idx_ai_response_cache_context_hash ON public.ai_response_cache(context_hash);
CREATE INDEX idx_ai_response_cache_cache_tags ON public.ai_response_cache USING GIN(cache_tags);
CREATE INDEX idx_ai_response_cache_last_accessed ON public.ai_response_cache(last_accessed);
CREATE INDEX idx_ai_response_cache_template ON public.ai_response_cache(template_name);
CREATE INDEX idx_ai_response_cache_expiry ON public.ai_response_cache(created_at, ttl_seconds);

-- Cache metrics table for tracking performance
CREATE TABLE public.ai_cache_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  template_name TEXT,
  total_requests INTEGER NOT NULL DEFAULT 0,
  cache_hits INTEGER NOT NULL DEFAULT 0,
  cache_misses INTEGER NOT NULL DEFAULT 0,
  avg_cached_latency_ms NUMERIC,
  avg_fresh_latency_ms NUMERIC,
  estimated_cost_saved_cents NUMERIC DEFAULT 0,
  miss_reasons JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(metric_date, template_name)
);

-- Enable RLS
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cache_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for cache (system managed)
CREATE POLICY "System can manage cache" ON public.ai_response_cache FOR ALL USING (true);
CREATE POLICY "System can manage cache metrics" ON public.ai_cache_metrics FOR ALL USING (true);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE created_at + (ttl_seconds || ' seconds')::INTERVAL < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to evict LRU entries when cache is full
CREATE OR REPLACE FUNCTION public.evict_lru_cache(max_entries INTEGER DEFAULT 100000)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
  to_evict INTEGER;
  evicted INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO current_count FROM public.ai_response_cache;
  
  IF current_count > max_entries * 0.9 THEN
    to_evict := current_count - (max_entries * 0.8)::INTEGER;
    
    DELETE FROM public.ai_response_cache
    WHERE id IN (
      SELECT id FROM public.ai_response_cache
      ORDER BY 
        (hit_count * 0.5) + 
        (EXTRACT(EPOCH FROM (now() - last_accessed)) / 86400 * -0.3) +
        (generation_cost_cents * 0.2)
      ASC
      LIMIT to_evict
    );
    
    GET DIAGNOSTICS evicted = ROW_COUNT;
  END IF;
  
  RETURN evicted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invalidate cache by tags
CREATE OR REPLACE FUNCTION public.invalidate_cache_by_tags(tags TEXT[])
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE cache_tags && tags;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to invalidate cache when curriculum content changes
CREATE OR REPLACE FUNCTION public.invalidate_curriculum_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Invalidate caches related to the updated chapter
  PERFORM public.invalidate_cache_by_tags(
    ARRAY[
      'chapter_' || COALESCE(NEW.id::TEXT, OLD.id::TEXT),
      'subject_' || COALESCE(NEW.subject_id::TEXT, OLD.subject_id::TEXT)
    ]
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to curriculum_chapters
DROP TRIGGER IF EXISTS trigger_invalidate_cache_on_chapter_update ON public.curriculum_chapters;
CREATE TRIGGER trigger_invalidate_cache_on_chapter_update
AFTER UPDATE OR DELETE ON public.curriculum_chapters
FOR EACH ROW EXECUTE FUNCTION public.invalidate_curriculum_cache();

-- Index for cache metrics queries
CREATE INDEX idx_ai_cache_metrics_date ON public.ai_cache_metrics(metric_date DESC);