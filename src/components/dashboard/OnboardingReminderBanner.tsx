import { UserPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface OnboardingReminderBannerProps {
  userName?: string;
}

export const OnboardingReminderBanner = ({ userName }: OnboardingReminderBannerProps) => {
  const navigate = useNavigate();

  const handleStartOnboarding = () => {
    navigate('/onboarding');
  };

  const displayName = userName || 'Student';

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 border border-border/20 rounded-lg p-4 shadow-elegant">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">
              Welcome {displayName}! Complete your profile for a personalized experience
            </p>
            <p className="text-white/90 text-sm">
              Tell us about your subjects, learning style, and goals to get tailored recommendations and study plans
            </p>
          </div>
        </div>
        <Button
          onClick={handleStartOnboarding}
          className="bg-white hover:bg-white/90 text-blue-600 shadow-lg"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Get Started
        </Button>
      </div>
    </div>
  );
};