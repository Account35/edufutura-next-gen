import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  ToggleLeft, 
  Beaker, 
  Crown,
  Save,
  Sparkles,
  MessageSquare,
  Award,
  Compass,
  Gamepad2,
  Mic
} from 'lucide-react';

export function FeatureFlagsSettings() {
  const [features, setFeatures] = useState({
    aiTutor: true,
    voiceMode: true,
    communityFeatures: true,
    certificates: true,
    careerGuidance: true,
    gamification: true,
  });

  const [betaFeatures, setBetaFeatures] = useState({
    betaAiGrading: false,
    betaAdaptiveLearning: false,
    betaStudyScheduler: false,
  });

  const [rolloutPercentage, setRolloutPercentage] = useState({
    betaAiGrading: 10,
    betaAdaptiveLearning: 5,
    betaStudyScheduler: 15,
  });

  const [businessRules, setBusinessRules] = useState({
    quizDailyLimit: 3,
    aiQuestionsDailyLimit: 3,
    resourceUploadLimit: 10,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Feature settings saved successfully');
    setSaving(false);
  };

  const featuresList = [
    { key: 'aiTutor', label: 'AI Study Tutor', description: 'Phase 4 AI assistant for learning help', icon: Sparkles },
    { key: 'voiceMode', label: 'Voice Mode', description: 'Text-to-speech and voice interactions', icon: Mic },
    { key: 'communityFeatures', label: 'Community Features', description: 'Phase 8 forums, groups, and study buddies', icon: MessageSquare },
    { key: 'certificates', label: 'Certificates', description: 'Phase 6 achievement certificates', icon: Award },
    { key: 'careerGuidance', label: 'Career Guidance', description: 'Phase 7 career recommendations', icon: Compass },
    { key: 'gamification', label: 'Gamification', description: 'Badges, points, and achievements', icon: Gamepad2 },
  ];

  return (
    <div className="space-y-6">
      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ToggleLeft className="w-5 h-5" />
            Feature Toggles
          </CardTitle>
          <CardDescription>Enable or disable major platform features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {featuresList.map((feature) => (
            <div key={feature.key} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="font-medium">{feature.label}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
              <Switch
                checked={features[feature.key as keyof typeof features]}
                onCheckedChange={(checked) => setFeatures({ ...features, [feature.key]: checked })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Beta Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="w-5 h-5" />
            Beta Features
            <Badge variant="secondary">Experimental</Badge>
          </CardTitle>
          <CardDescription>Roll out new features gradually to test with users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Beta AI Grading */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">AI-Assisted Grading</p>
                <p className="text-sm text-muted-foreground">
                  Experimental AI grading for short answer questions
                </p>
              </div>
              <Switch
                checked={betaFeatures.betaAiGrading}
                onCheckedChange={(checked) => setBetaFeatures({ ...betaFeatures, betaAiGrading: checked })}
              />
            </div>
            {betaFeatures.betaAiGrading && (
              <div className="ml-4 pl-4 border-l-2 border-secondary/30 space-y-2">
                <Label className="text-sm">Rollout Percentage</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[rolloutPercentage.betaAiGrading]}
                    onValueChange={([value]) => setRolloutPercentage({ ...rolloutPercentage, betaAiGrading: value })}
                    min={1}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium">{rolloutPercentage.betaAiGrading}%</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Beta Adaptive Learning */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Adaptive Learning</p>
                <p className="text-sm text-muted-foreground">
                  Personalized content recommendations based on performance
                </p>
              </div>
              <Switch
                checked={betaFeatures.betaAdaptiveLearning}
                onCheckedChange={(checked) => setBetaFeatures({ ...betaFeatures, betaAdaptiveLearning: checked })}
              />
            </div>
            {betaFeatures.betaAdaptiveLearning && (
              <div className="ml-4 pl-4 border-l-2 border-secondary/30 space-y-2">
                <Label className="text-sm">Rollout Percentage</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[rolloutPercentage.betaAdaptiveLearning]}
                    onValueChange={([value]) => setRolloutPercentage({ ...rolloutPercentage, betaAdaptiveLearning: value })}
                    min={1}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium">{rolloutPercentage.betaAdaptiveLearning}%</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Beta Study Scheduler */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">AI Study Scheduler</p>
                <p className="text-sm text-muted-foreground">
                  AI-generated personalized study schedules
                </p>
              </div>
              <Switch
                checked={betaFeatures.betaStudyScheduler}
                onCheckedChange={(checked) => setBetaFeatures({ ...betaFeatures, betaStudyScheduler: checked })}
              />
            </div>
            {betaFeatures.betaStudyScheduler && (
              <div className="ml-4 pl-4 border-l-2 border-secondary/30 space-y-2">
                <Label className="text-sm">Rollout Percentage</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[rolloutPercentage.betaStudyScheduler]}
                    onValueChange={([value]) => setRolloutPercentage({ ...rolloutPercentage, betaStudyScheduler: value })}
                    min={1}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium">{rolloutPercentage.betaStudyScheduler}%</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Business Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Business Rules
          </CardTitle>
          <CardDescription>Configure limits for free users and premium features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quiz Daily Limit (Free)</Label>
              <Input
                type="number"
                value={businessRules.quizDailyLimit}
                onChange={(e) => setBusinessRules({ ...businessRules, quizDailyLimit: parseInt(e.target.value) })}
                min={1}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Quizzes per day for free users
              </p>
            </div>
            <div className="space-y-2">
              <Label>AI Questions Daily Limit (Free)</Label>
              <Input
                type="number"
                value={businessRules.aiQuestionsDailyLimit}
                onChange={(e) => setBusinessRules({ ...businessRules, aiQuestionsDailyLimit: parseInt(e.target.value) })}
                min={1}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                AI tutor questions per day for free users
              </p>
            </div>
            <div className="space-y-2">
              <Label>Resource Upload Limit (Free)</Label>
              <Input
                type="number"
                value={businessRules.resourceUploadLimit}
                onChange={(e) => setBusinessRules({ ...businessRules, resourceUploadLimit: parseInt(e.target.value) })}
                min={1}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Resources per month for free users
              </p>
            </div>
          </div>

          <div className="bg-secondary/10 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Crown className="w-4 h-4 text-secondary" />
              Premium Features Include
            </h4>
            <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <li>✓ Unlimited quizzes</li>
              <li>✓ Unlimited AI tutor</li>
              <li>✓ Study buddy chat</li>
              <li>✓ Voice mode</li>
              <li>✓ Downloadable certificates</li>
              <li>✓ Ad-free experience</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
