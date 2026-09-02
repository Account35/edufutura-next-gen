import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Hand, ListChecks } from 'lucide-react';

interface ChapterInteractivePracticeProps {
  chapterId: string;
  subjectName: string;
}

interface TopicPractice {
  id: string;
  topic_number: number;
  topic_title: string;
  practice_questions: unknown;
  examples: unknown;
}

interface ChapterQuiz {
  id: string;
  quiz_title: string;
  quiz_description: string | null;
  total_questions: number;
}

const asList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const text = record.question ?? record.task ?? record.step ?? record.text ?? record.title;
          return typeof text === 'string' ? text : null;
        }
        return null;
      })
      .filter((item): item is string => !!item);
  }
  return [];
};

/**
 * Kinesthetic learning style: renders interactive practice content that
 * already exists in the data model (topic practice tasks/examples and
 * chapter-linked quizzes). Never fabricates exercises.
 */
export const ChapterInteractivePractice = ({ chapterId, subjectName }: ChapterInteractivePracticeProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<TopicPractice[]>([]);
  const [quizzes, setQuizzes] = useState<ChapterQuiz[]>([]);
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const [topicsRes, quizRes] = await Promise.all([
        supabase
          .from('curriculum_topics')
          .select('id, topic_number, topic_title, practice_questions, examples')
          .eq('chapter_id', chapterId)
          .order('topic_number'),
        supabase
          .from('quizzes')
          .select('id, quiz_title, quiz_description, total_questions')
          .eq('chapter_id', chapterId)
          .eq('is_published', true),
      ]);

      if (cancelled) return;
      setTopics((topicsRes.data as TopicPractice[]) || []);
      setQuizzes((quizRes.data as ChapterQuiz[]) || []);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  if (loading) {
    return <Skeleton className="not-prose mb-6 h-28 w-full rounded-2xl" />;
  }

  const practiceTopics = topics.filter(
    (topic) => asList(topic.practice_questions).length > 0 || asList(topic.examples).length > 0
  );

  if (practiceTopics.length === 0 && quizzes.length === 0) {
    return (
      <div className="not-prose mb-6 rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center">
        <Hand className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-foreground">
          No hands-on practice has been added to this chapter yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Work through the written explanation below in the meantime.
        </p>
      </div>
    );
  }

  return (
    <div className="not-prose mb-6 space-y-4">
      {practiceTopics.map((topic) => {
        const tasks = [...asList(topic.practice_questions), ...asList(topic.examples)];
        return (
          <Collapsible key={topic.id} defaultOpen className="rounded-2xl border border-border bg-background">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ListChecks className="h-4 w-4 text-secondary" aria-hidden="true" />
                {topic.topic_title}
              </span>
              <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="space-y-2 px-4 pb-4">
                {tasks.map((task, index) => {
                  const key = `${topic.id}-${index}`;
                  return (
                    <li key={key} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!doneTasks[key]}
                        onChange={(event) =>
                          setDoneTasks((prev) => ({ ...prev, [key]: event.target.checked }))
                        }
                        className="mt-1 h-4 w-4 accent-current"
                        aria-label={`Mark step ${index + 1} as done`}
                      />
                      <span className={doneTasks[key] ? 'text-muted-foreground line-through' : ''}>{task}</span>
                    </li>
                  );
                })}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {quizzes.map((quiz) => (
        <div
          key={quiz.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">{quiz.quiz_title}</p>
            <p className="text-xs text-muted-foreground">
              {quiz.quiz_description || `${quiz.total_questions} practice questions`}
            </p>
          </div>
          <Button size="sm" onClick={() => navigate(`/quiz/${quiz.id}`)}>
            Practise now
          </Button>
        </div>
      ))}
    </div>
  );
};
