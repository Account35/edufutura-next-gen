import { supabase } from '@/integrations/supabase/client';

export interface AudioResult {
  audio_url: string;
  duration_seconds: number;
  character_count: number;
}

export interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
  labels?: { accent?: string; description?: string };
}

const MAX_TEXT_LENGTH = 5000;
const SOUTH_AFRICAN_VOICES = {
  female: { voice_id: '9BWtsMINqrJLrRacOk9x', name: 'Aria' },
  male: { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger' },
};

export async function textToSpeech(
  text: string,
  voiceId: string = SOUTH_AFRICAN_VOICES.female.voice_id,
  speed: number = 1.0
): Promise<AudioResult> {
  // Validate text length
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text exceeds ${MAX_TEXT_LENGTH} character limit`);
  }

  // Check if we have quota remaining
  const quotaCheck = await checkVoiceQuota();
  if (!quotaCheck.hasQuota) {
    throw new Error(`Voice quota exceeded. Resets on ${quotaCheck.resetDate}`);
  }

  try {
    // Call ElevenLabs Edge Function (needs to be created with ELEVENLABS_API_KEY)
    const { data, error } = await supabase.functions.invoke('text-to-speech', {
      body: {
        text,
        voice_id: voiceId,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed,
        },
      },
    });

    if (error) throw error;

    // Store audio in Supabase Storage
    const audioBlob = new Blob([data.audio], { type: 'audio/mpeg' });
    const messageId = crypto.randomUUID();
    const fileName = `${messageId}.mp3`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-responses')
      .upload(fileName, audioBlob, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('voice-responses')
      .getPublicUrl(uploadData.path);

    // Update quota usage
    await incrementVoiceUsage(text.length);

    return {
      audio_url: urlData.publicUrl,
      duration_seconds: data.duration || 0,
      character_count: text.length,
    };
  } catch (error) {
    console.error('Text-to-speech error:', error);
    throw error;
  }
}

export async function listAvailableVoices(): Promise<Voice[]> {
  // Return preset South African accent voices
  return [
    {
      voice_id: SOUTH_AFRICAN_VOICES.female.voice_id,
      name: 'Aria (Female)',
      labels: { accent: 'South African', description: 'Clear, professional female voice' },
    },
    {
      voice_id: SOUTH_AFRICAN_VOICES.male.voice_id,
      name: 'Roger (Male)',
      labels: { accent: 'South African', description: 'Warm, friendly male voice' },
    },
  ];
}

export async function previewVoice(voiceId: string): Promise<string> {
  const sampleText = "Hello, I'm your AI tutor. I'm here to help you learn and succeed.";
  
  try {
    const result = await textToSpeech(sampleText, voiceId);
    return result.audio_url;
  } catch (error) {
    console.error('Voice preview error:', error);
    throw error;
  }
}

async function checkVoiceQuota(): Promise<{
  hasQuota: boolean;
  remaining: number;
  resetDate?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user account type
    const { data: userData } = await supabase
      .from('users')
      .select('account_type')
      .eq('id', user.id)
      .single();

    // Premium users have higher limits
    const monthlyLimit = userData?.account_type === 'premium' ? 100000 : 10000;

    // Get current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: usage } = await (supabase as any)
      .from('voice_usage_log')
      .select('character_count')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    const totalUsed = (usage || []).reduce((sum: number, log: any) => sum + log.character_count, 0);
    const remaining = Math.max(0, monthlyLimit - totalUsed);

    // Calculate reset date (first of next month)
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);
    resetDate.setHours(0, 0, 0, 0);

    return {
      hasQuota: remaining > 0,
      remaining,
      resetDate: resetDate.toISOString(),
    };
  } catch (error) {
    console.error('Quota check error:', error);
    // Fail open
    return { hasQuota: true, remaining: 10000 };
  }
}

async function incrementVoiceUsage(characterCount: number): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from('voice_usage_log').insert({
      user_id: user.id,
      character_count: characterCount,
    });
  } catch (error) {
    console.error('Failed to log voice usage:', error);
  }
}

export function formatQuotaStatus(remaining: number, resetDate: string): string {
  const percentage = (remaining / 100000) * 100;
  
  if (percentage < 20) {
    return `⚠️ ${remaining.toLocaleString()} characters remaining`;
  }
  
  return `${remaining.toLocaleString()} characters remaining`;
}
