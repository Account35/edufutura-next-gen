import { AlertCircle, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';

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

interface PrerequisiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  prerequisites: Prerequisite[];
}

export const PrerequisiteModal = ({
  isOpen,
  onClose,
  prerequisites,
}: PrerequisiteModalProps) => {
  const navigate = useNavigate();
  const { subjectName } = useParams<{ subjectName: string }>();

  const incompleteRequired = prerequisites.filter(p => p.is_required && !p.completed);
  const firstIncomplete = incompleteRequired[0];

  const handleGoToPrerequisite = () => {
    if (firstIncomplete && subjectName) {
      navigate(`/curriculum/${subjectName}/${firstIncomplete.chapter.chapter_number}`);
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-accent">
            <AlertCircle className="h-6 w-6" />
            Prerequisites Required
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground">
            You need to complete the following chapters first:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 my-4">
          {prerequisites.map((prereq) => (
            <div
              key={prereq.prerequisite_chapter_id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted"
            >
              {prereq.completed ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  Chapter {prereq.chapter.chapter_number}: {prereq.chapter.chapter_title}
                </p>
                {!prereq.is_required && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended (not required)
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Got it
          </Button>
          {firstIncomplete && (
            <Button
              onClick={handleGoToPrerequisite}
              className="w-full sm:w-auto bg-secondary hover:bg-secondary/90"
            >
              Go to Chapter {firstIncomplete.chapter.chapter_number}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
