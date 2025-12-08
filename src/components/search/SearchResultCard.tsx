import { Link } from 'react-router-dom';
import { Clock, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DifficultyBadge } from '@/components/curriculum/DifficultyBadge';
import { Badge } from '@/components/ui/badge';
import DOMPurify from 'dompurify';

interface SearchResultCardProps {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  subjectName: string;
  excerpt: string;
  matchType: 'title' | 'description' | 'content';
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes?: number;
  highlightTerms?: string[];
}

export const SearchResultCard = ({
  chapterId,
  chapterNumber,
  chapterTitle,
  subjectName,
  excerpt,
  matchType,
  difficulty,
  estimatedMinutes,
  highlightTerms = [],
}: SearchResultCardProps) => {
  const highlightText = (text: string) => {
    if (highlightTerms.length === 0) return DOMPurify.sanitize(text);
    
    // First sanitize the text to prevent XSS
    const sanitizedText = DOMPurify.sanitize(text);
    
    // Escape special regex characters in search terms
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    let highlightedText = sanitizedText;
    highlightTerms.forEach(term => {
      const escapedTerm = escapeRegex(DOMPurify.sanitize(term));
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-secondary/20 text-primary font-semibold">$1</mark>'
      );
    });
    
    return highlightedText;
  };

  const matchLabels = {
    title: 'Match in title',
    description: 'Match in description',
    content: 'Match in chapter content',
  };

  return (
    <Link to={`/curriculum/${subjectName}/${chapterNumber}`}>
      <Card className="hover:shadow-md hover:border-l-4 hover:border-l-secondary transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 
                className="font-bold text-primary hover:text-secondary transition-colors mb-1"
                dangerouslySetInnerHTML={{ __html: highlightText(chapterTitle) }}
              />
              
              <p 
                className="text-sm text-muted-foreground mb-3 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: highlightText(excerpt) }}
              />
              
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="text-muted-foreground">
                  {subjectName}
                </Badge>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">Chapter {chapterNumber}</span>
                
                {difficulty && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <DifficultyBadge level={difficulty} className="text-xs" />
                  </>
                )}
                
                {estimatedMinutes && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{estimatedMinutes} min</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-2">
                <span className="text-xs text-muted-foreground italic">
                  {matchLabels[matchType]}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
