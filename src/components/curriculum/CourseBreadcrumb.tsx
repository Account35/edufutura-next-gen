import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface CourseBreadcrumbProps {
  subjectName: string;
  chapterNumber: number;
  chapterTitle: string;
  sectionTitle?: string | null;
}

export const CourseBreadcrumb = ({
  subjectName,
  chapterNumber,
  chapterTitle,
  sectionTitle,
}: CourseBreadcrumbProps) => (
  <Breadcrumb className="mb-4">
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink asChild>
          <Link to={`/curriculum/${encodeURIComponent(subjectName)}`}>{subjectName}</Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        {sectionTitle ? (
          <BreadcrumbLink asChild>
            <Link to={`/curriculum/${encodeURIComponent(subjectName)}/${chapterNumber}`}>
              {chapterTitle}
            </Link>
          </BreadcrumbLink>
        ) : (
          <BreadcrumbPage className="truncate max-w-[16rem]">{chapterTitle}</BreadcrumbPage>
        )}
      </BreadcrumbItem>
      {sectionTitle && (
        <>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate max-w-[16rem]">{sectionTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </>
      )}
    </BreadcrumbList>
  </Breadcrumb>
);
