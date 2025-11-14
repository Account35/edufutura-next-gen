import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAdminQuizzes } from '@/hooks/useAdminQuizzes';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FullPageLoader } from '@/components/ui/loading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreVertical, Edit, Copy, Trash2, BarChart3, Eye, EyeOff } from 'lucide-react';

export default function AdminQuizzes() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const { quizzes, loading: quizzesLoading, deleteQuiz, duplicateQuiz, bulkPublish, bulkUnpublish } = useAdminQuizzes();

  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [publishedFilter, setPublishedFilter] = useState<string>('all');
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !roleLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, authLoading, roleLoading, navigate]);

  if (authLoading || roleLoading || quizzesLoading) {
    return <FullPageLoader message="Loading admin panel..." />;
  }

  if (!isAdmin) {
    return null;
  }

  // Filter quizzes
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.quiz_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.subject_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || quiz.difficulty_level === difficultyFilter;
    const matchesPublished = publishedFilter === 'all' ||
      (publishedFilter === 'published' && quiz.is_published) ||
      (publishedFilter === 'draft' && !quiz.is_published);
    return matchesSearch && matchesDifficulty && matchesPublished;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuizzes(filteredQuizzes.map(q => q.id));
    } else {
      setSelectedQuizzes([]);
    }
  };

  const handleSelectQuiz = (quizId: string, checked: boolean) => {
    if (checked) {
      setSelectedQuizzes([...selectedQuizzes, quizId]);
    } else {
      setSelectedQuizzes(selectedQuizzes.filter(id => id !== quizId));
    }
  };

  const handleBulkPublish = async () => {
    await bulkPublish(selectedQuizzes);
    setSelectedQuizzes([]);
  };

  const handleBulkUnpublish = async () => {
    await bulkUnpublish(selectedQuizzes);
    setSelectedQuizzes([]);
  };

  const handleDelete = async (quizId: string) => {
    if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      await deleteQuiz(quizId);
    }
  };

  const handleDuplicate = async (quizId: string) => {
    const newQuiz = await duplicateQuiz(quizId);
    if (newQuiz) {
      navigate(`/admin/quizzes/edit/${newQuiz.id}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Quiz Management</h1>
            <p className="text-muted-foreground">Create and manage assessment quizzes</p>
          </div>
          <Button onClick={() => navigate('/admin/quizzes/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>

            <Select value={publishedFilter} onValueChange={setPublishedFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            {selectedQuizzes.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkPublish}>
                  <Eye className="h-4 w-4 mr-2" />
                  Publish ({selectedQuizzes.length})
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkUnpublish}>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Unpublish
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Quiz Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedQuizzes.length === filteredQuizzes.length && filteredQuizzes.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuizzes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {searchTerm || difficultyFilter !== 'all' || publishedFilter !== 'all'
                      ? 'No quizzes match your filters'
                      : 'No quizzes yet. Create your first quiz to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuizzes.map((quiz) => (
                  <TableRow key={quiz.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedQuizzes.includes(quiz.id)}
                        onCheckedChange={(checked) => handleSelectQuiz(quiz.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{quiz.quiz_title}</TableCell>
                    <TableCell>{quiz.subject_name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        quiz.difficulty_level === 'Beginner' ? 'secondary' :
                        quiz.difficulty_level === 'Intermediate' ? 'default' :
                        'destructive'
                      }>
                        {quiz.difficulty_level || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>{quiz.total_questions}</TableCell>
                    <TableCell>
                      {quiz.is_published ? (
                        <Badge className="bg-green-500">Published</Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(quiz.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/quizzes/edit/${quiz.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/quizzes/${quiz.id}/stats`)}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Stats
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(quiz.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(quiz.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
