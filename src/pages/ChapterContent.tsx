import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useCurriculumData, Chapter } from '@/hooks/useCurriculumData';
import { useProgressTracking } from '@/hooks/useProgressTracking';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useBookmark } from '@/hooks/useBookmark';
import { useAuth } from '@/hooks/useAuth';
import { ChapterHeader } from '@/components/curriculum/ChapterHeader';
import { ChapterSidebar } from '@/components/curriculum/ChapterSidebar';
import { ChapterContentRenderer } from '@/components/curriculum/ChapterContentRenderer';
import { ChapterToolbar } from '@/components/curriculum/ChapterToolbar';
import { ChapterNavigation } from '@/components/curriculum/ChapterNavigation';
import { DifficultyBadge } from '@/components/curriculum/DifficultyBadge';
import { CAPSBadge } from '@/components/curriculum/CAPSBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Clock, Target, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChapterContent() {
  const { subjectName, chapterNumber } = useParams<{ subjectName: string; chapterNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchSubject, fetchChapter, fetchChapters } = useCurriculumData();
  
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState('medium');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProgressSaved, setShowProgressSaved] = useState(false);

  const { 
    updateReadingProgress, 
    updateTimeSpent, 
    syncSubjectProgress,
    markChapterComplete 
  } = useProgressTracking(chapter?.id || null, subjectName || null, chapter?.chapter_number || null);

  const { isBookmarked, toggleBookmark } = useBookmark(chapter?.id || null);

  // Scroll progress tracking
  const handleProgressUpdate = useCallback((percentage: number) => {
    if (chapter?.id) {
      updateReadingProgress(percentage);
      
      // Show "Progress Saved" indicator
      setShowProgressSaved(true);
      setTimeout(() => setShowProgressSaved(false), 2000);
    }
  }, [chapter?.id, updateReadingProgress]);

  const scrollPercentage = useScrollProgress(handleProgressUpdate);

  // Time tracking - update database every minute
  useTimeTracking(!!chapter, useCallback(() => {
    if (chapter?.id) {
      updateTimeSpent(1); // Add 1 minute
    }
  }, [chapter?.id, updateTimeSpent]));

  useEffect(() => {
    const loadChapterData = async () => {
      if (!subjectName || !chapterNumber) return;

      setLoading(true);
      
      const subjectData = await fetchSubject(subjectName);
      if (!subjectData) {
        setLoading(false);
        return;
      }

      const chapterData = await fetchChapter(subjectData.id, parseInt(chapterNumber));
      const chaptersData = await fetchChapters(subjectData.id);
      
      setChapter(chapterData);
      setAllChapters(chaptersData);
      setLoading(false);
    };

    loadChapterData();
  }, [subjectName, chapterNumber]);

  // Sync subject progress when component unmounts
  useEffect(() => {
    return () => {
      if (chapter?.id) {
        syncSubjectProgress();
      }
    };
  }, [chapter?.id, syncSubjectProgress]);

  // Load preferences from localStorage
  useEffect(() => {
    const savedFontSize = localStorage.getItem('fontSize') || 'medium';
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    
    setFontSize(savedFontSize);
    setIsDarkMode(savedDarkMode);
    
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size);
  };

  const handleDarkModeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const currentIndex = allChapters.findIndex(ch => ch.chapter_number === chapter?.chapter_number);
  const previousChapter = currentIndex > 0 ? {
    number: allChapters[currentIndex - 1].chapter_number,
    title: allChapters[currentIndex - 1].chapter_title,
  } : null;
  
  const nextChapter = currentIndex < allChapters.length - 1 ? {
    number: allChapters[currentIndex + 1].chapter_number,
    title: allChapters[currentIndex + 1].chapter_title,
    isLocked: false, // TODO: Check prerequisites
  } : null;

  const fontSizeClasses = {
    small: 'text-base',
    medium: 'text-lg',
    large: 'text-xl',
    xlarge: 'text-2xl',
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-6">
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="hidden lg:block w-64 h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!chapter || !subjectName) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chapter not found</p>
          <Button onClick={() => navigate('/subjects')} className="mt-4">
            Browse Subjects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="relative">
        <ChapterHeader
          subjectName={subjectName}
          chapterNumber={chapter.chapter_number}
          chapterTitle={chapter.chapter_title}
          scrollPercentage={scrollPercentage}
        />

        <div className="container mx-auto px-4 py-8">
          {/* Chapter metadata */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {chapter.difficulty_level && (
              <DifficultyBadge level={chapter.difficulty_level} />
            )}
            {chapter.estimated_duration_minutes && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{chapter.estimated_duration_minutes} min read</span>
              </div>
            )}
            {chapter.caps_code && (
              <CAPSBadge code={chapter.caps_code} description={chapter.caps_description} />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleBookmark}
              className="ml-auto hidden lg:flex"
            >
              <Bookmark className={cn("h-5 w-5", isBookmarked && "fill-secondary text-secondary")} />
            </Button>
          </div>

          {/* Learning outcomes */}
          {chapter.learning_outcomes && chapter.learning_outcomes.length > 0 && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-primary">By the end of this chapter you will be able to:</h3>
              </div>
              <ul className="space-y-2">
                {chapter.learning_outcomes.map((outcome, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Main content area with sidebar */}
          <div className="flex gap-8">
            {/* Content */}
            <div className="flex-1 min-w-0">
              <article className={cn("transition-all duration-200", fontSizeClasses[fontSize as keyof typeof fontSizeClasses])}>
                {chapter.content_markdown ? (
                  <ChapterContentRenderer 
                    content={chapter.content_markdown} 
                    isMarkdown={true}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Chapter content coming soon...</p>
                    <p className="text-sm mt-2">This chapter is currently being prepared.</p>
                  </div>
                )}
              </article>

              {/* Navigation */}
              <ChapterNavigation
                subjectName={subjectName}
                previousChapter={previousChapter}
                nextChapter={nextChapter}
              />
            </div>

            {/* Sidebar TOC */}
            {chapter.content_markdown && (
              <ChapterSidebar content={chapter.content_markdown} />
            )}
          </div>
        </div>

        {/* Mobile toolbar */}
        <ChapterToolbar
          isBookmarked={isBookmarked}
          onBookmarkToggle={toggleBookmark}
          onPrevious={() => previousChapter && navigate(`/curriculum/${subjectName}/${previousChapter.number}`)}
          onNext={() => nextChapter && !nextChapter.isLocked && navigate(`/curriculum/${subjectName}/${nextChapter.number}`)}
          hasPrevious={!!previousChapter}
          hasNext={!!nextChapter && !nextChapter.isLocked}
          onFontSizeChange={handleFontSizeChange}
          fontSize={fontSize}
          onDarkModeToggle={handleDarkModeToggle}
          isDarkMode={isDarkMode}
        />

        {/* Progress saved indicator */}
        {showProgressSaved && (
          <div className="fixed bottom-20 lg:bottom-6 right-6 bg-background border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-2 animate-fade-in z-30">
            <div className="h-2 w-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium">Progress saved</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
