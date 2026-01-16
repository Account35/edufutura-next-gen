import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  User,
  Shield,
  Clock,
  MessageSquare,
  Ban
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { ModerationItem } from '@/hooks/useModeration';

interface ContentReviewModalProps {
  item: ModerationItem | null;
  open: boolean;
  onClose: () => void;
  onApprove: (itemId: string) => void;
  onRemove: (item: ModerationItem, reason: string) => void;
  onWarn: (userId: string, reason: string, contentType: string, contentId: string) => void;
}

const CANNED_RESPONSES = [
  { id: 'profanity', label: 'Inappropriate language - content removed', reason: 'Your content contained inappropriate language that violates our community guidelines.' },
  { id: 'personal_info', label: 'Personal information detected', reason: 'Your content contained personal information that could compromise privacy.' },
  { id: 'academic_dishonesty', label: 'Academic dishonesty violation', reason: 'Your content was flagged for potential academic dishonesty.' },
  { id: 'harassment', label: 'Harassment or bullying', reason: 'Your content was identified as harassment or bullying towards other users.' },
  { id: 'spam', label: 'Spam or promotional content', reason: 'Your content was identified as spam or unauthorized promotional material.' },
  { id: 'off_topic', label: 'Off-topic or irrelevant', reason: 'Your content was removed as it was off-topic or not relevant to the discussion.' },
];

export const ContentReviewModal = ({
  item,
  open,
  onClose,
  onApprove,
  onRemove,
  onWarn,
}: ContentReviewModalProps) => {
  const [reason, setReason] = useState('');
  const [selectedCannedResponse, setSelectedCannedResponse] = useState('');
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  if (!item) return null;

  const handleCannedResponseSelect = (responseId: string) => {
    setSelectedCannedResponse(responseId);
    const response = CANNED_RESPONSES.find(r => r.id === responseId);
    if (response) {
      setReason(response.reason);
    }
  };

  const handleRemove = () => {
    if (!reason.trim()) {
      return;
    }
    onRemove(item, reason);
    setShowConfirmRemove(false);
    setReason('');
    onClose();
  };

  const handleApprove = () => {
    onApprove(item.id);
    onClose();
  };

  const handleWarn = () => {
    if (!reason.trim()) return;
    onWarn(item.user_id, reason, item.content_type, item.content_id);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Content Review
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Content Preview */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">{item.content_type.replace('_', ' ')}</Badge>
                <span className="text-sm text-muted-foreground">
                  {item.created_at && formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </span>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-foreground whitespace-pre-wrap">
                  {item.content_preview || 'Content preview unavailable. Click to load full content.'}
                </p>
              </div>

              {/* Highlighted Issues */}
              {item.issues_detected && item.issues_detected.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">Detected Issues:</p>
                  <div className="flex flex-wrap gap-2">
                    {item.issues_detected.map((issue, idx) => (
                      <Badge key={idx} variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {issue}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Action Section */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">Moderation Action</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Quick Response Template
                  </label>
                  <Select value={selectedCannedResponse} onValueChange={handleCannedResponseSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CANNED_RESPONSES.map((response) => (
                        <SelectItem key={response.id} value={response.id}>
                          {response.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Reason / Notes
                  </label>
                  <Textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason for action..."
                    rows={3}
                  />
                </div>

                {showConfirmRemove ? (
                  <Card className="p-4 border-red-200 bg-red-50">
                    <p className="text-sm text-red-800 mb-3">
                      Are you sure you want to remove this content? The user will be notified and warned.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowConfirmRemove(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleRemove}
                        disabled={!reason.trim()}
                      >
                        Confirm Remove
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowConfirmRemove(true)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleWarn}
                      disabled={!reason.trim()}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Warn User
                    </Button>
                    <Button variant="outline">
                      <Ban className="w-4 h-4 mr-2" />
                      Ban User
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar - AI Analysis & User Info */}
          <div className="space-y-4">
            {/* AI Analysis */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                AI Analysis
              </h3>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-medium">
                      {Math.round((item.ai_confidence || 0) * 100)}%
                    </span>
                  </div>
                  <Progress value={(item.ai_confidence || 0) * 100} />
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Suggested Action</p>
                  <Badge variant={item.moderation_decision === 'flagged' ? 'destructive' : 'secondary'}>
                    {(item.ai_confidence || 0) > 0.8 ? 'Approve' : 'Review Required'}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Author Info */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Author Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <p className="font-medium">{item.author_name}</p>
                  <p className="text-sm text-muted-foreground">Grade {item.author_grade}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Reputation</p>
                    <p className="font-medium">{item.author_reputation || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Violations</p>
                    <p className={`font-medium ${(item.author_violations || 0) > 0 ? 'text-red-600' : ''}`}>
                      {item.author_violations || 0}
                    </p>
                  </div>
                </div>

                {(item.author_violations || 0) >= 3 && (
                  <Badge variant="destructive" className="w-full justify-center">
                    Repeat Offender
                  </Badge>
                )}
              </div>
            </Card>

            {/* Guidelines Reference */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">Quick Guidelines</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• No personal information sharing</li>
                <li>• No harassment or bullying</li>
                <li>• No academic dishonesty</li>
                <li>• Keep content educational</li>
                <li>• Report threats immediately</li>
              </ul>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
