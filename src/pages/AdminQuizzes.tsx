import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAdminQuizzes } from '@/hooks/useAdminQuizzes';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FullPageLoader } from '@/components/ui/loading';
import { Progress } from '@/components/ui/progress';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Search, MoreVertical, Edit, Copy, Trash2, BarChart3, Eye, EyeOff,
  FileQuestion, Users, Target, Clock, TrendingUp
} from 'lucide-react';

interface QuizStatsDisplay {
  totalAttempts: number;
  uniqueStudents: number;
  averageScore: number;
  passRate: number;
  averageTimeMinutes: number;
}

export default function AdminQuizzes() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const { quizzes, loading: quizzesLoading, deleteQuiz, duplicateQuiz, bulkPublish, bulkUnpublish, getQuizStats } = useAdminQuizzes();

  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [publishedFilter, setPublishedFilter] = useState<string>('all');
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);
  const [statsModal, setStatsModal] = useState<{ open: boolean; quizId: string | null; stats: QuizStatsDisplay | null }>({
    open: false,
    quizId: null,
    stats: null,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Access control is handled by AdminLayout - no need for duplicate redirect logic

  if (authLoading || roleLoading || quizzesLoading) {
    return <FullPageLoader message="Loading admin panel..." />;
  }

  if (!isAdmin) {
    return null;
  }

  // Get unique subjects for filter
  const subjects = [...new Set(quizzes.map(q => q.subject_name))].sort();

  // Filter quizzes
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.quiz_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.subject_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === 'all' || quiz.subject_name === subjectFilter;
    const matchesDifficulty = difficultyFilter === 'all' || quiz.difficulty_level === difficultyFilter;
    const matchesPublished = publishedFilter === 'all' ||
      (publishedFilter === 'published' && quiz.is_published) ||
      (publishedFilter === 'draft' && !quiz.is_published);
    return matchesSearch && matchesSubject && matchesDifficulty && matchesPublished;
  });

  // Calculate overview stats
  const totalQuizzes = quizzes.length;
  const publishedQuizzes = quizzes.filter(q => q.is_published).length;
  const totalQuestions = quizzes.reduce((sum, q) => sum + q.total_questions, 0);

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

  const handleViewStats = async (quizId: string) => {
    setLoadingStats(true);
    setStatsModal({ open: true, quizId, stats: null });
    const stats = await getQuizStats(quizId);
    setStatsModal({ open: true, quizId, stats });
    setLoadingStats(false);
  };

  return (
    <AdminLayout>
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

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Quizzes</CardTitle>
              <FileQuestion className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuizzes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
              <Eye className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{publishedQuizzes}</div>
              <Progress value={(publishedQuizzes / Math.max(totalQuizzes, 1)) * 100} className="h-1 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Questions</CardTitle>
              <Target className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuestions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Subjects</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subjects.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

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
          </div>

          {selectedQuizzes.length > 0 && (
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground self-center">
                {selectedQuizzes.length} selected
              </span>
              <Button variant="outline" size="sm" onClick={handleBulkPublish}>
                <Eye className="h-4 w-4 mr-2" />
                Publish
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkUnpublish}>
                <EyeOff className="h-4 w-4 mr-2" />
                Unpublish
              </Button>
            </div>
          )}
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
                <TableHead className="text-center">Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuizzes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {searchTerm || difficultyFilter !== 'all' || publishedFilter !== 'all' || subjectFilter !== 'all'
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
                    <TableCell>
                      <div className="font-medium">{quiz.quiz_title}</div>
                      {quiz.quiz_description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{quiz.quiz_description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{quiz.subject_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        quiz.difficulty_level === 'Beginner' ? 'secondary' :
                        quiz.difficulty_level === 'Intermediate' ? 'default' :
                        'destructive'
                      }>
                        {quiz.difficulty_level || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{quiz.total_questions}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleViewStats(quiz.id)}>
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

        {/* Stats Modal */}
        <Dialog open={statsModal.open} onOpenChange={(open) => setStatsModal({ open, quizId: null, stats: null })}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Quiz Statistics</DialogTitle>
            </DialogHeader>
            {loadingStats ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : statsModal.stats ? (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Attempts</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{statsModal.stats.totalAttempts}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Unique Students</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{statsModal.stats.uniqueStudents}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Average Score</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{statsModal.stats.averageScore.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Pass Rate</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{statsModal.stats.passRate.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card className="col-span-2">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Average Time</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{Math.round(statsModal.stats.averageTimeMinutes)} min</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No statistics available for this quiz</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
