import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PredictionResult {
  predictedScore: number;
  confidenceLower: number;
  confidenceUpper: number;
  factors: Record<string, number>;
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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

    const { action, quiz_id, subject_name } = await req.json();
    const userId = user.id;

    let result;

    switch (action) {
      case 'predict_quiz_score':
        result = await predictQuizScore(supabase, userId, quiz_id, subject_name);
        break;
      case 'calculate_dropout_risk':
        result = await calculateDropoutRisk(supabase, userId);
        break;
      case 'analyze_trends':
        result = await analyzePerformanceTrends(supabase, userId);
        break;
      case 'calculate_benchmarks':
        result = await calculatePeerBenchmarks(supabase, userId);
        break;
      case 'full_analysis':
        const [prediction, risk, trends, benchmarks] = await Promise.all([
          subject_name ? predictQuizScore(supabase, userId, quiz_id, subject_name) : null,
          calculateDropoutRisk(supabase, userId),
          analyzePerformanceTrends(supabase, userId),
          calculatePeerBenchmarks(supabase, userId)
        ]);
        result = { prediction, risk, trends, benchmarks };
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Prediction error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function predictQuizScore(
  supabase: any,
  userId: string,
  quizId: string | null,
  subjectName: string
): Promise<PredictionResult> {
  // Fetch historical quiz data
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes(difficulty_level, chapter_id)')
    .eq('user_id', userId)
    .eq('subject_name', subjectName)
    .eq('is_completed', true)
    .order('completed_at', { ascending: false })
    .limit(20);

  const { data: progress } = await supabase
    .from('user_chapter_progress')
    .select('time_spent_minutes')
    .eq('user_id', userId);

  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('subject_name', subjectName)
    .maybeSingle();

  // Feature extraction
  const pastScores = attempts?.map((a: any) => a.score_percentage || 0) || [];
  const avgScore = pastScores.length > 0 ? pastScores.reduce((a: number, b: number) => a + b, 0) / pastScores.length : 50;
  const recentAvg = pastScores.slice(0, 5).length > 0 
    ? pastScores.slice(0, 5).reduce((a: number, b: number) => a + b, 0) / pastScores.slice(0, 5).length 
    : avgScore;
  
  const totalStudyTime = progress?.reduce((sum: number, p: any) => sum + (p.time_spent_minutes || 0), 0) || 0;
  const attemptCount = pastScores.length;
  const progressPercent = userProgress?.progress_percentage || 0;

  // Simple linear regression model weights (would be trained on actual data)
  const weights = {
    recentAvg: 0.4,
    avgScore: 0.25,
    studyTime: 0.15,
    progress: 0.1,
    attempts: 0.1
  };

  // Normalize features
  const normalizedStudyTime = Math.min(totalStudyTime / 600, 1) * 100;
  const normalizedAttempts = Math.min(attemptCount / 10, 1) * 100;

  // Predict score
  let predictedScore = 
    weights.recentAvg * recentAvg +
    weights.avgScore * avgScore +
    weights.studyTime * normalizedStudyTime +
    weights.progress * progressPercent +
    weights.attempts * normalizedAttempts;

  // Apply bounds
  predictedScore = Math.max(20, Math.min(100, predictedScore));

  // Calculate confidence interval based on variance
  const variance = pastScores.length > 1 
    ? pastScores.reduce((sum: number, s: number) => sum + Math.pow(s - avgScore, 2), 0) / pastScores.length 
    : 100;
  const stdDev = Math.sqrt(variance);
  const confidenceMargin = Math.max(5, stdDev * 1.5);

  const result: PredictionResult = {
    predictedScore: Math.round(predictedScore),
    confidenceLower: Math.max(0, Math.round(predictedScore - confidenceMargin)),
    confidenceUpper: Math.min(100, Math.round(predictedScore + confidenceMargin)),
    factors: {
      recentAvg,
      avgScore,
      totalStudyTime,
      attemptCount,
      progressPercent
    }
  };

  // Store prediction
  await supabase.from('performance_predictions').insert({
    user_id: userId,
    prediction_type: 'quiz_score',
    subject_name: subjectName,
    quiz_id: quizId,
    predicted_value: result.predictedScore,
    confidence_lower: result.confidenceLower,
    confidence_upper: result.confidenceUpper,
    features_used: result.factors
  });

  return result;
}

async function calculateDropoutRisk(supabase: any, userId: string) {
  // Fetch user activity data
  const { data: user } = await supabase
    .from('users')
    .select('last_study_date, study_streak_days, total_study_hours, created_at')
    .eq('id', userId)
    .single();

  const { data: recentActivity } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  const { data: quizAttempts } = await supabase
    .from('quiz_attempts')
    .select('score_percentage, completed_at')
    .eq('user_id', userId)
    .eq('is_completed', true)
    .order('completed_at', { ascending: false })
    .limit(10);

  const { data: groupMemberships } = await supabase
    .from('group_members')
    .select('*')
    .eq('user_id', userId);

  const { data: forumPosts } = await supabase
    .from('forum_posts')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Calculate risk factors
  const now = new Date();
  const lastStudy = user?.last_study_date ? new Date(user.last_study_date) : new Date(user?.created_at || now);
  const daysSinceStudy = Math.floor((now.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24));

  // Login frequency score (higher = more risk)
  const recentLogins = recentActivity?.filter((a: any) => a.activity_type === 'login').length || 0;
  const loginFrequencyScore = Math.min(100, Math.max(0, (30 - recentLogins) * 3.33));

  // Study gap score
  const studyGapScore = Math.min(100, daysSinceStudy * 7);

  // Progress stagnation score
  const progressActivities = recentActivity?.filter((a: any) => 
    ['chapter_completed', 'quiz_completed'].includes(a.activity_type)
  ).length || 0;
  const progressStagnationScore = Math.min(100, Math.max(0, (10 - progressActivities) * 10));

  // Performance decline score
  const scores = quizAttempts?.map((a: any) => a.score_percentage || 0) || [];
  let performanceDeclineScore = 0;
  if (scores.length >= 4) {
    const recentAvg = scores.slice(0, 2).reduce((a: number, b: number) => a + b, 0) / 2;
    const olderAvg = scores.slice(2, 4).reduce((a: number, b: number) => a + b, 0) / 2;
    performanceDeclineScore = Math.max(0, Math.min(100, (olderAvg - recentAvg) * 2));
  }

  // Social isolation score
  const socialActivities = (groupMemberships?.length || 0) + (forumPosts?.length || 0);
  const socialIsolationScore = Math.min(100, Math.max(0, (5 - socialActivities) * 20));

  // Calculate composite risk score (weighted average)
  const riskScore = 
    loginFrequencyScore * 0.25 +
    studyGapScore * 0.25 +
    progressStagnationScore * 0.2 +
    performanceDeclineScore * 0.15 +
    socialIsolationScore * 0.15;

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (riskScore <= 30) riskLevel = 'low';
  else if (riskScore <= 50) riskLevel = 'medium';
  else if (riskScore <= 70) riskLevel = 'high';
  else riskLevel = 'critical';

  // Identify risk factors
  const riskFactors = [];
  if (daysSinceStudy > 5) riskFactors.push(`No study activity in ${daysSinceStudy} days`);
  if (loginFrequencyScore > 50) riskFactors.push('Declining login frequency');
  if (progressStagnationScore > 50) riskFactors.push('Progress has stalled');
  if (performanceDeclineScore > 30) riskFactors.push('Quiz scores declining');
  if (socialIsolationScore > 50) riskFactors.push('Limited community engagement');

  const result = {
    riskScore: Math.round(riskScore),
    riskLevel,
    riskFactors,
    scores: {
      loginFrequency: Math.round(loginFrequencyScore),
      studyGap: Math.round(studyGapScore),
      progressStagnation: Math.round(progressStagnationScore),
      performanceDecline: Math.round(performanceDeclineScore),
      socialIsolation: Math.round(socialIsolationScore)
    },
    daysSinceStudy,
    interventionNeeded: riskLevel === 'high' || riskLevel === 'critical'
  };

  // Store/update risk score
  await supabase.from('dropout_risk_scores').upsert({
    user_id: userId,
    risk_score: result.riskScore,
    risk_level: riskLevel,
    login_frequency_score: loginFrequencyScore,
    study_gap_score: studyGapScore,
    progress_stagnation_score: progressStagnationScore,
    performance_decline_score: performanceDeclineScore,
    social_isolation_score: socialIsolationScore,
    last_login_days: recentLogins > 0 ? 0 : daysSinceStudy,
    days_since_study: daysSinceStudy,
    risk_factors: riskFactors,
    intervention_needed: result.interventionNeeded,
    calculated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  return result;
}

async function analyzePerformanceTrends(supabase: any, userId: string) {
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('subject_name, score_percentage, completed_at')
    .eq('user_id', userId)
    .eq('is_completed', true)
    .order('completed_at', { ascending: true });

  if (!attempts || attempts.length === 0) {
    return { trends: [], message: 'Not enough data for trend analysis' };
  }

  // Group by subject
  const subjectData: Record<string, { scores: number[], dates: Date[] }> = {};
  attempts.forEach((a: any) => {
    if (!subjectData[a.subject_name]) {
      subjectData[a.subject_name] = { scores: [], dates: [] };
    }
    subjectData[a.subject_name].scores.push(a.score_percentage || 0);
    subjectData[a.subject_name].dates.push(new Date(a.completed_at));
  });

  const trends = [];

  for (const [subject, data] of Object.entries(subjectData)) {
    if (data.scores.length < 3) continue;

    // Calculate linear regression slope
    const n = data.scores.length;
    const xMean = (n - 1) / 2;
    const yMean = data.scores.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (data.scores[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }
    const slope = denominator !== 0 ? numerator / denominator : 0;

    // Determine trend type
    let trendType: 'improving' | 'plateau' | 'declining' | 'stable';
    if (slope > 2) trendType = 'improving';
    else if (slope < -2) trendType = 'declining';
    else if (Math.abs(slope) <= 0.5) trendType = 'plateau';
    else trendType = 'stable';

    // Calculate improvement rate (% per week)
    const firstDate = data.dates[0];
    const lastDate = data.dates[data.dates.length - 1];
    const weeks = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const improvementRate = (data.scores[data.scores.length - 1] - data.scores[0]) / weeks;

    // Forecast 4 weeks ahead
    const forecast4Weeks = Math.max(0, Math.min(100, yMean + slope * (n + 4)));

    // Generate insights
    const insights = [];
    if (trendType === 'improving') {
      insights.push(`Your ${subject} score is improving by ${Math.abs(improvementRate).toFixed(1)}% per week - keep up the great work!`);
    } else if (trendType === 'declining') {
      insights.push(`Your ${subject} score has declined. Consider reviewing recent chapters or joining a study group.`);
    } else if (trendType === 'plateau') {
      insights.push(`Your ${subject} progress has plateaued. Try different study methods or practice problems.`);
    }

    const trendResult = {
      subject,
      trendType,
      slope: Math.round(slope * 100) / 100,
      improvementRate: Math.round(improvementRate * 10) / 10,
      currentAvg: Math.round(yMean),
      forecast4Weeks: Math.round(forecast4Weeks),
      dataPoints: n,
      insights
    };

    trends.push(trendResult);

    // Store trend
    await supabase.from('performance_trends').upsert({
      user_id: userId,
      subject_name: subject,
      trend_type: trendType,
      slope,
      improvement_rate: improvementRate,
      forecast_4_weeks: forecast4Weeks,
      forecast_confidence: Math.max(0.5, 1 - (1 / n)),
      data_points: n,
      analysis_period_start: firstDate.toISOString().split('T')[0],
      analysis_period_end: lastDate.toISOString().split('T')[0],
      insights
    }, { onConflict: 'user_id,subject_name' });
  }

  return { trends };
}

async function calculatePeerBenchmarks(supabase: any, userId: string) {
  // Get user's grade level
  const { data: user } = await supabase
    .from('users')
    .select('grade_level')
    .eq('id', userId)
    .single();

  if (!user?.grade_level) {
    return { rankings: [], message: 'Grade level not set' };
  }

  // Get user's quiz scores by subject
  const { data: userAttempts } = await supabase
    .from('quiz_attempts')
    .select('subject_name, score_percentage')
    .eq('user_id', userId)
    .eq('is_completed', true);

  // Get peer scores for same grade
  const { data: peerAttempts } = await supabase
    .from('quiz_attempts')
    .select('user_id, subject_name, score_percentage, users!inner(grade_level)')
    .eq('is_completed', true)
    .eq('users.grade_level', user.grade_level);

  // Calculate peer benchmarks by subject
  const subjectPeerScores: Record<string, number[]> = {};
  peerAttempts?.forEach((a: any) => {
    if (!subjectPeerScores[a.subject_name]) {
      subjectPeerScores[a.subject_name] = [];
    }
    subjectPeerScores[a.subject_name].push(a.score_percentage || 0);
  });

  // Calculate user averages by subject
  const userSubjectScores: Record<string, number[]> = {};
  userAttempts?.forEach((a: any) => {
    if (!userSubjectScores[a.subject_name]) {
      userSubjectScores[a.subject_name] = [];
    }
    userSubjectScores[a.subject_name].push(a.score_percentage || 0);
  });
  
  const userSubjectAvgs: Record<string, number> = {};
  Object.keys(userSubjectScores).forEach(subject => {
    const scores = userSubjectScores[subject];
    userSubjectAvgs[subject] = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
  });

  const rankings = [];

  for (const [subject, peerScores] of Object.entries(subjectPeerScores)) {
    if (peerScores.length < 5) continue;

    const sorted = [...peerScores].sort((a, b) => a - b);
    const userAvg = userSubjectAvgs[subject] || 0;

    // Calculate percentiles
    const percentile = (p: number) => sorted[Math.floor(sorted.length * p / 100)] || 0;
    const p10 = percentile(10);
    const p25 = percentile(25);
    const p50 = percentile(50);
    const p75 = percentile(75);
    const p90 = percentile(90);

    // Calculate user's percentile rank
    const belowUser = sorted.filter(s => s < userAvg).length;
    const userPercentile = Math.round((belowUser / sorted.length) * 100);

    // Generate comparison text
    let peerComparison = '';
    if (userPercentile >= 90) peerComparison = 'Outstanding! Top 10% of your grade';
    else if (userPercentile >= 75) peerComparison = 'Excellent! Top 25% of your grade';
    else if (userPercentile >= 50) peerComparison = 'Above average for your grade';
    else if (userPercentile >= 25) peerComparison = 'Below median - room for improvement';
    else peerComparison = 'Focus area - consider extra practice';

    const gapToMedian = Math.round(userAvg - p50);

    rankings.push({
      subject,
      userValue: Math.round(userAvg),
      percentileRank: userPercentile,
      peerComparison,
      gapToMedian,
      benchmarks: { p10, p25, p50, p75, p90 },
      sampleSize: peerScores.length
    });

    // Store benchmark and ranking
    await supabase.from('peer_benchmarks').upsert({
      grade_level: user.grade_level,
      subject_name: subject,
      metric_type: 'quiz_score',
      percentile_10: p10,
      percentile_25: p25,
      percentile_50: p50,
      percentile_75: p75,
      percentile_90: p90,
      mean_value: peerScores.reduce((a, b) => a + b, 0) / peerScores.length,
      sample_size: peerScores.length,
      calculated_at: new Date().toISOString()
    }, { onConflict: 'grade_level,subject_name,metric_type' });

    await supabase.from('user_percentile_rankings').upsert({
      user_id: userId,
      subject_name: subject,
      metric_type: 'quiz_score',
      user_value: userAvg,
      percentile_rank: userPercentile,
      peer_comparison: peerComparison,
      gap_to_median: gapToMedian,
      calculated_at: new Date().toISOString()
    }, { onConflict: 'user_id,subject_name,metric_type' });
  }

  return { rankings };
}
