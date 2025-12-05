import { Loader2 } from "lucide-react";
import { Skeleton } from "./skeleton";

interface LazyLoadFallbackProps {
  type?: 'page' | 'component' | 'minimal';
}

export const LazyLoadFallback = ({ type = 'page' }: LazyLoadFallbackProps) => {
  if (type === 'minimal') {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  if (type === 'component') {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  // Full page fallback
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header skeleton */}
      <div className="h-16 border-b border-border bg-card px-4 flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-6 w-32" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-6">
          {/* Title */}
          <Skeleton className="h-10 w-64" />
          
          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border">
                <Skeleton className="h-32 w-full rounded-lg mb-4" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Loading indicator */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-card shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-border">
        <Loader2 className="h-4 w-4 animate-spin text-secondary" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
};

export default LazyLoadFallback;
