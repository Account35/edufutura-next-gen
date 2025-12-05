import { supabase } from '@/integrations/supabase/client';

interface PromptTemplate {
  id: string;
  template_name: string;
  template_version: number;
  prompt_text: string;
  system_context: string | null;
  model_name: string;
  temperature: number;
  max_tokens: number;
  response_format: string | null;
}

interface TemplateVariables {
  [key: string]: string | number | string[];
}

// Cache for templates to reduce database calls
const templateCache: Map<string, { template: PromptTemplate; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch active prompt template from database with caching
 */
export async function getPromptTemplate(templateName: string): Promise<PromptTemplate | null> {
  // Check cache first
  const cached = templateCache.get(templateName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.template;
  }

  try {
    const { data, error } = await supabase
      .rpc('get_active_template', { p_template_name: templateName });

    if (error) {
      console.error('Error fetching template:', error);
      return null;
    }

    if (data && data.length > 0) {
      const template = data[0] as PromptTemplate;
      templateCache.set(templateName, { template, timestamp: Date.now() });
      return template;
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch prompt template:', err);
    return null;
  }
}

/**
 * Replace template variables with actual values
 */
export function interpolateTemplate(promptText: string, variables: TemplateVariables): string {
  let result = promptText;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    const stringValue = Array.isArray(value) ? value.join(', ') : String(value);
    result = result.replace(placeholder, stringValue);
  }
  
  return result;
}

/**
 * Get fully prepared prompt with variables interpolated
 */
export async function getPreparedPrompt(
  templateName: string,
  variables: TemplateVariables
): Promise<{
  prompt: string;
  systemContext: string | null;
  modelName: string;
  temperature: number;
  maxTokens: number;
  templateVersion: number;
} | null> {
  const template = await getPromptTemplate(templateName);
  
  if (!template) {
    console.error(`Template not found: ${templateName}`);
    return null;
  }

  return {
    prompt: interpolateTemplate(template.prompt_text, variables),
    systemContext: template.system_context ? interpolateTemplate(template.system_context, variables) : null,
    modelName: template.model_name,
    temperature: template.temperature,
    maxTokens: template.max_tokens,
    templateVersion: template.template_version,
  };
}

/**
 * Log a failed AI response for optimization
 */
export async function logFailedResponse(
  templateName: string,
  templateVersion: number,
  modelName: string,
  inputData: object,
  aiResponse: string | null,
  failureReason: string
): Promise<void> {
  try {
    await supabase.from('failed_ai_responses').insert({
      template_name: templateName,
      template_version: templateVersion,
      model_name: modelName,
      input_data: inputData as Record<string, unknown>,
      ai_response: aiResponse,
      failure_reason: failureReason,
    } as any);
  } catch (err) {
    console.error('Failed to log AI response failure:', err);
  }
}

/**
 * Update template performance metrics
 */
export async function updateTemplateMetrics(
  templateName: string,
  templateVersion: number,
  success: boolean,
  rating?: number,
  cost?: number
): Promise<void> {
  try {
    await supabase.rpc('update_template_metrics', {
      p_template_name: templateName,
      p_template_version: templateVersion,
      p_success: success,
      p_rating: rating ?? null,
      p_cost: cost ?? 0,
    });
  } catch (err) {
    console.error('Failed to update template metrics:', err);
  }
}

/**
 * Clear template cache (useful after admin updates templates)
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Get subject-specific quiz template name
 */
export function getQuizTemplateName(subjectName: string): string {
  const normalizedSubject = subjectName.toLowerCase().replace(/\s+/g, '_');
  
  const subjectTemplateMap: Record<string, string> = {
    'mathematics': 'quiz_generation_mathematics',
    'life_sciences': 'quiz_generation_life_sciences',
    'english': 'quiz_generation_english',
    'english_home_language': 'quiz_generation_english',
    'english_first_additional_language': 'quiz_generation_english',
    'physical_sciences': 'quiz_generation_physical_sciences',
    'physics': 'quiz_generation_physical_sciences',
    'chemistry': 'quiz_generation_physical_sciences',
  };

  return subjectTemplateMap[normalizedSubject] || 'quiz_generation_mathematics';
}

/**
 * Get all available templates for admin interface
 */
export async function getAllTemplates(): Promise<PromptTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('ai_prompt_templates')
      .select('*')
      .order('template_name')
      .order('template_version', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    return (data || []) as unknown as PromptTemplate[];
  } catch (err) {
    console.error('Failed to fetch all templates:', err);
    return [];
  }
}
