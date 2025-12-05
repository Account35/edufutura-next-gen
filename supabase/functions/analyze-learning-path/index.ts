import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerformanceTrend {
  subject: string;
  trend: 'improving' | 'plateau' | 'declining';
  avgScore: number;
  recentScores: number[];
}

interface LearningStyleProfile {
  visual: number;
  auditory: number;
  kinesthetic: number;
  readingWriting: number;
  dominant: string;
}

interface PrerequisiteGap {
  chapterId: string;
  chapterTitle: string;
  prerequisiteId: string;
  prerequisiteTitle: string;
  quizScore: number;
  severity: 'minor' | 'moderate' | 'severe';
}

interface Recommendation {
  type: 'next_chapter' | 'practice_quiz' | 'study_resource' | 'study_group' | 'remediation' | 'review';
  priority: number;
  title: string;
  description: string;
  targetId?: string;
  targetType?: string;
  subjectName?: string;
  reason: string;
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Fetch all required data in parallel
    const [
      quizAttemptsResult,
      chapterProgressResult,
      userProgressResult,
      studyPrefsResult,
      chaptersResult,
      prerequisitesResult,
      existingGoalsResult
    ] = await Promise.all([
      supabase.from('quiz_attempts').select('*').eq('user_id', userId).order('completed_at', { ascending: false }),
      supabase.from('user_chapter_progress').select('*').eq('user_id', userId),
      supabase.from('user_progress').select('*').eq('user_id', userId),
      supabase.from('study_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('curriculum_chapters').select('*, curriculum_subjects(subject_name)').eq('is_published', true),
      supabase.from('chapter_prerequisites').select('*'),
      supabase.from('learning_goals').select('*').eq('user_id', userId).eq('status', 'active')
    ]);

    const quizAttempts = quizAttemptsResult.data || [];
    const chapterProgress = chapterProgressResult.data || [];
    const userProgress = userProgressResult.data || [];
    const studyPrefs = studyPrefsResult.data;
    const chapters = chaptersResult.data || [];
    const prerequisites = prerequisitesResult.data || [];
    const existingGoals = existingGoalsResult.data || [];

    // 1. Analyze performance trends
    const performanceTrends = analyzePerformanceTrends(quizAttempts);

    // 2. Detect prerequisite gaps
    const prereqGaps = detectPrerequisiteGaps(quizAttempts, chapterProgress, chapters, prerequisites);

    // 3. Analyze learning style
    const learningStyle = analyzeLearningStyle(chapterProgress, quizAttempts, studyPrefs);

    // 4. Calculate difficulty progression
    const difficultyLevel = calculateDifficultyLevel(quizAttempts, chapterProgress);

    // 5. Generate spaced repetition schedule
    const reviewItems = await generateSpacedRepetitionSchedule(supabase, userId, quizAttempts, chapters);

    // 6. Generate personalized recommendations
    const recommendations = generateRecommendations(
      performanceTrends,
      prereqGaps,
      learningStyle,
      difficultyLevel,
      chapterProgress,
      chapters,
      userProgress,
      studyPrefs
    );

    // 7. Generate goals if needed
    const newGoals = generateGoals(existingGoals, performanceTrends, userProgress, studyPrefs);

    // Store recommendations and gaps
    await storeAnalysisResults(supabase, userId, recommendations, prereqGaps, learningStyle, newGoals);

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        performanceTrends,
        prerequisiteGaps: prereqGaps,
        learningStyle,
        difficultyLevel,
        reviewItems: reviewItems.slice(0, 10),
        recommendations: recommendations.slice(0, 10),
        newGoals
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Learning path analysis error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzePerformanceTrends(quizAttempts: any[]): PerformanceTrend[] {
  const subjectAttempts: Record<string, number[]> = {};
  
  quizAttempts.forEach(attempt => {
    if (!subjectAttempts[attempt.subject_name]) {
      subjectAttempts[attempt.subject_name] = [];
    }
    subjectAttempts[attempt.subject_name].push(attempt.score_percentage || 0);
  });

  return Object.entries(subjectAttempts).map(([subject, scores]) => {
    const recentScores = scores.slice(0, 5);
    const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    
    let trend: 'improving' | 'plateau' | 'declining' = 'plateau';
    if (recentScores.length >= 3) {
      const firstHalf = recentScores.slice(Math.floor(recentScores.length / 2));
      const secondHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg - firstAvg > 5) trend = 'improving';
      else if (firstAvg - secondAvg > 5) trend = 'declining';
    }

    return { subject, trend, avgScore, recentScores };
  });
}

function detectPrerequisiteGaps(
  quizAttempts: any[],
  chapterProgress: any[],
  chapters: any[],
  prerequisites: any[]
): PrerequisiteGap[] {
  const gaps: PrerequisiteGap[] = [];
  const completedChapters = new Set(
    chapterProgress.filter(p => p.status === 'completed').map(p => p.chapter_id)
  );

  const chapterMap = new Map(chapters.map(c => [c.id, c]));
  const prereqMap = new Map<string, string[]>();
  
  prerequisites.forEach(p => {
    if (!prereqMap.has(p.chapter_id)) {
      prereqMap.set(p.chapter_id, []);
    }
    prereqMap.get(p.chapter_id)!.push(p.prerequisite_chapter_id);
  });

  chapterProgress.forEach(progress => {
    if (progress.status === 'in_progress') {
      const prereqs = prereqMap.get(progress.chapter_id) || [];
      
      prereqs.forEach(prereqId => {
        if (!completedChapters.has(prereqId)) {
          const prereqAttempts = quizAttempts.filter(a => a.chapter_id === prereqId);
          const avgScore = prereqAttempts.length > 0
            ? prereqAttempts.reduce((sum, a) => sum + (a.score_percentage || 0), 0) / prereqAttempts.length
            : 0;

          const chapter = chapterMap.get(progress.chapter_id);
          const prereqChapter = chapterMap.get(prereqId);

          if (chapter && prereqChapter && avgScore < 60) {
            gaps.push({
              chapterId: progress.chapter_id,
              chapterTitle: chapter.chapter_title,
              prerequisiteId: prereqId,
              prerequisiteTitle: prereqChapter.chapter_title,
              quizScore: avgScore,
              severity: avgScore < 40 ? 'severe' : avgScore < 50 ? 'moderate' : 'minor'
            });
          }
        }
      });
    }
  });

  return gaps;
}

function analyzeLearningStyle(
  chapterProgress: any[],
  quizAttempts: any[],
  studyPrefs: any
): LearningStyleProfile {
  let visual = 25, auditory = 25, kinesthetic = 25, readingWriting = 25;

  if (studyPrefs?.learning_style) {
    switch (studyPrefs.learning_style) {
      case 'visual': visual += 25; break;
      case 'auditory': auditory += 25; break;
      case 'kinesthetic': kinesthetic += 25; break;
      case 'reading-writing': readingWriting += 25; break;
    }
  }

  const totalTime = chapterProgress.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0);
  if (totalTime > 300) kinesthetic += 10;
  if (totalTime < 100 && quizAttempts.length > 10) readingWriting += 10;

  const total = visual + auditory + kinesthetic + readingWriting;
  const normalized = {
    visual: (visual / total) * 100,
    auditory: (auditory / total) * 100,
    kinesthetic: (kinesthetic / total) * 100,
    readingWriting: (readingWriting / total) * 100,
  };

  const dominant = Object.entries(normalized).reduce((a, b) => a[1] > b[1] ? a : b)[0];

  return { ...normalized, dominant };
}

function calculateDifficultyLevel(quizAttempts: any[], chapterProgress: any[]): string {
  const recentAttempts = quizAttempts.slice(0, 10);
  if (recentAttempts.length === 0) return 'beginner';

  const avgScore = recentAttempts.reduce((sum, a) => sum + (a.score_percentage || 0), 0) / recentAttempts.length;
  
  if (avgScore >= 85) return 'advanced';
  if (avgScore >= 70) return 'intermediate';
  if (avgScore >= 50) return 'developing';
  return 'beginner';
}

async function generateSpacedRepetitionSchedule(
  supabase: any,
  userId: string,
  quizAttempts: any[],
  chapters: any[]
): Promise<any[]> {
  const completedChapters = new Set(quizAttempts.map(a => a.chapter_id));
  const reviewItems: any[] = [];
  const today = new Date().toISOString().split('T')[0];

  for (const chapterId of completedChapters) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) continue;

    const attempts = quizAttempts.filter(a => a.chapter_id === chapterId);
    const lastAttempt = attempts[0];
    const avgScore = attempts.reduce((sum, a) => sum + (a.score_percentage || 0), 0) / attempts.length;

    const quality = avgScore >= 90 ? 5 : avgScore >= 75 ? 4 : avgScore >= 60 ? 3 : avgScore >= 45 ? 2 : 1;
    
    const { data: existing } = await supabase
      .from('spaced_repetition_items')
      .select('*')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .maybeSingle();

    if (existing) {
      if (existing.next_review_date <= today) {
        reviewItems.push({
          ...existing,
          chapter_title: chapter.chapter_title,
          subject_name: chapter.curriculum_subjects?.subject_name
        });
      }
    } else {
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + 1);
      
      await supabase.from('spaced_repetition_items').upsert({
        user_id: userId,
        chapter_id: chapterId,
        topic_name: chapter.chapter_title,
        ease_factor: 2.5,
        interval_days: 1,
        repetition_count: 0,
        next_review_date: nextReview.toISOString().split('T')[0],
        last_quality: quality
      });

      reviewItems.push({
        chapter_id: chapterId,
        chapter_title: chapter.chapter_title,
        subject_name: chapter.curriculum_subjects?.subject_name,
        next_review_date: nextReview.toISOString().split('T')[0]
      });
    }
  }

  return reviewItems.sort((a, b) => 
    new Date(a.next_review_date).getTime() - new Date(b.next_review_date).getTime()
  );
}

function generateRecommendations(
  trends: PerformanceTrend[],
  gaps: PrerequisiteGap[],
  learningStyle: LearningStyleProfile,
  difficulty: string,
  progress: any[],
  chapters: any[],
  userProgress: any[],
  studyPrefs: any
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Remediation for prerequisite gaps
  gaps.forEach(gap => {
    recommendations.push({
      type: 'remediation',
      priority: gap.severity === 'severe' ? 100 : gap.severity === 'moderate' ? 80 : 60,
      title: `Review ${gap.prerequisiteTitle}`,
      description: `Complete prerequisites before continuing with ${gap.chapterTitle}`,
      targetId: gap.prerequisiteId,
      targetType: 'chapter',
      reason: `Your quiz score of ${gap.quizScore.toFixed(0)}% indicates gaps in foundational knowledge`
    });
  });

  // Review for declining subjects
  trends.filter(t => t.trend === 'declining').forEach(trend => {
    recommendations.push({
      type: 'review',
      priority: 90,
      title: `Review ${trend.subject}`,
      description: `Your performance in ${trend.subject} has been declining`,
      subjectName: trend.subject,
      reason: `Average score dropped to ${trend.avgScore.toFixed(0)}%`
    });
  });

  // Next chapter recommendations
  const inProgressChapters = progress.filter(p => p.status === 'in_progress');
  inProgressChapters.forEach(prog => {
    const chapter = chapters.find(c => c.id === prog.chapter_id);
    if (chapter) {
      recommendations.push({
        type: 'next_chapter',
        priority: 70,
        title: `Continue ${chapter.chapter_title}`,
        description: `You're ${prog.progress_percentage || 0}% through this chapter`,
        targetId: chapter.id,
        targetType: 'chapter',
        subjectName: chapter.curriculum_subjects?.subject_name,
        reason: 'Continue where you left off'
      });
    }
  });

  // Practice quiz suggestions
  trends.filter(t => t.avgScore < 75).forEach(trend => {
    recommendations.push({
      type: 'practice_quiz',
      priority: 65,
      title: `Practice ${trend.subject} Quiz`,
      description: `Strengthen your understanding with practice questions`,
      subjectName: trend.subject,
      reason: `Current average: ${trend.avgScore.toFixed(0)}%`
    });
  });

  return recommendations.sort((a, b) => b.priority - a.priority);
}

function generateGoals(
  existingGoals: any[],
  trends: PerformanceTrend[],
  userProgress: any[],
  studyPrefs: any
): any[] {
  const newGoals: any[] = [];
  const existingTypes = new Set(existingGoals.map(g => g.goal_type));

  // Performance improvement goal
  if (!existingTypes.has('improvement')) {
    const weakestSubject = trends.sort((a, b) => a.avgScore - b.avgScore)[0];
    if (weakestSubject && weakestSubject.avgScore < 80) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 30);
      
      newGoals.push({
        goal_type: 'improvement',
        goal_title: `Improve ${weakestSubject.subject} by 15%`,
        goal_description: `Raise your average score from ${weakestSubject.avgScore.toFixed(0)}% to ${Math.min(100, weakestSubject.avgScore + 15).toFixed(0)}%`,
        target_value: Math.min(100, weakestSubject.avgScore + 15),
        current_value: weakestSubject.avgScore,
        subject_name: weakestSubject.subject,
        target_date: targetDate.toISOString().split('T')[0]
      });
    }
  }

  // Consistency goal
  if (!existingTypes.has('consistency')) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);
    
    newGoals.push({
      goal_type: 'consistency',
      goal_title: 'Build a 7-day study streak',
      goal_description: 'Study for at least 15 minutes every day for a week',
      target_value: 7,
      current_value: 0,
      target_date: targetDate.toISOString().split('T')[0]
    });
  }

  // Completion goal
  if (!existingTypes.has('completion') && userProgress.length > 0) {
    const lowestProgress = userProgress.sort((a, b) => 
      (a.progress_percentage || 0) - (b.progress_percentage || 0)
    )[0];
    
    if (lowestProgress && (lowestProgress.progress_percentage || 0) < 100) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 60);
      
      newGoals.push({
        goal_type: 'completion',
        goal_title: `Complete ${lowestProgress.subject_name}`,
        goal_description: `Finish all chapters in ${lowestProgress.subject_name}`,
        target_value: 100,
        current_value: lowestProgress.progress_percentage || 0,
        subject_name: lowestProgress.subject_name,
        target_date: targetDate.toISOString().split('T')[0]
      });
    }
  }

  return newGoals;
}

async function storeAnalysisResults(
  supabase: any,
  userId: string,
  recommendations: Recommendation[],
  gaps: PrerequisiteGap[],
  learningStyle: LearningStyleProfile,
  newGoals: any[]
) {
  // Clear old recommendations
  await supabase
    .from('learning_recommendations')
    .delete()
    .eq('user_id', userId)
    .eq('is_completed', false);

  // Store new recommendations
  if (recommendations.length > 0) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await supabase.from('learning_recommendations').insert(
      recommendations.slice(0, 20).map(r => ({
        user_id: userId,
        recommendation_type: r.type,
        priority_score: r.priority,
        title: r.title,
        description: r.description,
        target_id: r.targetId,
        target_type: r.targetType,
        subject_name: r.subjectName,
        reason: r.reason,
        expires_at: expiresAt.toISOString()
      }))
    );
  }

  // Store prerequisite gaps
  if (gaps.length > 0) {
    for (const gap of gaps) {
      await supabase.from('prerequisite_gaps').upsert({
        user_id: userId,
        chapter_id: gap.chapterId,
        prerequisite_chapter_id: gap.prerequisiteId,
        gap_severity: gap.severity,
        quiz_score: gap.quizScore,
        is_resolved: false
      }, { onConflict: 'user_id,chapter_id,prerequisite_chapter_id' });
    }
  }

  // Update learning style profile
  await supabase.from('learning_style_profiles').upsert({
    user_id: userId,
    visual_score: learningStyle.visual,
    auditory_score: learningStyle.auditory,
    kinesthetic_score: learningStyle.kinesthetic,
    reading_writing_score: learningStyle.readingWriting,
    dominant_style: learningStyle.dominant,
    last_analyzed_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  // Create new goals
  if (newGoals.length > 0) {
    await supabase.from('learning_goals').insert(
      newGoals.map(g => ({ ...g, user_id: userId }))
    );
  }
}
