import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PrerequisiteModal } from './PrerequisiteModal';

interface Prerequisite {
  prerequisite_chapter_id: string;
  chapter: {
    chapter_title: string;
    chapter_number: number;
    id: string;
  };
  completed: boolean;
  is_required: boolean;
}

interface ChapterNavigationProps {
  subjectName: string;
  previousChapter?: { number: number; title: string } | null;
  nextChapter?: { 
    number: number; 
    title: string; 
    isLocked?: boolean;
    prerequisites?: Prerequisite[];
  } | null;
}

export const ChapterNavigation = ({
  subjectName,
  previousChapter,
  nextChapter,
}: ChapterNavigationProps) => {
  const navigate = useNavigate();
  const [showPrereqModal, setShowPrereqModal] = useState(false);

  const handleNextClick = () => {
    if (nextChapter?.isLocked) {
      setShowPrereqModal(true);
    } else if (nextChapter) {
      navigate(`/curriculum/${subjectName}/${nextChapter.number}`);
    }
  };

  return (
    <>
      {showPrereqModal && nextChapter?.prerequisites && (
        <PrerequisiteModal
          isOpen={showPrereqModal}
          onClose={() => setShowPrereqModal(false)}
          prerequisites={nextChapter.prerequisites}
        />
      )}
    <div className="mt-12 pt-8 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
      {previousChapter ? (
        <Button
          variant="outline"
          className="h-auto py-4 px-6 justify-start group hover:border-secondary"
          onClick={() => navigate(`/curriculum/${subjectName}/${previousChapter.number}`)}
        >
          <ChevronLeft className="h-5 w-5 mr-2 flex-shrink-0 group-hover:text-secondary" />
          <div className="text-left">
            <div className="text-xs text-muted-foreground">Previous</div>
            <div className="font-medium line-clamp-1">{previousChapter.title}</div>
          </div>
        </Button>
      ) : (
        <div /> 
      )}

      {nextChapter ? (
        nextChapter.isLocked ? (
          <Button
            variant="outline"
            className="h-auto py-4 px-6 justify-end hover:border-accent cursor-pointer"
            onClick={handleNextClick}
          >
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Next</div>
              <div className="font-medium line-clamp-1 flex items-center gap-2">
                <Lock className="h-4 w-4 text-accent" />
                {nextChapter.title}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 ml-2 flex-shrink-0" />
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-auto py-4 px-6 justify-end group hover:border-secondary"
            onClick={handleNextClick}
          >
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Next</div>
              <div className="font-medium line-clamp-1">{nextChapter.title}</div>
            </div>
            <ChevronRight className="h-5 w-5 ml-2 flex-shrink-0 group-hover:text-secondary" />
          </Button>
        )
      ) : (
        <div />
      )}
    </div>
    </>
  );
};
