import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function CommunityGroupQuizSession() {
  const { groupId, sessionId } = useParams<{ groupId: string; sessionId: string }>();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-secondary" />
              Group Quiz Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The group quiz session page is available, but the live quiz player is still being built.
            </p>
            <p className="text-sm text-muted-foreground">
              Group ID: {groupId} | Session ID: {sessionId}
            </p>
            <Button onClick={() => navigate('/community/groups')}>
              Back to Study Groups
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
