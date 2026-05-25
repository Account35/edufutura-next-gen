import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Ban, 
  Shield,
  Crown,
  Mail,
  CheckCircle,
  Upload,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserFiltersComponent, UserFilters } from '@/components/admin/UserFilters';
import { UserDetailModal } from '@/components/admin/UserDetailModal';
import { BulkUserActions } from '@/components/admin/BulkUserActions';
import { toast } from 'sonner';

const formatDateValue = (value: string | null | undefined, fallback = '-') => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : format(date, 'dd MMM yyyy');
};

const formatRelativeDateValue = (value: string | null | undefined, fallback = 'Never') => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : formatDistanceToNow(date, { addSuffix: true });
};

interface User {
  id: string;
  email: string;
  full_name: string | null;
  profile_picture_url: string | null;
  grade_level: number | null;
  account_type: string;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  created_at: string;
  last_login_at: string | null;
  phone_number: string | null;
  province: string | null;
  city: string | null;
  school_id: string | null;
  total_study_hours: number | null;
  study_streak_days: number | null;
}

const defaultFilters: UserFilters = {
  search: '',
  accountType: 'all',
  subscriptionStatus: 'all',
  gradeLevel: 'all',
  dateFrom: undefined,
  dateTo: undefined,
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>(defaultFilters);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select(
          'id,email,full_name,profile_picture_url,grade_level,account_type,subscription_status,subscription_plan,subscription_start_date,subscription_end_date,created_at,last_login_at,phone_number,province,city,school_id,total_study_hours,study_streak_days',
          { count: 'estimated' }
        )
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%`);
      }

      if (filters.accountType !== 'all') {
        query = query.eq('account_type', filters.accountType as 'free' | 'premium');
      }

      if (filters.subscriptionStatus !== 'all') {
        query = query.eq('subscription_status', filters.subscriptionStatus as 'active' | 'inactive' | 'cancelled' | 'expired');
      }

      if (filters.gradeLevel !== 'all') {
        query = query.eq('grade_level', parseInt(filters.gradeLevel));
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString());
      }

      const { data, count, error } = await query;

      if (error) throw error;
      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters, page]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setDetailModalOpen(true);
  };

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case 'premium':
        return <Badge className="bg-secondary text-secondary-foreground"><Crown className="w-3 h-3 mr-1" />Premium</Badge>;
      case 'free':
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Suspended</Badge>;
      case 'cancelled':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Cancelled</Badge>;
      case 'deleted':
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">Deleted</Badge>;
      default:
        return <Badge variant="outline">Inactive</Badge>;
    }
  };

  const allSelected = users.length > 0 && selectedUsers.length === users.length;
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < users.length;

  return (
    <AdminLayout title="User Management" subtitle="View and manage platform users">
      <div className="space-y-4">
        <UserFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          onReset={() => setFilters(defaultFilters)}
        />

        <BulkUserActions
          selectedUsers={selectedUsers}
          onClearSelection={() => setSelectedUsers([])}
          onActionComplete={fetchUsers}
        />

        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Showing {users.length} of {totalCount} users
              </p>
              <Button variant="outline" size="sm" disabled>
                <Upload className="w-4 h-4 mr-2" />
                Import Users
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) (el as any).indeterminate = someSelected;
                        }}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                      </TableRow>
                    ))
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow 
                        key={user.id}
                        className="cursor-pointer"
                        onClick={() => handleViewUser(user)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.profile_picture_url || undefined} />
                              <AvatarFallback>
                                {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.full_name || 'No name'}</p>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                {user.email}
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.grade_level ? `Grade ${user.grade_level}` : '-'}
                        </TableCell>
                        <TableCell>{getAccountTypeBadge(user.account_type)}</TableCell>
                        <TableCell>{getStatusBadge(user.subscription_status)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDateValue(user.created_at)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatRelativeDateValue(user.last_login_at)}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewUser(user)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Shield className="h-4 w-4 mr-2" />
                                Manage Roles
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Ban className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalCount > pageSize && (
              <div className="flex items-center justify-between px-4 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {Math.ceil(totalCount / pageSize)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * pageSize >= totalCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UserDetailModal
        user={selectedUser}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onUserUpdated={fetchUsers}
      />
    </AdminLayout>
  );
}
