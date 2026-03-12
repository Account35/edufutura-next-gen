import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { OPENROUTER_BASE_URL, getOpenRouterHeaders, mapModel } from "../_shared/openrouter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { imageBase64, academicYear, gradeLevel } = await req.json();
    
    console.log('Analyzing report for user:', user.id, 'Year:', academicYear, 'Grade:', gradeLevel);

    const openRouterHeaders = getOpenRouterHeaders();

    const response = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: openRouterHeaders,
      body: JSON.stringify({
        model: mapModel('gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that analyzes South African school year-end reports. Extract academic data accurately and return it in JSON format.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this South African grade ${gradeLevel} year-end report for academic year ${academicYear}. Extract:
1. Pass/Fail status
2. Overall percentage (if available)
3. Individual subject grades with percentages
4. Any notable achievements or comments

Return the data in this JSON format:
{
  "passStatus": "passed" or "failed",
  "overallPercentage": number or null,
  "subjectGrades": {"SubjectName": "percentage%", ...},
  "achievements": ["achievement1", ...],
  "analysis": "brief summary"
}`
              },
              {
                type: 'image_url',
                image_url: { url: imageBase64 }
              }
            ]
          }
        ],
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', response.status, errorData);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI response:', content);

    let analysisResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = {
          passStatus: null,
          overallPercentage: null,
          subjectGrades: {},
          achievements: [],
          analysis: content
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysisResult = {
        passStatus: null,
        overallPercentage: null,
        subjectGrades: {},
        achievements: [],
        analysis: content
      };
    }

    return new Response(
      JSON.stringify({ success: true, analysis: analysisResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-report function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});