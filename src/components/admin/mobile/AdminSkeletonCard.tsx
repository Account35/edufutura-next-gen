import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AdminSkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
  showBadge?: boolean;
  className?: string;
}

export function AdminSkeletonCard({ 
  lines = 2, 
  showAvatar = false, 
  showBadge = false,
  className 
}: AdminSkeletonCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {showAvatar && (
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-32" />
              {showBadge && <Skeleton className="h-5 w-16 rounded-full" />}
            </div>
            {Array.from({ length: lines - 1 }).map((_, i) => (
              <Skeleton 
                key={i} 
                className={cn('h-3', i === lines - 2 ? 'w-1/2' : 'w-full')} 
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminSkeletonList({ count = 5, ...props }: AdminSkeletonCardProps & { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <AdminSkeletonCard key={i} {...props} />
      ))}
    </div>
  );
}

export function AdminSkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-2 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
