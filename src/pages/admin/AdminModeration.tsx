import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModerationOverview } from '@/components/admin/moderation/ModerationOverview';
import { ModerationQueue } from '@/components/admin/moderation/ModerationQueue';
import { ContentReviewModal } from '@/components/admin/moderation/ContentReviewModal';
import { ReportsQueue } from '@/components/admin/moderation/ReportsQueue';
import { ModeratorTools } from '@/components/admin/moderation/ModeratorTools';
import { useModeration, type ModerationItem } from '@/hooks/useModeration';
import { Shield } from 'lucide-react';

export default function AdminModeration() {
  const {
    loading,
    stats,
    queue,
    reports,
    fetchQueue,
    approveContent,
    removeContent,
    warnUser,
    resolveReport,
    bulkApprove,
  } = useModeration();

  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleFilterChange = (filters: { contentType?: string; severity?: string; status?: string }) => {
    fetchQueue(filters);
  };

  const handleBulkApproveHighConfidence = () => {
    const highConfidenceItems = queue.filter(
      item => (item.ai_confidence || 0) >= 0.9 && !item.reviewed
    );
    if (highConfidenceItems.length > 0) {
      bulkApprove(highConfidenceItems.map(i => i.id));
    }
  };

  return (
    <AdminLayout 
      title="Content Moderation" 
      subtitle="Review and manage community content"
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="queue">
              Moderation Queue
              {stats.pendingForumPosts + stats.pendingChatMessages + stats.pendingResources > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                  {stats.pendingForumPosts + stats.pendingChatMessages + stats.pendingResources}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports">
              User Reports
              {stats.pendingReports > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                  {stats.pendingReports}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ModerationOverview stats={stats} />
          </TabsContent>

          <TabsContent value="queue">
            <ModerationQueue 
              items={queue}
              loading={loading}
              onViewItem={setSelectedItem}
              onApprove={approveContent}
              onRemove={(item) => setSelectedItem(item)}
              onBulkApprove={bulkApprove}
              onFilterChange={handleFilterChange}
            />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsQueue 
              reports={reports}
              onResolve={resolveReport}
            />
          </TabsContent>

          <TabsContent value="tools">
            <ModeratorTools 
              onBulkApproveHighConfidence={handleBulkApproveHighConfidence}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Content Review Modal */}
      <ContentReviewModal 
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onApprove={approveContent}
        onRemove={removeContent}
        onWarn={warnUser}
      />
    </AdminLayout>
  );
}
