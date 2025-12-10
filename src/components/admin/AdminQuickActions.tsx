import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { 
  FileQuestion, 
  BookOpen, 
  Shield, 
  BarChart3,
  Users,
  Download,
  Settings
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface QuickActionsProps {
  pendingReviews: number;
  hasPermission: (key: string) => boolean;
}

export const AdminQuickActions = ({ pendingReviews, hasPermission }: QuickActionsProps) => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Create Quiz',
      icon: FileQuestion,
      onClick: () => navigate('/admin/quizzes/create'),
      permission: 'curriculum.edit',
      variant: 'default' as const
    },
    {
      label: 'Add Content',
      icon: BookOpen,
      onClick: () => navigate('/admin/content'),
      permission: 'curriculum.edit',
      variant: 'outline' as const
    },
    {
      label: 'Review Content',
      icon: Shield,
      onClick: () => navigate('/admin/moderation'),
      permission: 'content.moderate',
      variant: 'outline' as const,
      badge: pendingReviews > 0 ? pendingReviews : undefined
    },
    {
      label: 'View Analytics',
      icon: BarChart3,
      onClick: () => navigate('/admin/analytics'),
      permission: 'analytics.view',
      variant: 'outline' as const
    },
    {
      label: 'Manage Users',
      icon: Users,
      onClick: () => navigate('/admin/users'),
      permission: 'users.view',
      variant: 'outline' as const
    },
    {
      label: 'Export Report',
      icon: Download,
      onClick: () => {}, // TODO: Implement export
      permission: 'analytics.view',
      variant: 'outline' as const
    }
  ];

  const availableActions = actions.filter(action => hasPermission(action.permission));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {availableActions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              onClick={action.onClick}
              className="relative"
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
              {action.badge && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {action.badge}
                </Badge>
              )}
            </Button>
          ))}
          {availableActions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No actions available for your role.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
