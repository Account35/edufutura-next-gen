import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Bookmark, 
  Clock, 
  BookOpen, 
  Trash2, 
  Eye, 
  Search,
  Filter,
  Download,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DifficultyBadge } from '@/components/curriculum/DifficultyBadge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BookmarkWithChapter {
  id: string;
  created_at: string;
  notes: string | null;
  chapter_id: string;
  chapters: {
    id: string;
    chapter_number: number;
    chapter_title: string;
    chapter_description: string;
    difficulty_level: string;
    estimated_duration_minutes: number;
    thumbnail_url: string | null;
    subjects: {
      subject_name: string;
      icon_name: string;
      color_scheme: string;
    };
  };
}

export default function Bookmarks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<BookmarkWithChapter[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<BookmarkWithChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [editingBookmark, setEditingBookmark] = useState<BookmarkWithChapter | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookmarks();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortBookmarks();
  }, [bookmarks, searchQuery, selectedSubject, selectedDifficulty, sortBy]);

  const fetchBookmarks = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          *,
          chapters:chapter_id (
            *,
            subjects:subject_id (
              subject_name,
              icon_name,
              color_scheme
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookmarks(data as BookmarkWithChapter[]);
    } catch (error: any) {
      toast.error('Failed to load bookmarks');
      console.error('Error fetching bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortBookmarks = () => {
    let filtered = [...bookmarks];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(bookmark =>
        bookmark.chapters.chapter_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Subject filter
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(bookmark =>
        bookmark.chapters.subjects.subject_name === selectedSubject
      );
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(bookmark =>
        bookmark.chapters.difficulty_level === selectedDifficulty
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'chapter':
          return a.chapters.chapter_number - b.chapters.chapter_number;
        case 'alphabetical':
          return a.chapters.chapter_title.localeCompare(b.chapters.chapter_title);
        default:
          return 0;
      }
    });

    setFilteredBookmarks(filtered);
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw error;

      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
      toast.success('Bookmark removed');
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error('Failed to remove bookmark');
    }
  };

  const handleRemoveAll = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setBookmarks([]);
      toast.success('All bookmarks removed');
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error('Failed to remove bookmarks');
    }
  };

  const handleSaveNotes = async () => {
    if (!editingBookmark) return;

    try {
      const { error } = await supabase
        .from('bookmarks')
        .update({ notes: editNotes })
        .eq('id', editingBookmark.id);

      if (error) throw error;

      setBookmarks(prev =>
        prev.map(b => (b.id === editingBookmark.id ? { ...b, notes: editNotes } : b))
      );
      toast.success('Notes saved');
      setEditingBookmark(null);
    } catch (error: any) {
      toast.error('Failed to save notes');
    }
  };

  const handleExportBookmarks = () => {
    const exportData = bookmarks.map(b => ({
      chapter: b.chapters.chapter_title,
      subject: b.chapters.subjects.subject_name,
      notes: b.notes || '',
      bookmarked: new Date(b.created_at).toLocaleDateString(),
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Bookmarks exported');
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const bookmarked = new Date(date);
    const diffMs = now.getTime() - bookmarked.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return bookmarked.toLocaleDateString();
  };

  const uniqueSubjects = Array.from(new Set(bookmarks.map(b => b.chapters.subjects.subject_name)));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading bookmarks...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">My Bookmarks</h1>
            <p className="text-muted-foreground mt-1">
              {bookmarks.length} {bookmarks.length === 1 ? 'chapter' : 'chapters'} bookmarked
            </p>
          </div>
          {bookmarks.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportBookmarks}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirm('all')}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove All
              </Button>
            </div>
          )}
        </div>

        {bookmarks.length === 0 ? (
          // Empty State
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Bookmark className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No bookmarks yet
              </h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Bookmark chapters you want to revisit later by clicking the bookmark icon on
                chapter pages
              </p>
              <Button onClick={() => navigate('/subjects')}>
                <BookOpen className="h-4 w-4 mr-2" />
                Browse Subjects
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters and Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {uniqueSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="chapter">Chapter Order</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bookmarks Grid */}
            {filteredBookmarks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-muted-foreground">No bookmarks match your filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBookmarks.map(bookmark => (
                  <Card
                    key={bookmark.id}
                    className="group hover:shadow-lg transition-shadow duration-200"
                  >
                    <CardContent className="p-0">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 rounded-t-lg overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-primary/30" />
                        </div>
                        <div className="absolute top-2 right-2 flex gap-2">
                          <DifficultyBadge level={bookmark.chapters.difficulty_level as 'Beginner' | 'Intermediate' | 'Advanced'} />
                          <Bookmark className="h-5 w-5 text-secondary fill-secondary" />
                        </div>
                        <div className="absolute bottom-2 left-2">
                          <Badge variant="secondary" className="text-xs">
                            Chapter {bookmark.chapters.chapter_number}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
                            {bookmark.chapters.chapter_title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {bookmark.chapters.subjects.subject_name}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {bookmark.chapters.estimated_duration_minutes} min
                          </div>
                          <div>Bookmarked {getRelativeTime(bookmark.created_at)}</div>
                        </div>

                        {bookmark.notes && (
                          <div className="bg-muted/50 rounded p-2">
                            <p className="text-xs italic text-muted-foreground line-clamp-3">
                              {bookmark.notes}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() =>
                              navigate(
                                `/curriculum/${bookmark.chapters.subjects.subject_name}/${bookmark.chapters.chapter_number}`
                              )
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingBookmark(bookmark);
                              setEditNotes(bookmark.notes || '');
                            }}
                          >
                            Edit Notes
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirm(bookmark.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Notes Dialog */}
      <Dialog open={!!editingBookmark} onOpenChange={() => setEditingBookmark(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
            <DialogDescription>
              Add personal notes about why you bookmarked this chapter or key points to
              remember.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add your notes here..."
              className="min-h-[150px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {editNotes.length}/500 characters
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBookmark(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              {deleteConfirm === 'all'
                ? `This will remove all ${bookmarks.length} bookmarks. This action cannot be undone.`
                : 'Are you sure you want to remove this bookmark?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirm === 'all'
                  ? handleRemoveAll()
                  : handleRemoveBookmark(deleteConfirm)
              }
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
