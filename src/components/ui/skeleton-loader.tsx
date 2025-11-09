import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export const SubjectCardSkeleton = () => {
  return (
    <div className="subject-card">
      <div className="absolute top-0 left-0 right-0 h-1 shimmer" />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="w-20 h-20 rounded-full" />
        </div>
        <div className="space-y-3 pt-3">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const AchievementSkeleton = () => {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col items-center text-center space-y-2 p-3">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
};

export const ActivitySkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-5 w-5 rounded-full mt-0.5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Banner Skeleton */}
      <div className="rounded-xl h-32 shimmer" />

      {/* Upgrade Banner Skeleton */}
      <div className="rounded-lg h-24 shimmer" />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Cards Skeleton */}
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SubjectCardSkeleton />
            <SubjectCardSkeleton />
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <Skeleton className="h-6 w-40" />
            <AchievementSkeleton />
          </div>
          <div className="rounded-lg border p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <ActivitySkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};