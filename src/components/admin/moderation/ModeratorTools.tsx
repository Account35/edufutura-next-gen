import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Zap, 
  Search, 
  BookOpen,
  CheckCircle,
  XCircle,
  Users,
  Clock,
  Target,
  TrendingUp
} from 'lucide-react';

interface ModeratorToolsProps {
  onBulkApproveHighConfidence: () => void;
}

interface ModeratorStats {
  name: string;
  reviewed: number;
  avgTime: number;
  accuracy: number;
}

const COMMUNITY_GUIDELINES = [
  { id: 'respect', title: 'Be Respectful', description: 'Treat all community members with respect. No harassment, bullying, or discrimination.' },
  { id: 'educational', title: 'Keep it Educational', description: 'Content should be relevant to learning and education. No off-topic discussions.' },
  { id: 'privacy', title: 'Protect Privacy', description: 'Never share personal information like phone numbers, addresses, or ID numbers.' },
  { id: 'integrity', title: 'Academic Integrity', description: 'No cheating, plagiarism, or sharing exam answers. Support honest learning.' },
  { id: 'safe', title: 'Stay Safe', description: 'Report any concerning behavior. Never agree to meet strangers offline.' },
  { id: 'constructive', title: 'Be Constructive', description: 'Provide helpful feedback. Criticism should be constructive and kind.' },
];

const MOCK_MODERATOR_STATS: ModeratorStats[] = [
  { name: 'Admin User', reviewed: 156, avgTime: 45, accuracy: 98 },
  { name: 'Moderator 1', reviewed: 124, avgTime: 52, accuracy: 95 },
  { name: 'Moderator 2', reviewed: 89, avgTime: 38, accuracy: 97 },
];

export const ModeratorTools = ({ onBulkApproveHighConfidence }: ModeratorToolsProps) => {
  const [guidelineSearch, setGuidelineSearch] = useState('');
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const filteredGuidelines = COMMUNITY_GUIDELINES.filter(g => 
    g.title.toLowerCase().includes(guidelineSearch.toLowerCase()) ||
    g.description.toLowerCase().includes(guidelineSearch.toLowerCase())
  );

  const handleBulkApprove = () => {
    onBulkApproveHighConfidence();
    setShowBulkConfirm(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Quick Actions */}
      <Card className="p-4">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-secondary" />
          Batch Operations
        </h3>
        
        <div className="space-y-3">
          <Button 
            className="w-full justify-start"
            variant="outline"
            onClick={() => setShowBulkConfirm(true)}
          >
            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
            Approve All High-Confidence Items
            <Badge variant="secondary" className="ml-auto">AI 90%+</Badge>
          </Button>

          <Button className="w-full justify-start" variant="outline">
            <XCircle className="w-4 h-4 mr-2 text-red-600" />
            Reject All Spam (Multi-Report)
          </Button>

          <Button className="w-full justify-start" variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            Process Oldest Items First
          </Button>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            Batch operations are logged and can be reviewed. Use with caution.
          </p>
        </div>
      </Card>

      {/* Guidelines Reference */}
      <Card className="p-4">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Community Guidelines
        </h3>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search guidelines..."
            value={guidelineSearch}
            onChange={(e) => setGuidelineSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {filteredGuidelines.map((guideline) => (
            <div key={guideline.id} className="p-3 border rounded-lg">
              <p className="font-medium text-sm">{guideline.title}</p>
              <p className="text-xs text-muted-foreground">{guideline.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Moderator Performance */}
      <Card className="p-4 lg:col-span-2">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-secondary" />
          Moderator Performance
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 text-sm font-medium">Moderator</th>
                <th className="text-left p-2 text-sm font-medium">Items Reviewed</th>
                <th className="text-left p-2 text-sm font-medium">Avg Time</th>
                <th className="text-left p-2 text-sm font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_MODERATOR_STATS.map((mod, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{mod.name}</span>
                      {idx === 0 && <Badge variant="secondary" className="text-xs">Top</Badge>}
                    </div>
                  </td>
                  <td className="p-2 text-sm">{mod.reviewed}</td>
                  <td className="p-2 text-sm">{mod.avgTime}s</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Progress value={mod.accuracy} className="w-16 h-2" />
                      <span className="text-sm">{mod.accuracy}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bulk Approve Confirmation */}
      <Dialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Approve High-Confidence Items</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will approve all items with AI confidence score above 90% that have no user reports.
              This action will be logged in the audit trail.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkApprove} className="bg-green-600 hover:bg-green-700">
              Approve All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
