import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  FileText, 
  Image, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  User,
  Shield
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ModerationItem } from '@/hooks/useModeration';

interface ModerationQueueProps {
  items: ModerationItem[];
  loading: boolean;
  onViewItem: (item: ModerationItem) => void;
  onApprove: (itemId: string) => void;
  onRemove: (item: ModerationItem) => void;
  onBulkApprove: (itemIds: string[]) => void;
  onFilterChange: (filters: { contentType?: string; severity?: string; status?: string }) => void;
}

export const ModerationQueue = ({
  items,
  loading,
  onViewItem,
  onApprove,
  onRemove,
  onBulkApprove,
  onFilterChange,
}: ModerationQueueProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [contentType, setContentType] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('pending');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(items.map(i => i.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkApprove = () => {
    onBulkApprove(Array.from(selectedItems));
    setSelectedItems(new Set());
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'forum_post': return <MessageSquare className="w-4 h-4" />;
      case 'chat_message': return <FileText className="w-4 h-4" />;
      case 'resource': return <Image className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return 'bg-muted';
    if (confidence > 0.8) return 'bg-green-500';
    if (confidence > 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSeverityBadge = (issues: string[] | null) => {
    if (!issues || issues.length === 0) return null;
    const hasHighSeverity = issues.some(i => 
      i.toLowerCase().includes('threat') || 
      i.toLowerCase().includes('harassment') ||
      i.toLowerCase().includes('personal info')
    );
    if (hasHighSeverity) {
      return <Badge variant="destructive" className="text-xs">High</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Medium</Badge>;
  };

  const handleFilterChange = (type: string, value: string) => {
    if (type === 'contentType') {
      setContentType(value);
      onFilterChange({ contentType: value, severity, status });
    } else if (type === 'severity') {
      setSeverity(value);
      onFilterChange({ contentType, severity: value, status });
    } else if (type === 'status') {
      setStatus(value);
      onFilterChange({ contentType, severity, status: value });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Tabs value={contentType} onValueChange={(v) => handleFilterChange('contentType', v)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="forum_post">Posts</TabsTrigger>
            <TabsTrigger value="chat_message">Messages</TabsTrigger>
            <TabsTrigger value="resource">Resources</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={severity} onValueChange={(v) => handleFilterChange('severity', v)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => handleFilterChange('status', v)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="removed">Removed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <Card className="p-3 bg-secondary/10 border-secondary">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set())}>
                Clear
              </Button>
              <Button size="sm" onClick={handleBulkApprove} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve All
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Queue Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left">
                  <Checkbox 
                    checked={selectedItems.size === items.length && items.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="p-3 text-left text-sm font-medium">Content</th>
                <th className="p-3 text-left text-sm font-medium">Author</th>
                <th className="p-3 text-left text-sm font-medium">AI Analysis</th>
                <th className="p-3 text-left text-sm font-medium">Time</th>
                <th className="p-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Loading moderation queue...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                    <p className="font-medium">Queue Empty</p>
                    <p className="text-sm text-muted-foreground">No items pending review</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <Checkbox 
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded bg-muted">
                          {getContentTypeIcon(item.content_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {item.content_type.replace('_', ' ')}
                            </Badge>
                            {getSeverityBadge(item.issues_detected)}
                          </div>
                          <p className="text-sm text-foreground line-clamp-2">
                            {item.content_preview || 'Content preview unavailable'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{item.author_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Grade {item.author_grade}</span>
                            {(item.author_violations || 0) > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {item.author_violations} violations
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(item.ai_confidence || 0) * 100} 
                            className="w-16 h-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {Math.round((item.ai_confidence || 0) * 100)}%
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(item.issues_detected || []).slice(0, 2).map((issue, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : 'Unknown'}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => onViewItem(item)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => onApprove(item.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onRemove(item)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
