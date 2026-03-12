// Shared OpenRouter configuration
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function getOpenRouterHeaders(): Record<string, string> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://edufutura.app',
    'X-Title': 'EduFutura',
  };
}

// Map old model names to OpenRouter model identifiers
export function mapModel(oldModel: string): string {
  const modelMap: Record<string, string> = {
    'gpt-4-turbo-preview': 'openai/gpt-4-turbo-preview',
    'gpt-4o-mini': 'openai/gpt-4o-mini',
    'gpt-4o': 'openai/gpt-4o',
    'gpt-4': 'openai/gpt-4',
    'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
  };
  return modelMap[oldModel] || `openai/${oldModel}`;
}
