 import { Skeleton } from './skeleton';
 import { Loader2 } from 'lucide-react';
 
 /**
  * Dashboard-specific skeleton matching actual layout
  */
 export const DashboardSkeleton = () => {
   return (
     <div className="min-h-screen bg-background">
       {/* Welcome Banner Skeleton */}
       <div className="container mx-auto p-4 md:p-6 lg:p-8 pb-20 lg:pb-6">
         <div className="space-y-6">
           {/* Welcome Banner */}
           <div className="bg-card rounded-xl p-6 border border-border">
             <div className="flex items-start gap-4">
               <Skeleton className="h-16 w-16 rounded-full shrink-0" />
               <div className="flex-1 space-y-2">
                 <Skeleton className="h-8 w-64" />
                 <Skeleton className="h-4 w-48" />
                 <div className="flex gap-4 pt-2">
                   <Skeleton className="h-6 w-24" />
                   <Skeleton className="h-6 w-24" />
                   <Skeleton className="h-6 w-24" />
                 </div>
               </div>
             </div>
           </div>
 
           {/* Main Grid */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Subject Cards */}
             <div className="lg:col-span-2 space-y-4">
               <Skeleton className="h-8 w-40 mb-4" />
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {[1, 2, 3, 4].map((i) => (
                   <div key={i} className="bg-card rounded-xl p-4 border border-border">
                     <div className="flex items-center gap-3 mb-3">
                       <Skeleton className="h-10 w-10 rounded-lg" />
                       <div className="flex-1">
                         <Skeleton className="h-5 w-32 mb-1" />
                         <Skeleton className="h-3 w-20" />
                       </div>
                     </div>
                     <Skeleton className="h-2 w-full rounded-full" />
                     <Skeleton className="h-4 w-24 mt-2" />
                   </div>
                 ))}
               </div>
             </div>
 
             {/* Sidebar */}
             <div className="space-y-6">
               {/* Activity Card */}
               <div className="bg-card rounded-xl p-4 border border-border">
                 <Skeleton className="h-6 w-32 mb-4" />
                 <div className="space-y-3">
                   {[1, 2, 3].map((i) => (
                     <div key={i} className="flex gap-3">
                       <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                       <div className="flex-1">
                         <Skeleton className="h-4 w-full mb-1" />
                         <Skeleton className="h-3 w-20" />
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
 
               {/* Achievements Card */}
               <div className="bg-card rounded-xl p-4 border border-border">
                 <Skeleton className="h-6 w-32 mb-4" />
                 <div className="flex gap-2">
                   {[1, 2, 3].map((i) => (
                     <Skeleton key={i} className="h-12 w-12 rounded-full" />
                   ))}
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
 
       {/* Mobile Bottom Nav Skeleton */}
       <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border lg:hidden">
         <div className="flex items-center justify-around h-full px-4">
           {[1, 2, 3, 4, 5].map((i) => (
             <Skeleton key={i} className="h-10 w-12 rounded" />
           ))}
         </div>
       </div>
     </div>
   );
 };
 
 /**
  * Onboarding-specific skeleton
  */
 export const OnboardingSkeleton = () => {
   return (
     <div className="min-h-screen bg-background flex items-center justify-center p-4">
       <div className="w-full max-w-lg space-y-8">
         {/* Progress indicator */}
         <div className="flex justify-center gap-2">
           {[1, 2, 3, 4].map((i) => (
             <Skeleton key={i} className="h-2 w-12 rounded-full" />
           ))}
         </div>
 
         {/* Card skeleton */}
         <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
           <div className="text-center space-y-4 mb-8">
             <Skeleton className="h-12 w-12 rounded-full mx-auto" />
             <Skeleton className="h-8 w-48 mx-auto" />
             <Skeleton className="h-4 w-64 mx-auto" />
           </div>
 
           <div className="space-y-4">
             <Skeleton className="h-12 w-full rounded-lg" />
             <Skeleton className="h-12 w-full rounded-lg" />
             <Skeleton className="h-12 w-full rounded-lg" />
           </div>
 
           <div className="flex gap-4 mt-8">
             <Skeleton className="h-12 flex-1 rounded-lg" />
             <Skeleton className="h-12 flex-1 rounded-lg" />
           </div>
         </div>
       </div>
     </div>
   );
 };
 
 /**
  * Curriculum page skeleton
  */
 export const CurriculumSkeleton = () => {
   return (
     <div className="min-h-screen bg-background">
       <div className="container mx-auto p-4 md:p-6 lg:p-8 pb-20 lg:pb-6">
         <div className="flex flex-col lg:flex-row gap-6">
           {/* Sidebar */}
           <div className="w-full lg:w-64 shrink-0">
             <div className="bg-card rounded-xl p-4 border border-border">
               <Skeleton className="h-6 w-32 mb-4" />
               <div className="space-y-2">
                 {[1, 2, 3, 4, 5, 6].map((i) => (
                   <Skeleton key={i} className="h-10 w-full rounded-lg" />
                 ))}
               </div>
             </div>
           </div>
 
           {/* Main Content */}
           <div className="flex-1 space-y-6">
             <div className="bg-card rounded-xl p-6 border border-border">
               <Skeleton className="h-8 w-64 mb-4" />
               <Skeleton className="h-4 w-full mb-2" />
               <Skeleton className="h-4 w-3/4" />
             </div>
 
             <div className="bg-card rounded-xl p-6 border border-border">
               <div className="space-y-4">
                 {[1, 2, 3].map((i) => (
                   <div key={i}>
                     <Skeleton className="h-6 w-48 mb-3" />
                     <Skeleton className="h-4 w-full mb-2" />
                     <Skeleton className="h-4 w-full mb-2" />
                     <Skeleton className="h-4 w-2/3" />
                   </div>
                 ))}
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 };
 
 /**
  * Community/Forum page skeleton
  */
 export const CommunitySkeleton = () => {
   return (
     <div className="min-h-screen bg-background">
       <div className="container mx-auto p-4 md:p-6 lg:p-8 pb-20 lg:pb-6">
         <div className="space-y-6">
           {/* Header */}
           <div className="flex items-center justify-between">
             <Skeleton className="h-8 w-48" />
             <Skeleton className="h-10 w-32 rounded-lg" />
           </div>
 
           {/* Filters */}
           <div className="flex gap-2 flex-wrap">
             {[1, 2, 3, 4].map((i) => (
               <Skeleton key={i} className="h-8 w-24 rounded-full" />
             ))}
           </div>
 
           {/* Posts */}
           <div className="space-y-4">
             {[1, 2, 3, 4].map((i) => (
               <div key={i} className="bg-card rounded-xl p-4 border border-border">
                 <div className="flex gap-3 mb-3">
                   <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                   <div className="flex-1">
                     <Skeleton className="h-5 w-32 mb-1" />
                     <Skeleton className="h-3 w-24" />
                   </div>
                 </div>
                 <Skeleton className="h-6 w-3/4 mb-2" />
                 <Skeleton className="h-4 w-full mb-1" />
                 <Skeleton className="h-4 w-2/3" />
                 <div className="flex gap-4 mt-4">
                   <Skeleton className="h-6 w-16" />
                   <Skeleton className="h-6 w-16" />
                   <Skeleton className="h-6 w-16" />
                 </div>
               </div>
             ))}
           </div>
         </div>
       </div>
     </div>
   );
 };
 
 /**
  * Generic page skeleton for other routes
  */
 export const GenericPageSkeleton = () => {
   return (
     <div className="min-h-screen bg-background">
       {/* Header */}
       <div className="h-16 border-b border-border bg-card px-4 flex items-center gap-4">
         <Skeleton className="h-10 w-10 rounded-full" />
         <Skeleton className="h-6 w-32" />
         <div className="ml-auto flex gap-2">
           <Skeleton className="h-8 w-8 rounded" />
           <Skeleton className="h-8 w-8 rounded" />
         </div>
       </div>
 
       {/* Content */}
       <div className="container mx-auto p-4 md:p-6 lg:p-8 pb-20 lg:pb-6">
         <div className="space-y-6">
           <Skeleton className="h-10 w-64" />
 
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
       <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-card shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-border z-50">
         <Loader2 className="h-4 w-4 animate-spin text-primary" />
         <span className="text-sm text-muted-foreground">Loading...</span>
       </div>
     </div>
   );
 };
 
 /**
  * Quiz page skeleton
  */
 export const QuizSkeleton = () => {
   return (
     <div className="min-h-screen bg-background">
       <div className="container mx-auto p-4 md:p-6 max-w-3xl pb-20 lg:pb-6">
         <div className="space-y-6">
           {/* Progress bar */}
           <div className="space-y-2">
             <div className="flex justify-between">
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-4 w-16" />
             </div>
             <Skeleton className="h-2 w-full rounded-full" />
           </div>
 
           {/* Question card */}
           <div className="bg-card rounded-xl p-6 border border-border">
             <Skeleton className="h-6 w-20 mb-4" />
             <Skeleton className="h-8 w-full mb-2" />
             <Skeleton className="h-8 w-3/4 mb-6" />
 
             {/* Options */}
             <div className="space-y-3">
               {[1, 2, 3, 4].map((i) => (
                 <Skeleton key={i} className="h-14 w-full rounded-lg" />
               ))}
             </div>
           </div>
 
           {/* Navigation */}
           <div className="flex justify-between">
             <Skeleton className="h-12 w-28 rounded-lg" />
             <Skeleton className="h-12 w-28 rounded-lg" />
           </div>
         </div>
       </div>
     </div>
   );
 };
 
 export default DashboardSkeleton;