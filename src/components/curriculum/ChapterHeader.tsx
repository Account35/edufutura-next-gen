import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface ChapterHeaderProps {
  subjectName: string;
  chapterNumber: number;
  chapterTitle: string;
  scrollPercentage: number;
}

export const ChapterHeader = ({
  subjectName,
  chapterNumber,
  chapterTitle,
  scrollPercentage,
}: ChapterHeaderProps) => {
  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/curriculum/${subjectName}`} className="text-primary hover:text-secondary">
                  {subjectName}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-foreground">
                Chapter {chapterNumber}: {chapterTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-muted relative overflow-hidden">
        <div
          className="h-full bg-secondary transition-all duration-300 ease-out"
          style={{ width: `${scrollPercentage}%` }}
        >
          {scrollPercentage === 100 && (
            <div className="absolute inset-0 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};
