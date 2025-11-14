import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { QuizAttemptData } from '@/hooks/useAnalytics';

interface ScoreTrendChartProps {
  attempts: QuizAttemptData[];
}

export const ScoreTrendChart = ({ attempts }: ScoreTrendChartProps) => {
  // Sort attempts by date and format for chart
  const chartData = [...attempts]
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
    .map((attempt, idx) => ({
      attempt: idx + 1,
      score: Math.round(attempt.score_percentage),
      date: new Date(attempt.submitted_at).toLocaleDateString(),
      quiz: attempt.quiz_title,
    }));

  // Calculate trend line
  const trendData = calculateTrendLine(chartData.map(d => d.score));

  if (attempts.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold text-foreground mb-4">Score Trend Over Time</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="attempt" 
              label={{ value: 'Attempt Number', position: 'insideBottom', offset: -5 }}
              className="text-xs"
            />
            <YAxis 
              domain={[0, 100]}
              label={{ value: 'Score %', angle: -90, position: 'insideLeft' }}
              className="text-xs"
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-foreground">{data.quiz}</p>
                      <p className="text-sm text-muted-foreground">{data.date}</p>
                      <p className="text-sm font-medium text-primary mt-1">Score: {data.score}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <ReferenceLine 
              y={75} 
              stroke="hsl(var(--primary))" 
              strokeDasharray="5 5"
              label={{ value: 'Pass (75%)', position: 'right' }}
            />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
              name="Quiz Score"
            />
            {trendData.length > 0 && (
              <Line 
                type="monotone" 
                data={trendData}
                dataKey="trend" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Trend"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {trendData.length > 0 && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {getTrendMessage(chartData.map(d => d.score))}
          </p>
        </div>
      )}
    </Card>
  );
};

function calculateTrendLine(scores: number[]): { attempt: number; trend: number }[] {
  if (scores.length < 2) return [];
  
  const n = scores.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i + 1;
    sumY += scores[i];
    sumXY += (i + 1) * scores[i];
    sumX2 += (i + 1) * (i + 1);
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return scores.map((_, i) => ({
    attempt: i + 1,
    trend: Math.round(slope * (i + 1) + intercept),
  }));
}

function getTrendMessage(scores: number[]): string {
  if (scores.length < 2) return '';
  
  const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
  const secondHalf = scores.slice(Math.ceil(scores.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const diff = secondAvg - firstAvg;
  
  if (diff > 5) {
    return `📈 Improving trend: Your scores are increasing by an average of ${Math.round(diff)}% - great progress!`;
  } else if (diff < -5) {
    return `📉 Declining trend: Your scores have decreased by ${Math.abs(Math.round(diff))}% - consider reviewing the content.`;
  } else {
    return `➡️ Stable performance: Your scores are consistent around ${Math.round(secondAvg)}%.`;
  }
}
