import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecommendationRequest {
  action: 'get_recommendations' | 'record_interaction' | 'record_feedback' | 'compute_content_features' | 'compute_similarities';
  recommendation_type?: string;
  item_id?: string;
  item_type?: string;
  interaction_type?: string;
  interaction_value?: number;
  duration_seconds?: number;
  feedback_type?: string;
  feedback_value?: number;
  position_shown?: number;
  limit?: number;
}

interface Recommendation {
  item_id: string;
  item_type: string;
  score: number;
  explanation: string;
  algorithm: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: RecommendationRequest = await req.json();
    const { action } = body;

    let result;
    switch (action) {
      case 'get_recommendations':
        result = await getRecommendations(supabase, user.id, body.recommendation_type || 'chapter', body.limit || 10);
        break;
      case 'record_interaction':
        result = await recordInteraction(supabase, user.id, body);
        break;
      case 'record_feedback':
        result = await recordFeedback(supabase, user.id, body);
        break;
      case 'compute_content_features':
        result = await computeContentFeatures(supabase);
        break;
      case 'compute_similarities':
        result = await computeSimilarities(supabase, body.item_type || 'chapter');
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Recommendation engine error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// deno-lint-ignore no-explicit-any
async function getRecommendations(supabase: any, userId: string, type: string, limit: number) {
  console.log(`Getting ${type} recommendations for user ${userId}`);

  // Check cache first
  const { data: cached } = await supabase
    .from('recommendations_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('recommendation_type', type)
    .gt('expires_at', new Date().toISOString())
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached && cached.ranked_item_ids?.length > 0) {
    console.log('Returning cached recommendations');
    return {
      recommendations: cached.ranked_item_ids.slice(0, limit).map((id: string, i: number) => ({
        item_id: id,
        item_type: type,
        score: cached.scores?.[i] || 0,
        explanation: cached.explanations?.[i] || 'Recommended for you',
        algorithm: cached.algorithm_used,
      })),
      cached: true,
    };
  }

  // Generate fresh recommendations using hybrid approach
  const recommendations = await generateHybridRecommendations(supabase, userId, type, limit);

  // Cache recommendations
  if (recommendations.length > 0) {
    await supabase.from('recommendations_cache').upsert({
      user_id: userId,
      recommendation_type: type,
      ranked_item_ids: recommendations.map((r: Recommendation) => r.item_id),
      scores: recommendations.map((r: Recommendation) => r.score),
      explanations: recommendations.map((r: Recommendation) => r.explanation),
      algorithm_used: 'hybrid',
      computed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'user_id,recommendation_type' });
  }

  return { recommendations, cached: false };
}

// deno-lint-ignore no-explicit-any
async function generateHybridRecommendations(supabase: any, userId: string, type: string, limit: number): Promise<Recommendation[]> {
  // Get user's interaction history
  const { data: interactions } = await supabase
    .from('user_item_interactions')
    .select('*')
    .eq('user_id', userId)
    .eq('item_type', type)
    .order('created_at', { ascending: false })
    .limit(50);

  // deno-lint-ignore no-explicit-any
  const interactedItems = new Set<string>((interactions || []).map((i: any) => i.item_id));
  const hasHistory = interactedItems.size > 0;

  // Get user preferences
  const { data: preferences } = await supabase
    .from('user_content_preferences')
    .select('*')
    .eq('user_id', userId);

  // Get user profile for context
  const { data: userProfile } = await supabase
    .from('users')
    .select('grade_level, subjects_studying')
    .eq('id', userId)
    .maybeSingle();

  let recommendations: Recommendation[] = [];

  if (hasHistory) {
    // Hybrid: Content-based + Collaborative
    const contentBased = await getContentBasedRecommendations(supabase, userId, type, interactedItems, preferences || [], limit);
    const collaborative = await getCollaborativeRecommendations(supabase, userId, type, interactedItems, limit);
    
    // Blend scores (60% content-based, 40% collaborative for users with history)
    const scoreMap = new Map<string, { score: number; explanation: string; algorithms: string[] }>();
    
    for (const rec of contentBased) {
      scoreMap.set(rec.item_id, {
        score: rec.score * 0.6,
        explanation: rec.explanation,
        algorithms: ['content_based'],
      });
    }
    
    for (const rec of collaborative) {
      const existing = scoreMap.get(rec.item_id);
      if (existing) {
        existing.score += rec.score * 0.4;
        existing.algorithms.push('collaborative');
        existing.explanation = `${existing.explanation}; ${rec.explanation}`;
      } else {
        scoreMap.set(rec.item_id, {
          score: rec.score * 0.4,
          explanation: rec.explanation,
          algorithms: ['collaborative'],
        });
      }
    }

    recommendations = Array.from(scoreMap.entries())
      .map(([item_id, data]) => ({
        item_id,
        item_type: type,
        score: data.score,
        explanation: data.explanation,
        algorithm: data.algorithms.join('+'),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } else {
    // Cold start: Use popularity-based recommendations
    recommendations = await getPopularityRecommendations(supabase, type, userProfile, limit);
  }

  // Apply diversity injection (ensure variety in subjects/difficulty)
  recommendations = applyDiversityFilter(recommendations);

  // Apply business rules (prerequisites, difficulty progression)
  recommendations = await applyBusinessRules(supabase, userId, recommendations, type);

  return recommendations;
}

// deno-lint-ignore no-explicit-any
async function getContentBasedRecommendations(
  supabase: any,
  _userId: string,
  type: string,
  interactedItems: Set<string>,
  // deno-lint-ignore no-explicit-any
  preferences: any[],
  limit: number
): Promise<Recommendation[]> {
  // Get content features of items user has interacted with positively
  const { data: userItemFeatures } = await supabase
    .from('content_features')
    .select('*')
    .eq('item_type', type)
    .in('item_id', Array.from(interactedItems));

  if (!userItemFeatures?.length) {
    return [];
  }

  // Compute user preference vector from interacted items
  const userVector = computeUserVector(userItemFeatures, preferences);

  // Get all available items
  const { data: allFeatures } = await supabase
    .from('content_features')
    .select('*')
    .eq('item_type', type);

  // Score items by similarity to user vector
  const recommendations: Recommendation[] = [];
  // deno-lint-ignore no-explicit-any
  for (const item of allFeatures || []) {
    if (interactedItems.has(item.item_id)) continue;

    const similarity = computeCosineSimilarity(userVector, item.feature_vector || []);
    if (similarity > 0.1) {
      recommendations.push({
        item_id: item.item_id,
        item_type: type,
        score: similarity,
        explanation: `Similar to content you've engaged with`,
        algorithm: 'content_based',
      });
    }
  }

  return recommendations.sort((a, b) => b.score - a.score).slice(0, limit * 2);
}

// deno-lint-ignore no-explicit-any
async function getCollaborativeRecommendations(
  supabase: any,
  userId: string,
  type: string,
  interactedItems: Set<string>,
  limit: number
): Promise<Recommendation[]> {
  // Find similar users based on interaction overlap
  const { data: allInteractions } = await supabase
    .from('user_item_interactions')
    .select('user_id, item_id, interaction_value')
    .eq('item_type', type)
    .neq('user_id', userId);

  if (!allInteractions?.length) {
    return [];
  }

  // Group by user
  const userItems = new Map<string, Map<string, number>>();
  // deno-lint-ignore no-explicit-any
  for (const interaction of allInteractions) {
    if (!userItems.has(interaction.user_id)) {
      userItems.set(interaction.user_id, new Map());
    }
    userItems.get(interaction.user_id)!.set(interaction.item_id, interaction.interaction_value || 1);
  }

  // Calculate similarity with each user
  const userSimilarities: { userId: string; similarity: number }[] = [];
  for (const [otherUserId, otherItems] of userItems) {
    const overlap = Array.from(interactedItems).filter(id => otherItems.has(id)).length;
    const union = new Set([...interactedItems, ...otherItems.keys()]).size;
    const similarity = union > 0 ? overlap / union : 0; // Jaccard similarity
    
    if (similarity > 0.1) {
      userSimilarities.push({ userId: otherUserId, similarity });
    }
  }

  // Sort by similarity and take top 20
  userSimilarities.sort((a, b) => b.similarity - a.similarity);
  const topUsers = userSimilarities.slice(0, 20);

  // Aggregate item scores from similar users
  const itemScores = new Map<string, { score: number; count: number }>();
  for (const { userId: similarUserId, similarity } of topUsers) {
    const items = userItems.get(similarUserId)!;
    for (const [itemId, value] of items) {
      if (interactedItems.has(itemId)) continue;
      
      const existing = itemScores.get(itemId) || { score: 0, count: 0 };
      existing.score += similarity * value;
      existing.count++;
      itemScores.set(itemId, existing);
    }
  }

  return Array.from(itemScores.entries())
    .map(([item_id, { score, count }]) => ({
      item_id,
      item_type: type,
      score: score / Math.max(count, 1),
      explanation: `Recommended by students with similar interests`,
      algorithm: 'collaborative',
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit * 2);
}

// deno-lint-ignore no-explicit-any
async function getPopularityRecommendations(
  supabase: any,
  type: string,
  // deno-lint-ignore no-explicit-any
  userProfile: any,
  limit: number
): Promise<Recommendation[]> {
  // Get most popular items for user's grade/subjects
  const { data: interactions } = await supabase
    .from('user_item_interactions')
    .select('item_id, interaction_type')
    .eq('item_type', type);

  // Count interactions per item
  const itemCounts = new Map<string, number>();
  // deno-lint-ignore no-explicit-any
  for (const interaction of interactions || []) {
    const count = itemCounts.get(interaction.item_id) || 0;
    itemCounts.set(interaction.item_id, count + 1);
  }

  // Get item details and filter by user context
  const { data: chapters } = await supabase
    .from('curriculum_chapters')
    .select('id, subject_id, chapter_title, difficulty_level')
    .eq('is_published', true);

  const { data: subjects } = await supabase
    .from('curriculum_subjects')
    .select('id, subject_name, grade_level')
    .eq('is_published', true);

  // deno-lint-ignore no-explicit-any
  const subjectMap = new Map<string, any>((subjects || []).map((s: any) => [s.id, s]));
  const userSubjects = new Set(userProfile?.subjects_studying || []);
  const userGrade = userProfile?.grade_level || 10;

  return (chapters || [])
    // deno-lint-ignore no-explicit-any
    .filter((chapter: any) => {
      const subject = subjectMap.get(chapter.subject_id);
      if (!subject) return false;
      return subject.grade_level === userGrade || userSubjects.has(subject.subject_name);
    })
    // deno-lint-ignore no-explicit-any
    .map((chapter: any) => ({
      item_id: chapter.id,
      item_type: type,
      score: (itemCounts.get(chapter.id) || 0) / 100 + Math.random() * 0.1,
      explanation: `Popular with Grade ${userGrade} students`,
      algorithm: 'popularity',
    }))
    .sort((a: Recommendation, b: Recommendation) => b.score - a.score)
    .slice(0, limit);
}

// deno-lint-ignore no-explicit-any
function computeUserVector(userItemFeatures: any[], preferences: any[]): number[] {
  if (!userItemFeatures?.length) return [];
  
  const vectorLength = userItemFeatures[0]?.feature_vector?.length || 0;
  if (vectorLength === 0) return [];
  
  const avgVector = new Array(vectorLength).fill(0);
  for (const item of userItemFeatures) {
    const vec = item.feature_vector || [];
    for (let i = 0; i < vectorLength; i++) {
      avgVector[i] += (vec[i] || 0) / userItemFeatures.length;
    }
  }

  for (const pref of preferences || []) {
    if (pref.preference_type === 'difficulty' && pref.weight > 1) {
      avgVector[0] = (avgVector[0] || 0) * pref.weight;
    }
  }

  return avgVector;
}

function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA?.length || !vecB?.length || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function applyDiversityFilter(recommendations: Recommendation[]): Recommendation[] {
  const bySubject = new Map<string, Recommendation[]>();
  for (const rec of recommendations) {
    const subject = rec.explanation.match(/Subject: (\w+)/)?.[1] || 'unknown';
    if (!bySubject.has(subject)) bySubject.set(subject, []);
    bySubject.get(subject)!.push(rec);
  }

  const diverse: Recommendation[] = [];
  const maxPerSubject = 3;
  
  while (diverse.length < recommendations.length) {
    let added = false;
    for (const [, items] of bySubject) {
      const subjectCount = diverse.filter(d => items.includes(d)).length;
      if (subjectCount < maxPerSubject && items.length > subjectCount) {
        diverse.push(items[subjectCount]);
        added = true;
      }
    }
    if (!added) break;
  }

  return diverse.length > 0 ? diverse : recommendations;
}

// deno-lint-ignore no-explicit-any
async function applyBusinessRules(
  supabase: any,
  userId: string,
  recommendations: Recommendation[],
  type: string
): Promise<Recommendation[]> {
  if (type !== 'chapter') return recommendations;

  const { data: progress } = await supabase
    .from('user_chapter_progress')
    .select('chapter_id, status')
    .eq('user_id', userId)
    .eq('status', 'completed');

  // deno-lint-ignore no-explicit-any
  const completedChapters = new Set((progress || []).map((p: any) => p.chapter_id));

  const { data: prerequisites } = await supabase
    .from('chapter_prerequisites')
    .select('chapter_id, prerequisite_chapter_id, is_required');

  const prereqMap = new Map<string, string[]>();
  // deno-lint-ignore no-explicit-any
  for (const prereq of prerequisites || []) {
    if (!prereqMap.has(prereq.chapter_id)) prereqMap.set(prereq.chapter_id, []);
    if (prereq.is_required) {
      prereqMap.get(prereq.chapter_id)!.push(prereq.prerequisite_chapter_id);
    }
  }

  return recommendations.filter(rec => {
    const prereqs = prereqMap.get(rec.item_id) || [];
    return prereqs.every(prereqId => completedChapters.has(prereqId));
  });
}

// deno-lint-ignore no-explicit-any
async function recordInteraction(supabase: any, userId: string, body: RecommendationRequest) {
  const { item_id, item_type, interaction_type, interaction_value, duration_seconds } = body;

  if (!item_id || !item_type || !interaction_type) {
    throw new Error('Missing required fields');
  }

  await supabase.from('user_item_interactions').upsert({
    user_id: userId,
    item_id,
    item_type,
    interaction_type,
    interaction_value: interaction_value || 1,
    duration_seconds,
    created_at: new Date().toISOString(),
  }, { onConflict: 'user_id,item_id,item_type,interaction_type' });

  await updateUserPreferences(supabase, userId, item_id, item_type, interaction_type, interaction_value);

  await supabase
    .from('recommendations_cache')
    .delete()
    .eq('user_id', userId)
    .eq('recommendation_type', item_type);

  return { success: true };
}

// deno-lint-ignore no-explicit-any
async function updateUserPreferences(
  supabase: any,
  userId: string,
  itemId: string,
  itemType: string,
  interactionType: string,
  value?: number
) {
  const { data: features } = await supabase
    .from('content_features')
    .select('subject_name, difficulty_score, key_concepts')
    .eq('item_id', itemId)
    .eq('item_type', itemType)
    .maybeSingle();

  if (!features) return;

  const weightDelta = interactionType === 'complete' ? 0.2 : 
                      interactionType === 'rate' ? (value || 3) / 5 * 0.3 :
                      interactionType === 'dismiss' ? -0.1 : 0.1;

  if (features.subject_name) {
    await supabase.from('user_content_preferences').upsert({
      user_id: userId,
      preference_type: 'subject',
      preference_value: features.subject_name,
      weight: 1 + weightDelta,
      interaction_count: 1,
      last_updated: new Date().toISOString(),
    }, { 
      onConflict: 'user_id,preference_type,preference_value',
      ignoreDuplicates: false,
    });
  }

  if (features.difficulty_score !== null) {
    const difficultyBucket = features.difficulty_score < 0.33 ? 'easy' :
                             features.difficulty_score < 0.66 ? 'medium' : 'hard';
    await supabase.from('user_content_preferences').upsert({
      user_id: userId,
      preference_type: 'difficulty',
      preference_value: difficultyBucket,
      weight: 1 + weightDelta,
      interaction_count: 1,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'user_id,preference_type,preference_value' });
  }
}

// deno-lint-ignore no-explicit-any
async function recordFeedback(supabase: any, userId: string, body: RecommendationRequest) {
  const { item_id, item_type, feedback_type, feedback_value, position_shown } = body;

  if (!item_id || !item_type || !feedback_type) {
    throw new Error('Missing required fields');
  }

  await supabase.from('recommendation_feedback').insert({
    user_id: userId,
    item_id,
    item_type,
    feedback_type,
    feedback_value,
    position_shown,
    created_at: new Date().toISOString(),
  });

  if (feedback_type === 'dismiss') {
    await recordInteraction(supabase, userId, {
      action: 'record_interaction',
      item_id,
      item_type,
      interaction_type: 'dismiss',
      interaction_value: -1,
    });
  }

  return { success: true };
}

// deno-lint-ignore no-explicit-any
async function computeContentFeatures(supabase: any) {
  console.log('Computing content features for all chapters...');

  const { data: chapters } = await supabase
    .from('curriculum_chapters')
    .select('id, subject_id, chapter_title, chapter_description, key_concepts, difficulty_level, estimated_duration_minutes')
    .eq('is_published', true);

  const { data: subjects } = await supabase
    .from('curriculum_subjects')
    .select('id, subject_name');

  // deno-lint-ignore no-explicit-any
  const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.subject_name]));

  const features = [];
  // deno-lint-ignore no-explicit-any
  for (const chapter of chapters || []) {
    const difficultyMap: Record<string, number> = { 'beginner': 0.2, 'intermediate': 0.5, 'advanced': 0.8 };
    const difficultyScore = difficultyMap[chapter.difficulty_level || 'intermediate'] || 0.5;
    const durationNorm = Math.min((chapter.estimated_duration_minutes || 30) / 120, 1);
    const conceptCount = (chapter.key_concepts?.length || 0) / 10;

    features.push({
      item_id: chapter.id,
      item_type: 'chapter',
      feature_vector: [difficultyScore, durationNorm, conceptCount],
      feature_names: ['difficulty', 'duration', 'concept_density'],
      subject_name: subjectMap.get(chapter.subject_id) || null,
      difficulty_score: difficultyScore,
      complexity_score: (difficultyScore + conceptCount) / 2,
      key_concepts: chapter.key_concepts || [],
      computed_at: new Date().toISOString(),
    });
  }

  for (const feature of features) {
    await supabase.from('content_features').upsert(feature, {
      onConflict: 'item_id,item_type',
    });
  }

  return { computed: features.length };
}

// deno-lint-ignore no-explicit-any
async function computeSimilarities(supabase: any, itemType: string) {
  console.log(`Computing item similarities for ${itemType}...`);

  const { data: features } = await supabase
    .from('content_features')
    .select('*')
    .eq('item_type', itemType);

  if (!features?.length) return { computed: 0 };

  const similarities = [];
  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      const sim = computeCosineSimilarity(
        features[i].feature_vector || [],
        features[j].feature_vector || []
      );
      
      if (sim > 0.3) {
        similarities.push({
          item_a_id: features[i].item_id,
          item_b_id: features[j].item_id,
          item_type: itemType,
          similarity_score: sim,
          computed_at: new Date().toISOString(),
        });
      }
    }
  }

  for (const sim of similarities) {
    await supabase.from('item_similarity_scores').upsert(sim, {
      onConflict: 'item_a_id,item_b_id,item_type',
    });
  }

  return { computed: similarities.length };
}
