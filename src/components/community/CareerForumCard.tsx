import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, TrendingUp, GraduationCap, DollarSign } from 'lucide-react';

export const CareerForumCard = () => {
  const navigate = useNavigate();

  const careerTopics = [
    { label: 'University Applications', icon: GraduationCap },
    { label: 'Bursary Opportunities', icon: DollarSign },
    { label: 'Career Choices', icon: Briefcase },
    { label: 'NSFAS', icon: TrendingUp },
  ];

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950"
      onClick={() => navigate('/community/forums/Career%20Guidance')}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl">Career & University Planning</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Plan your path to university and career success
            </p>
          </div>
          <Badge variant="secondary" className="bg-orange-500 text-white">Featured</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {careerTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <Badge key={topic.label} variant="outline" className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {topic.label}
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
