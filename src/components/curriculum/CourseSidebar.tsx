import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronRight, Circle, CircleDashed, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Chapter } from '@/hooks/useCurriculumData';
import type { ChapterProgressState } from '@/hooks/useSubjectChapterProgress';

export interface CourseTopic {
  id: string;
  text: string;
  level: number;
}

interface CourseSidebarProps {
  subjectName: string;
  chapters: Chapter[];
  currentChapterNumber: number | null;
  currentChapterContent: string | null;
  progressMap: Record<string, ChapterProgressState>;
  overallProgress: number;
  className?: string;
}

const parseTopics = (content: string | null): CourseTopic[] => {
  if (!content) return [];
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  const headings = tempDiv.querySelectorAll('h2, h3, h4');
  return Array.from(headings).map((heading, index) => ({
    id: `heading-${index}`,
    text: heading.textContent || '',
    level: parseInt(heading.tagName.substring(1), 10),
  }));
};

const StatusIcon = ({ status }: { status: ChapterProgressState['status'] }) => {
  if (status === 'completed') {
    return <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-secondary" aria-label="Completed" />;
  }
  if (status === 'in_progress') {
    return <CircleDashed className="h-4 w-4 flex-shrink-0 text-primary" aria-label="In progress" />;
  }
  return <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-label="Not started" />;
};

export const CourseSidebar = ({
  subjectName,
  chapters,
  currentChapterNumber,
  currentChapterContent,
  progressMap,
  overallProgress,
  className,
}: CourseSidebarProps) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState<string>('');

  const topics = useMemo(() => parseTopics(currentChapterContent), [currentChapterContent]);

  useEffect(() => {
    if (topics.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveTopicId(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    document.querySelectorAll('[id^="heading-"]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [topics]);

  const scrollToTopic = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const completedCount = chapters.filter(
    (ch) => progressMap[ch.id]?.status === 'completed'
  ).length;

  if (collapsed) {
    return (
      <aside className={cn('flex-shrink-0', className)}>
        <div className="sticky top-24">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCollapsed(false)}
            aria-label="Expand course navigation"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn('w-full lg:w-72 flex-shrink-0', className)}>
      <div className="lg:sticky lg:top-24 rounded-xl border border-border bg-background">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-primary truncate">{subjectName}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse course navigation"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={overallProgress} className="h-2" aria-label="Course progress" />
          <p className="mt-2 text-xs text-muted-foreground">
            {Math.round(overallProgress)}% complete · {completedCount}/{chapters.length} chapters
          </p>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <nav className="p-2">
            <ul className="space-y-1">
              {chapters.map((ch) => {
                const isActive = ch.chapter_number === currentChapterNumber;
                const status = progressMap[ch.id]?.status ?? 'not_started';
                return (
                  <li key={ch.id}>
                    <button
                      onClick={() =>
                        navigate(`/curriculum/${encodeURIComponent(subjectName)}/${ch.chapter_number}`)
                      }
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'w-full flex items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        isActive
                          ? 'bg-muted font-medium text-primary'
                          : 'text-foreground hover:bg-muted/50'
                      )}
                    >
                      {isActive ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                      )}
                      <span className="flex-1 min-w-0">
                        <span className="block truncate">
                          {ch.chapter_number}. {ch.chapter_title}
                        </span>
                      </span>
                      <StatusIcon status={status} />
                    </button>

                    {isActive && topics.length > 0 && (
                      <ul className="mt-1 space-y-0.5 border-l border-border ml-5 pl-2">
                        {topics.map((topic) => (
                          <li key={topic.id} style={{ paddingLeft: `${(topic.level - 2) * 10}px` }}>
                            <button
                              onClick={() => scrollToTopic(topic.id)}
                              className={cn(
                                'w-full truncate rounded px-2 py-1 text-left text-xs transition-colors hover:text-secondary',
                                activeTopicId === topic.id
                                  ? 'text-secondary font-medium'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {topic.text}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
};
