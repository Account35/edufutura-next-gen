import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useCurriculumData, Chapter } from '@/hooks/useCurriculumData';
import { useProgressTracking } from '@/hooks/useProgressTracking';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useBookmark } from '@/hooks/useBookmark';
import { usePrerequisites } from '@/hooks/usePrerequisites';
import { useAuth } from '@/hooks/useAuth';
import { ChapterHeader } from '@/components/curriculum/ChapterHeader';
import { ChapterSidebar } from '@/components/curriculum/ChapterSidebar';
import { ChapterContentRenderer } from '@/components/curriculum/ChapterContentRenderer';
import { MobileReadingToolbar } from '@/components/curriculum/MobileReadingToolbar';
import { ChapterNavigation } from '@/components/curriculum/ChapterNavigation';
import { ChapterDiscussionSection } from '@/components/curriculum/ChapterDiscussionSection';
import { FloatingDiscussButton } from '@/components/curriculum/FloatingDiscussButton';
import { PrerequisiteModal } from '@/components/curriculum/PrerequisiteModal';
import { DifficultyBadge } from '@/components/curriculum/DifficultyBadge';
import { CAPSBadge } from '@/components/curriculum/CAPSBadge';
import { ProgressSavedIndicator } from '@/components/curriculum/ProgressSavedIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, Target, Bookmark, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdaptiveLearning } from '@/hooks/useAdaptiveLearning';
import { useReadingPreferences } from '@/hooks/useReadingPreferences';
import { toast } from 'sonner';

export default function ChapterContent() {
  const { subjectName, chapterNumber } = useParams<{ subjectName: string; chapterNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchSubject, fetchChapter, fetchChapters } = useCurriculumData();
  
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProgressSaved, setShowProgressSaved] = useState(false);
  const [showPrereqModal, setShowPrereqModal] = useState(false);
  const [readingTime, setReadingTime] = useState({ total: 0, remaining: 0 });
  const [highestScrollProgress, setHighestScrollProgress] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [adaptiveContent, setAdaptiveContent] = useState<any | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const { getAdaptiveContent } = useAdaptiveLearning();
  const { fontSize, isDarkMode, updateFontSize, toggleDarkMode, getFontSizeClass } = useReadingPreferences();

  const { 
    updateReadingProgress, 
    updateTimeSpent, 
    syncSubjectProgress,
    markChapterComplete 
  } = useProgressTracking(chapter?.id || null, subjectName || null, chapter?.chapter_number || null);

  const { isBookmarked, toggleBookmark } = useBookmark(chapter?.id || null);
  
  // Check prerequisites for current chapter
  const { isLocked, prerequisites, loading: prereqLoading } = usePrerequisites(chapter?.id || null);

  // Scroll progress tracking
  const handleProgressUpdate = useCallback((percentage: number) => {
    if (!chapter?.id) return;

    const nextProgress = Math.max(percentage, highestScrollProgress);
    if (nextProgress <= highestScrollProgress) return;

    setHighestScrollProgress(nextProgress);
    updateReadingProgress(nextProgress);

    setShowProgressSaved(true);
    setTimeout(() => setShowProgressSaved(false), 2000);
  }, [chapter?.id, highestScrollProgress, updateReadingProgress]);

  const scrollProgress = useScrollProgress(handleProgressUpdate);

  // Time tracking - update database every minute
  useTimeTracking(!!chapter, useCallback(() => {
    if (chapter?.id) {
      updateTimeSpent(1); // Add 1 minute
      setTimeSpent(prev => prev + 1);
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

  useEffect(() => {
    const loadAdaptiveContent = async () => {
      if (!subjectName) return;
      const content = await getAdaptiveContent(subjectName);
      setAdaptiveContent(content);
    };

    loadAdaptiveContent();
  }, [subjectName, getAdaptiveContent]);

  // Show prerequisite modal if chapter is locked
  useEffect(() => {
    if (isLocked && !prereqLoading && chapter) {
      setShowPrereqModal(true);
    }
  }, [isLocked, prereqLoading, chapter]);

  // Sync subject progress when component unmounts
  useEffect(() => {
    return () => {
      if (chapter?.id) {
        syncSubjectProgress();
      }
    };
  }, [chapter?.id, syncSubjectProgress]);

  // Calculate reading time
  useEffect(() => {
    if (chapter?.content_markdown) {
      const wordCount = chapter.content_markdown.split(/\s+/).length;
      const totalMinutes = Math.ceil(wordCount / 225); // 225 words per minute
      const remainingMinutes = Math.ceil(totalMinutes * (1 - scrollProgress / 100));
      setReadingTime({ total: totalMinutes, remaining: remainingMinutes });
    }
  }, [chapter, scrollProgress]);

  // Scroll tracking for progress and reading position
  useEffect(() => {
    const handleScroll = () => {
      if (!chapter?.id) return;

      const scrollTop = window.scrollY;
      sessionStorage.setItem(`reading-position-${chapter.id}`, String(scrollTop));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [chapter?.id]);

  // Restore reading position
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(`reading-position-${chapter?.id}`);
    if (savedPosition && chapter?.id) {
      const position = parseInt(savedPosition);
      requestAnimationFrame(() => {
        window.scrollTo({ top: position, behavior: 'instant' as ScrollBehavior });
      });
      if (position > 100) {
        toast.info('Resumed from where you left off', { duration: 2000 });
      }
    }
  }, [chapter?.id]);

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const currentIndex = allChapters.findIndex(ch => ch.chapter_number === chapter?.chapter_number);
  const previousChapter = currentIndex > 0 ? {
    number: allChapters[currentIndex - 1].chapter_number,
    title: allChapters[currentIndex - 1].chapter_title,
  } : null;
  
  // Check next chapter prerequisites
  const nextChapterId = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1].id : null;
  const { isLocked: isNextLocked, prerequisites: nextPrereqs } = usePrerequisites(nextChapterId);
  
  const nextChapter = currentIndex < allChapters.length - 1 ? {
    number: allChapters[currentIndex + 1].chapter_number,
    title: allChapters[currentIndex + 1].chapter_title,
    isLocked: isNextLocked,
    prerequisites: nextPrereqs,
  } : null;

  const handlePreviousChapter = () => {
    if (previousChapter) navigate(`/curriculum/${subjectName}/${previousChapter.number}`);
  };

  const handleNextChapter = () => {
    if (nextChapter && !nextChapter.isLocked) navigate(`/curriculum/${subjectName}/${nextChapter.number}`);
  };

  const handleBookmarkToggle = () => {
    toggleBookmark();
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
      {showPrereqModal && prerequisites.length > 0 && (
        <PrerequisiteModal
          isOpen={showPrereqModal}
          onClose={() => setShowPrereqModal(false)}
          prerequisites={prerequisites}
        />
      )}
      <div className="relative" ref={contentRef}>
        {/* Scroll Progress Bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-30">
          <div
            className="h-full bg-secondary transition-all duration-200"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        <ChapterHeader
          subjectName={subjectName}
          chapterNumber={chapter.chapter_number}
          chapterTitle={chapter.chapter_title}
          scrollPercentage={scrollProgress}
        />

        <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
          {adaptiveContent && (
            <div className="mb-6 rounded-2xl border border-border bg-muted/10 p-4 dark:bg-muted/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">Adaptive learning features active</p>
                  <p className="text-sm text-muted-foreground">
                    Your chosen learning style is being applied to this chapter.
                  </p>
                </div>
                <div className="text-sm text-secondary">
                  {adaptiveContent.difficulty_level ? `${adaptiveContent.difficulty_level} mode` : 'Personalized content'}
                </div>
              </div>
              <div className="grid gap-2 mt-4 sm:grid-cols-2">
                {adaptiveContent.show_diagrams && (
                  <div className="rounded-xl border border-border p-3 bg-background">
                    <p className="text-sm font-medium">Visual support enabled</p>
                    <p className="text-xs text-muted-foreground">Diagrams and visual cues are prioritized for this chapter.</p>
                  </div>
                )}
                {adaptiveContent.show_audio_option && (
                  <div className="rounded-xl border border-border p-3 bg-background">
                    <p className="text-sm font-medium">Audio-ready explanations</p>
                    <p className="text-xs text-muted-foreground">Audio and narration options are recommended for your learning style.</p>
                  </div>
                )}
                {adaptiveContent.show_detailed_steps && (
                  <div className="rounded-xl border border-border p-3 bg-background">
                    <p className="text-sm font-medium">Step-by-step guidance</p>
                    <p className="text-xs text-muted-foreground">Detailed explanations and text-based notes are highlighted.</p>
                  </div>
                )}
                {adaptiveContent.show_interactive_elements && (
                  <div className="rounded-xl border border-border p-3 bg-background">
                    <p className="text-sm font-medium">Interactive practice</p>
                    <p className="text-xs text-muted-foreground">Hands-on examples and practice prompts are emphasized.</p>
                  </div>
                )}
              </div>
              {adaptiveContent.personalized_tips?.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {adaptiveContent.personalized_tips.map((tip: string, index: number) => (
                    <div key={index} className="rounded-xl border border-border p-3 bg-background">
                      <p className="text-sm text-muted-foreground">{tip}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Reading Time Estimate */}
          {readingTime.total > 0 && (
            <div className="mb-4 text-sm text-muted-foreground">
              {scrollProgress < 95 ? (
                <>📖 {readingTime.remaining} min remaining</>
              ) : (
                <>✅ Chapter completed!</>
              )}
            </div>
          )}
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

          {/* Learning Outcomes - Collapsible on Mobile */}
          {chapter.learning_outcomes && chapter.learning_outcomes.length > 0 && (
            <Collapsible defaultOpen={true} className="mb-8">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl overflow-hidden">
                <CollapsibleTrigger className="w-full p-6 pb-3 flex items-center justify-between lg:cursor-default">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-primary">By the end of this chapter you will be able to:</h3>
                  </div>
                  <ChevronDown className="h-4 w-4 lg:hidden transition-transform duration-200 data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-6 pb-6">
                    <ul className="space-y-2">
                      {chapter.learning_outcomes.map((outcome, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span className="leading-relaxed">{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Main content area with sidebar */}
          <div className="flex gap-8">
            {/* Content */}
            <div className="flex-1 min-w-0">
              <article 
                className={cn(
                  "prose max-w-none dark:prose-invert transition-all duration-200",
                  getFontSizeClass()
                )}
                style={{ lineHeight: '1.8' }}
              >
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

              {/* Community Integration */}
              <ChapterDiscussionSection
                chapterId={chapter.id}
                subjectName={subjectName}
                chapterTitle={chapter.chapter_title}
                timeSpent={timeSpent}
                progressPercentage={scrollProgress}
                estimatedMinutes={chapter.estimated_duration_minutes || 30}
              />
            </div>

            {/* Sidebar TOC */}
            {chapter.content_markdown && (
              <ChapterSidebar content={chapter.content_markdown} />
            )}
          </div>
        </div>

        {/* Mobile Reading Toolbar */}
        <MobileReadingToolbar
          isBookmarked={isBookmarked}
          onBookmarkToggle={handleBookmarkToggle}
          onPrevious={handlePreviousChapter}
          onNext={handleNextChapter}
          hasPrevious={!!previousChapter}
          hasNext={!!nextChapter && !nextChapter.isLocked}
          onFontSizeChange={updateFontSize}
          fontSize={fontSize}
          onDarkModeToggle={toggleDarkMode}
          isDarkMode={isDarkMode}
        />

        {/* Progress Saved Indicator */}
        <ProgressSavedIndicator show={showProgressSaved} />

        {/* Floating Discuss Button */}
        <FloatingDiscussButton
          onClick={() => navigate(`/community/forums/${encodeURIComponent(subjectName)}`, {
            state: { chapterId: chapter.id, chapterTitle: chapter.chapter_title }
          })}
        />
      </div>
    </DashboardLayout>
  );
}
