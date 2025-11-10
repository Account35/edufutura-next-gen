import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';

interface SearchResult {
  id: string;
  chapter_number: number;
  chapter_title: string;
  chapter_description: string;
  content_markdown: string;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced';
  estimated_duration_minutes: number;
  subject: {
    subject_name: string;
  };
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { user } = useAuth();
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Search in chapter titles, descriptions, and content
        const { data, error } = await supabase
          .from('curriculum_chapters')
          .select(`
            id,
            chapter_number,
            chapter_title,
            chapter_description,
            content_markdown,
            difficulty_level,
            estimated_duration_minutes,
            subject_id,
            curriculum_subjects!inner(subject_name)
          `)
          .eq('is_published', true)
          .or(`chapter_title.ilike.%${query}%,chapter_description.ilike.%${query}%,content_markdown.ilike.%${query}%`)
          .order('chapter_number', { ascending: true })
          .limit(50);

        if (error) throw error;

        const formattedResults = data?.map((item: any) => ({
          ...item,
          subject: {
            subject_name: item.curriculum_subjects.subject_name,
          },
        })) || [];

        setResults(formattedResults);

        // Track search
        if (user && query.trim()) {
          await supabase.from('search_history').insert({
            user_id: user.id,
            query: query.trim(),
          });
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query, user]);

  const getExcerpt = (result: SearchResult): string => {
    const searchTerm = query.toLowerCase();
    
    // Check title first
    if (result.chapter_title.toLowerCase().includes(searchTerm)) {
      return result.chapter_description || 'No description available';
    }
    
    // Check description
    if (result.chapter_description?.toLowerCase().includes(searchTerm)) {
      return result.chapter_description;
    }
    
    // Extract from content
    if (result.content_markdown) {
      const lowerContent = result.content_markdown.toLowerCase();
      const index = lowerContent.indexOf(searchTerm);
      
      if (index !== -1) {
        const start = Math.max(0, index - 75);
        const end = Math.min(result.content_markdown.length, index + 75);
        let excerpt = result.content_markdown.substring(start, end);
        
        if (start > 0) excerpt = '...' + excerpt;
        if (end < result.content_markdown.length) excerpt = excerpt + '...';
        
        return excerpt;
      }
    }
    
    return result.chapter_description || 'No description available';
  };

  const getMatchType = (result: SearchResult): 'title' | 'description' | 'content' => {
    const searchTerm = query.toLowerCase();
    
    if (result.chapter_title.toLowerCase().includes(searchTerm)) return 'title';
    if (result.chapter_description?.toLowerCase().includes(searchTerm)) return 'description';
    return 'content';
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Search bar */}
        <div className="mb-8">
          <SearchBar autoFocus />
        </div>

        {/* Results header */}
        {query && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary mb-2">
              {loading ? 'Searching...' : `Found ${results.length} result${results.length !== 1 ? 's' : ''}`}
            </h1>
            <p className="text-muted-foreground">
              for "<span className="font-medium text-foreground">{query}</span>"
            </p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            {results.map((result) => (
              <SearchResultCard
                key={result.id}
                chapterId={result.id}
                chapterNumber={result.chapter_number}
                chapterTitle={result.chapter_title}
                subjectName={result.subject.subject_name}
                excerpt={getExcerpt(result)}
                matchType={getMatchType(result)}
                difficulty={result.difficulty_level}
                estimatedMinutes={result.estimated_duration_minutes}
                highlightTerms={query.split(' ')}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && query && results.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No results found for "{query}"
            </h2>
            <div className="text-muted-foreground space-y-1 mb-6">
              <p>Try different keywords</p>
              <p>Check your spelling</p>
              <p>Use more general terms</p>
            </div>
          </div>
        )}

        {/* No query state */}
        {!loading && !query && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Start searching
            </h2>
            <p className="text-muted-foreground">
              Enter keywords to search across all curriculum content
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
