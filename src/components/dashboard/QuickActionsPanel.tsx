import { 
  PlayCircle, 
  Brain, 
  BookOpen, 
  MessageSquare, 
  Award, 
  Users, 
  ClipboardList,
  Compass,
  Search,
  Lock,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  isPremium: boolean;
  isComingSoon?: boolean;
  onClick: () => void;
}

interface QuickActionsPanelProps {
  isPremium: boolean;
  onContinueLearning: () => void;
  onStartQuiz: () => void;
  onBrowseCurriculum: () => void;
  onAITutor: () => void;
  onCertificates: () => void;
  onStudyGroup: () => void;
  onAssessment: () => void;
  onCareerGuidance: () => void;
  onSearch: (query: string) => void;
}

export const QuickActionsPanel = ({
  isPremium,
  onContinueLearning,
  onStartQuiz,
  onBrowseCurriculum,
  onAITutor,
  onCertificates,
  onStudyGroup,
  onAssessment,
  onCareerGuidance,
  onSearch,
}: QuickActionsPanelProps) => {
  const actions: QuickAction[] = [
    {
      id: 'continue',
      icon: PlayCircle,
      label: 'Continue Learning',
      description: 'Pick up where you left off',
      isPremium: false,
      onClick: onContinueLearning,
    },
    {
      id: 'quiz',
      icon: Brain,
      label: 'Start a Quiz',
      description: 'Test your knowledge',
      isPremium: false,
      onClick: onStartQuiz,
    },
    {
      id: 'curriculum',
      icon: BookOpen,
      label: 'Browse Curriculum',
      description: 'Explore all subjects',
      isPremium: false,
      onClick: onBrowseCurriculum,
    },
    {
      id: 'ai-tutor',
      icon: MessageSquare,
      label: 'AI Tutor',
      description: 'Get personalized help',
      isPremium: true,
      onClick: onAITutor,
    },
    {
      id: 'certificates',
      icon: Award,
      label: 'My Certificates',
      description: 'View achievements',
      isPremium: true,
      onClick: onCertificates,
    },
    {
      id: 'study-group',
      icon: Users,
      label: 'Study Group',
      description: 'Learn together',
      isPremium: true,
      onClick: onStudyGroup,
    },
    {
      id: 'assessment',
      icon: ClipboardList,
      label: 'Take Assessment',
      description: 'Formal testing',
      isPremium: true,
      onClick: onAssessment,
    },
    {
      id: 'career',
      icon: Compass,
      label: 'Career Guidance',
      description: 'Plan your future',
      isPremium: false,
      isComingSoon: true,
      onClick: onCareerGuidance,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-bold text-primary">Quick Actions</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search topics..."
          className="pl-10"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const isLocked = action.isPremium && !isPremium;
          
          return (
            <Card
              key={action.id}
              className={cn(
                'cursor-pointer hover-scale transition-all duration-200',
                isLocked && 'opacity-70 hover:opacity-100'
              )}
              onClick={action.onClick}
            >
              <CardContent className="p-4 relative">
                {isLocked && (
                  <Lock className="absolute top-2 right-2 h-3 w-3 text-secondary" />
                )}
                {action.isComingSoon && (
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 right-2 text-xs"
                  >
                    Soon
                  </Badge>
                )}
                
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    isLocked 
                      ? 'bg-secondary/20 text-secondary' 
                      : 'bg-primary/10 text-primary'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate flex items-center gap-1">
                      {action.label}
                      {action.isPremium && (
                        <Crown className="h-3 w-3 text-secondary" />
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
