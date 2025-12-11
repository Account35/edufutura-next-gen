import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminSupport, SupportTicket } from '@/hooks/useAdminSupport';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  Inbox, 
  Clock, 
  UserCheck, 
  CheckCircle, 
  Search,
  MessageSquare,
  User,
  Tag,
  Send,
  Paperclip,
  Eye,
  ExternalLink,
  AlertTriangle,
  ChevronRight,
  FileText,
  BookOpen,
  Zap,
  Timer
} from 'lucide-react';

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const statusColors = {
  new: 'bg-purple-100 text-purple-800',
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_on_user: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const categoryIcons = {
  technical: '🔧',
  account: '👤',
  payment: '💳',
  content: '📚',
  general: '❓',
};

export default function AdminSupport() {
  const { user } = useAuth();
  const {
    tickets,
    ticketsLoading,
    stats,
    useTicketDetail,
    cannedResponses,
    sendReply,
    assignTicket,
    updateTicket,
    resolveTicket,
    isSendingReply,
  } = useAdminSupport();

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);

  const { data: ticketDetail, isLoading: detailLoading } = useTicketDetail(selectedTicketId);

  // Filter tickets
  const filteredTickets = tickets?.filter(ticket => {
    if (activeTab === 'my' && ticket.assigned_to !== user?.id) return false;
    if (activeTab === 'unassigned' && ticket.assigned_to !== null) return false;
    
    if (filterPriority !== 'all' && ticket.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
    if (filterCategory !== 'all' && ticket.category !== filterCategory) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.subject.toLowerCase().includes(query) ||
        ticket.ticket_number.toString().includes(query) ||
        ticket.user?.full_name?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handleSendReply = () => {
    if (!selectedTicketId || !replyContent.trim()) return;
    
    sendReply({
      ticketId: selectedTicketId,
      content: replyContent,
      isInternal: isInternalNote,
    });
    
    setReplyContent('');
    setIsInternalNote(false);
  };

  const handleAssignToMe = (ticketId: string) => {
    if (!user?.id) return;
    assignTicket({ ticketId, assignTo: user.id });
  };

  const handleUseCannedResponse = (content: string) => {
    setReplyContent(content);
    setShowCannedResponses(false);
  };

  const getSLAStatus = (ticket: SupportTicket) => {
    const created = new Date(ticket.created_at).getTime();
    const now = Date.now();
    const elapsed = now - created;
    
    const slaMinutes = {
      urgent: 60,
      high: 240,
      medium: 1440,
      low: 2880,
    }[ticket.priority];
    
    const slaMs = slaMinutes * 60 * 1000;
    const percentage = (elapsed / slaMs) * 100;
    
    if (!ticket.first_response_at) {
      if (percentage >= 100) return { status: 'breached', color: 'text-red-600' };
      if (percentage >= 75) return { status: 'warning', color: 'text-orange-600' };
      return { status: 'ok', color: 'text-green-600' };
    }
    
    return { status: 'responded', color: 'text-gray-400' };
  };

  return (
    <AdminLayout title="Support & Helpdesk">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Inbox className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.openCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.inProgressCount || 0}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.waitingOnUserCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Waiting</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.resolvedTodayCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Resolved Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.avgResponseTime || 0}m</p>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Timer className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.avgResolutionTime || 0}h</p>
                  <p className="text-xs text-muted-foreground">Avg Resolution</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket Queue */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle>Ticket Queue</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full md:w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <TabsList>
                      <TabsTrigger value="all">All Tickets</TabsTrigger>
                      <TabsTrigger value="my">My Tickets</TabsTrigger>
                      <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
                    </TabsList>
                    
                    <div className="flex gap-2">
                      <Select value={filterPriority} onValueChange={setFilterPriority}>
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="waiting_on_user">Waiting</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="account">Account</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="content">Content</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <TabsContent value={activeTab} className="m-0">
                    {ticketsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : filteredTickets?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Inbox className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No tickets found</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-2">
                          {filteredTickets?.map((ticket) => {
                            const sla = getSLAStatus(ticket);
                            return (
                              <div
                                key={ticket.id}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                                  selectedTicketId === ticket.id ? 'border-primary bg-primary/5' : ''
                                } ${sla.status === 'breached' ? 'border-red-300 bg-red-50' : ''}`}
                                onClick={() => setSelectedTicketId(ticket.id)}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-mono text-muted-foreground">
                                        #{ticket.ticket_number}
                                      </span>
                                      <span className="text-lg">{categoryIcons[ticket.category]}</span>
                                      <Badge className={priorityColors[ticket.priority]}>
                                        {ticket.priority}
                                      </Badge>
                                      <Badge className={statusColors[ticket.status]}>
                                        {ticket.status.replace('_', ' ')}
                                      </Badge>
                                      {sla.status !== 'responded' && (
                                        <AlertTriangle className={`w-4 h-4 ${sla.color}`} />
                                      )}
                                    </div>
                                    <h4 className="font-medium truncate">{ticket.subject}</h4>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {ticket.user?.full_name || 'Unknown'}
                                      </span>
                                      <span>Grade {ticket.user?.grade_level}</span>
                                      <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                                    </div>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Detail / Quick Actions */}
          <div>
            {selectedTicketId ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Ticket Details</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTicketId(null)}>
                      ×
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {detailLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-40 w-full" />
                    </div>
                  ) : ticketDetail ? (
                    <div className="space-y-4">
                      {/* Ticket Info */}
                      <div className="space-y-2">
                        <h3 className="font-semibold">{ticketDetail.ticket.subject}</h3>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={priorityColors[ticketDetail.ticket.priority as keyof typeof priorityColors]}>
                            {ticketDetail.ticket.priority}
                          </Badge>
                          <Badge className={statusColors[ticketDetail.ticket.status as keyof typeof statusColors]}>
                            {ticketDetail.ticket.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline">{ticketDetail.ticket.category}</Badge>
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">{ticketDetail.ticket.user?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{ticketDetail.ticket.user?.email}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span>Grade {ticketDetail.ticket.user?.grade_level}</span>
                          <Badge variant="outline" className="text-xs">
                            {ticketDetail.ticket.user?.account_type}
                          </Badge>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex flex-wrap gap-2">
                        {!ticketDetail.ticket.assigned_to && (
                          <Button 
                            size="sm" 
                            onClick={() => handleAssignToMe(ticketDetail.ticket.id)}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Assign to Me
                          </Button>
                        )}
                        {ticketDetail.ticket.status !== 'resolved' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => resolveTicket(ticketDetail.ticket.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </div>

                      {/* Messages */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Conversation</h4>
                        <ScrollArea className="h-48 border rounded-lg p-2">
                          {ticketDetail.messages?.map((msg) => (
                            <div
                              key={msg.id}
                              className={`mb-3 p-2 rounded-lg ${
                                msg.is_internal 
                                  ? 'bg-purple-50 border-l-4 border-purple-400' 
                                  : msg.sender_id === ticketDetail.ticket.user_id
                                    ? 'bg-gray-100'
                                    : 'bg-blue-50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium">
                                  {msg.sender?.full_name || 'System'}
                                  {msg.is_internal && ' (Internal)'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{msg.message_content}</p>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>

                      {/* Reply Box */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Reply</Label>
                          <div className="flex items-center gap-2">
                            <Label htmlFor="internal" className="text-xs">Internal Note</Label>
                            <Switch
                              id="internal"
                              checked={isInternalNote}
                              onCheckedChange={setIsInternalNote}
                            />
                          </div>
                        </div>
                        <Textarea
                          placeholder={isInternalNote ? "Add internal note..." : "Type your reply..."}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={3}
                          className={isInternalNote ? 'border-purple-300' : ''}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCannedResponses(true)}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Templates
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={handleSendReply}
                            disabled={!replyContent.trim() || isSendingReply}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            {isSendingReply ? 'Sending...' : 'Send'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a ticket to view details</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Knowledge Base
                    </h4>
                    <div className="text-sm text-muted-foreground">
                      Quick links to help articles coming soon
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Canned Responses Dialog */}
        <Dialog open={showCannedResponses} onOpenChange={setShowCannedResponses}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Canned Responses</DialogTitle>
              <DialogDescription>
                Select a template to insert into your reply
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-64">
              {cannedResponses?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No templates available
                </p>
              ) : (
                <div className="space-y-2">
                  {cannedResponses?.map((response) => (
                    <div
                      key={response.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => handleUseCannedResponse(response.content)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{response.title}</span>
                        <Badge variant="outline">{response.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {response.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}