import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, UserPlus, Users, HelpCircle } from 'lucide-react';

interface GetHelpCardProps {
  subjectName: string;
  chapterId: string;
  chapterTitle: string;
  isStruggling: boolean;
}

export const GetHelpCard = ({ subjectName, chapterId, chapterTitle, isStruggling }: GetHelpCardProps) => {
  const navigate = useNavigate();

  if (!isStruggling) return null;

  return (
    <Card className="mt-6 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-400">
          <HelpCircle className="h-5 w-5" />
          Need Help?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          This chapter seems challenging. Here's how we can help:
        </p>
        
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate(`/community/forums/${encodeURIComponent(subjectName)}`, {
              state: { chapterId, chapterTitle, template: 'struggling' }
            })}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Ask in Forum
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('/community/study-buddies')}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Find Study Buddy
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('/community/groups')}
          >
            <Users className="h-4 w-4 mr-2" />
            Join Study Group
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
