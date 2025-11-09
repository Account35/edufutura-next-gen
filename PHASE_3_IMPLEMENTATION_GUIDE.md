# Phase 3 Implementation Guide
## Curriculum Navigation & Content Structure

This document provides Phase 3 developers with the context, patterns, and integration points from Phase 2.

---

## 🎯 Phase 3 Objectives

Build the curriculum navigation system allowing students to:
1. Browse all CAPS-aligned subjects and chapters
2. Access detailed curriculum content for each chapter
3. Navigate hierarchically through subjects → chapters → topics
4. Search for specific curriculum content
5. Track progress as they complete chapters
6. Continue learning from where they left off

---

## 📦 What Phase 2 Provides

### 1. Dashboard Integration Points

**Subject Cards** (`src/components/dashboard/SubjectGrid.tsx`)
```typescript
// Current implementation (disabled)
<Button 
  className="flex-1 bg-primary hover:bg-primary-glow"
  disabled
>
  Continue Learning
  <span className="ml-2 text-xs opacity-70">Soon</span>
</Button>

// Phase 3 should enable and route to:
<Button 
  className="flex-1 bg-primary hover:bg-primary-glow"
  onClick={() => navigate(`/curriculum/${subject.subject_name}?chapter=${subject.current_chapter_number || 1}`)}
>
  Continue Learning
</Button>
```

**Quick Actions Panel** (`src/components/dashboard/QuickActionsPanel.tsx`)
```typescript
// These actions are placeholders for Phase 3:
- Browse Curriculum → navigate('/subjects')
- Continue Learning → navigate to last accessed chapter
- Start a Quiz → navigate to quiz page
- Global Search → navigate('/search?q=${query}')
```

### 2. Database Schema

**user_progress Table** (already created)
```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject_name TEXT NOT NULL,
  current_chapter TEXT,
  current_chapter_number INTEGER,
  chapters_completed INTEGER DEFAULT 0,
  total_chapters INTEGER,
  progress_percentage NUMERIC DEFAULT 0.00,
  last_accessed TIMESTAMP DEFAULT NOW(),
  next_topic TEXT,
  average_quiz_score NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users can view own progress"
ON user_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON user_progress FOR UPDATE
USING (auth.uid() = user_id);
```

**Phase 3 Update Pattern:**
```typescript
// When student accesses a chapter
const updateProgress = async (userId: string, subjectName: string, chapterNumber: number) => {
  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      subject_name: subjectName,
      current_chapter_number: chapterNumber,
      last_accessed: new Date().toISOString()
    }, { 
      onConflict: 'user_id,subject_name',
      ignoreDuplicates: false 
    });
};

// When student completes a chapter
const completeChapter = async (userId: string, subjectName: string) => {
  const { data: current } = await supabase
    .from('user_progress')
    .select('chapters_completed, total_chapters')
    .eq('user_id', userId)
    .eq('subject_name', subjectName)
    .single();

  const newCompleted = (current?.chapters_completed || 0) + 1;
  const progressPct = (newCompleted / (current?.total_chapters || 1)) * 100;

  await supabase
    .from('user_progress')
    .update({
      chapters_completed: newCompleted,
      progress_percentage: progressPct,
      current_chapter_number: (current?.current_chapter_number || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('subject_name', subjectName);
};
```

### 3. Navigation Structure

**Mobile Bottom Nav** (`src/components/dashboard/MobileBottomNav.tsx`)
```typescript
const navItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
  { id: 'subjects', icon: BookOpen, label: 'Subjects', path: '/subjects' }, // Phase 3 route
  { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
];
```

**Desktop Top Nav** (`src/components/dashboard/DashboardLayout.tsx`)
```typescript
// Navigation links in desktop header
{navigationItems.slice(0, 3).map((item) => (
  <button onClick={() => handleNavigation(item.href)}>
    {item.name}
  </button>
))}

// Currently shows: Dashboard, My Subjects, AI Tutor
// "My Subjects" should route to /subjects in Phase 3
```

### 4. Design System

**Color Scheme** (from `src/index.css`)
```css
/* Primary: Forest Green */
--primary: 153 64% 15%;
--primary-glow: 153 54% 25%;

/* Secondary: Gold */
--secondary: 43 74% 53%;

/* Subject Colors */
--subject-math: 217 91% 60%;      /* Blue */
--subject-physics: 271 81% 56%;   /* Purple */
--subject-biology: 142 71% 45%;   /* Green */
--subject-english: 0 84% 60%;     /* Red */
--subject-afrikaans: 25 95% 53%;  /* Orange */
--subject-history: 25 83% 29%;    /* Brown */
--subject-geography: 173 80% 40%; /* Teal */
--subject-business: 43 74% 53%;   /* Gold */
```

**Typography:**
- Headings: `font-family: 'Playfair Display', serif`
- Body: `font-family: 'Inter', sans-serif`

**Component Patterns:**
```typescript
// Card with subject color strip
<Card className="relative overflow-hidden">
  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-subject-math to-subject-math/80" />
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>

// Progress indicator
<ProgressRing progress={75} size={80} strokeWidth={6} />

// Premium feature lock
{!isPremium && (
  <Badge className="absolute top-2 right-2">
    <Lock className="h-3 w-3 mr-1" />
    Premium
  </Badge>
)}
```

---

## 🏗️ Phase 3 Architecture

### Required Routes

```typescript
// src/App.tsx additions
<Route path="/subjects" element={<SubjectBrowser />} />
<Route path="/curriculum/:subjectName" element={<CurriculumOverview />} />
<Route path="/curriculum/:subjectName/:chapterNumber" element={<ChapterContent />} />
<Route path="/search" element={<SearchResults />} />
```

### Proposed File Structure

```
src/
├── pages/
│   ├── SubjectBrowser.tsx       # Browse all subjects
│   ├── CurriculumOverview.tsx   # Subject overview with chapters
│   ├── ChapterContent.tsx       # Individual chapter content
│   └── SearchResults.tsx        # Search results page
│
├── components/
│   └── curriculum/
│       ├── SubjectCard.tsx          # Subject selection card
│       ├── ChapterList.tsx          # List of chapters
│       ├── ChapterNavigation.tsx    # Prev/Next chapter navigation
│       ├── ContentRenderer.tsx      # Renders chapter content
│       ├── ProgressTracker.tsx      # Updates progress as user reads
│       ├── Breadcrumbs.tsx          # Navigation breadcrumbs
│       └── TableOfContents.tsx      # Sticky TOC sidebar
│
├── hooks/
│   ├── useCurriculumData.tsx    # Fetch curriculum content
│   └── useProgressTracking.tsx  # Track and update progress
│
└── lib/
    ├── curriculum-helpers.ts    # Utility functions
    └── search-helpers.ts        # Search logic
```

### Data Flow

```
1. User clicks "Continue Learning" on dashboard
   ↓
2. Navigate to /curriculum/Mathematics?chapter=5
   ↓
3. ChapterContent component loads
   ↓
4. useProgressTracking hook updates last_accessed
   ↓
5. Content renders with navigation
   ↓
6. User marks chapter complete
   ↓
7. Update user_progress (chapters_completed++, progress_percentage++)
   ↓
8. Show completion celebration
   ↓
9. Offer to navigate to next chapter
```

---

## 📐 Implementation Patterns

### 1. Curriculum Content Storage

**Option A: Database Tables** (Recommended for Phase 3)
```sql
CREATE TABLE curriculum_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name TEXT NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL,
  description TEXT,
  total_chapters INTEGER NOT NULL,
  icon_name TEXT,
  color_scheme TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE curriculum_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES curriculum_subjects(id),
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT NOT NULL,
  chapter_description TEXT,
  content_markdown TEXT,
  estimated_duration_minutes INTEGER,
  learning_outcomes TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_id, chapter_number)
);

CREATE TABLE curriculum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES curriculum_chapters(id),
  topic_number INTEGER NOT NULL,
  topic_title TEXT NOT NULL,
  content_markdown TEXT,
  examples JSONB,
  practice_questions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS: All curriculum content is readable by authenticated users
CREATE POLICY "Anyone can view curriculum"
ON curriculum_subjects FOR SELECT
TO authenticated USING (true);
```

**Option B: Static JSON Files** (Quick start)
```typescript
// src/data/curriculum/mathematics.json
{
  "subjectName": "Mathematics",
  "gradeLevel": 10,
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Algebraic Expressions",
      "description": "Learn to simplify and evaluate algebraic expressions",
      "topics": [
        {
          "topicNumber": 1,
          "title": "Introduction to Algebra",
          "content": "Markdown content here...",
          "examples": [...],
          "practiceQuestions": [...]
        }
      ]
    }
  ]
}
```

### 2. Progress Tracking Hook

```typescript
// src/hooks/useProgressTracking.tsx
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useProgressTracking = (
  subjectName: string,
  chapterNumber: number
) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Update last accessed
    const updateLastAccessed = async () => {
      await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          subject_name: subjectName,
          current_chapter_number: chapterNumber,
          last_accessed: new Date().toISOString()
        }, { 
          onConflict: 'user_id,subject_name' 
        });
    };

    updateLastAccessed();
  }, [user, subjectName, chapterNumber]);

  const markChapterComplete = async () => {
    if (!user) return;

    const { data: current } = await supabase
      .from('user_progress')
      .select('chapters_completed, total_chapters, current_chapter_number')
      .eq('user_id', user.id)
      .eq('subject_name', subjectName)
      .single();

    const newCompleted = (current?.chapters_completed || 0) + 1;
    const totalChapters = current?.total_chapters || 1;
    const progress = (newCompleted / totalChapters) * 100;

    await supabase
      .from('user_progress')
      .update({
        chapters_completed: newCompleted,
        progress_percentage: progress,
        current_chapter_number: chapterNumber + 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('subject_name', subjectName);

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      activity_type: 'chapter_completed',
      subject_name: subjectName,
      activity_description: `Completed Chapter ${chapterNumber}`,
      metadata: { chapterNumber, progress }
    });
  };

  return { markChapterComplete };
};
```

### 3. Chapter Navigation Component

```typescript
// src/components/curriculum/ChapterNavigation.tsx
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChapterNavigationProps {
  subjectName: string;
  currentChapter: number;
  totalChapters: number;
  isCompleted: boolean;
  onMarkComplete: () => Promise<void>;
}

export const ChapterNavigation = ({
  subjectName,
  currentChapter,
  totalChapters,
  isCompleted,
  onMarkComplete,
}: ChapterNavigationProps) => {
  const navigate = useNavigate();
  const hasPrevious = currentChapter > 1;
  const hasNext = currentChapter < totalChapters;

  return (
    <div className="flex items-center justify-between border-t pt-6 mt-8">
      <Button
        variant="outline"
        disabled={!hasPrevious}
        onClick={() => navigate(`/curriculum/${subjectName}/${currentChapter - 1}`)}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Previous Chapter
      </Button>

      {!isCompleted && (
        <Button
          onClick={onMarkComplete}
          className="bg-secondary hover:bg-secondary/90"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Mark as Complete
        </Button>
      )}

      <Button
        disabled={!hasNext}
        onClick={() => navigate(`/curriculum/${subjectName}/${currentChapter + 1}`)}
      >
        Next Chapter
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
};
```

---

## 🔍 Search Implementation

### Search Strategy

```typescript
// src/lib/search-helpers.ts
interface SearchResult {
  type: 'chapter' | 'topic';
  subjectName: string;
  chapterNumber: number;
  title: string;
  excerpt: string;
  relevanceScore: number;
}

export const searchCurriculum = async (query: string): Promise<SearchResult[]> => {
  // Option 1: Database full-text search
  const { data } = await supabase
    .from('curriculum_chapters')
    .select(`
      chapter_number,
      chapter_title,
      chapter_description,
      content_markdown,
      subject:curriculum_subjects(subject_name)
    `)
    .textSearch('content_markdown', query, { 
      type: 'websearch', 
      config: 'english' 
    })
    .limit(20);

  // Option 2: Client-side search (if using JSON files)
  // Filter and rank results by relevance
  
  return results;
};
```

### Search Results Page

```typescript
// src/pages/SearchResults.tsx
export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      const data = await searchCurriculum(query);
      setResults(data);
      setLoading(false);
    };

    if (query) fetchResults();
  }, [query]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Search Results for "{query}"
          </h1>
          <p className="text-muted-foreground">
            Found {results.length} results
          </p>
        </div>

        {loading ? (
          <ListSkeleton items={5} />
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <SearchResultCard key={result.id} result={result} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
```

---

## 🎨 UI Components

### Subject Browser

```typescript
// src/pages/SubjectBrowser.tsx
export default function SubjectBrowser() {
  const { userProfile } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">
            Browse Subjects
          </h1>
          <p className="text-muted-foreground">
            Explore all Grade {userProfile?.grade_level} subjects
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onClick={() => navigate(`/curriculum/${subject.name}`)}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
```

### Breadcrumbs

```typescript
// src/components/curriculum/Breadcrumbs.tsx
export const Breadcrumbs = ({ 
  items 
}: { 
  items: { label: string; href: string }[] 
}) => {
  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
          <Link 
            to={item.href}
            className="hover:text-foreground transition-colors"
          >
            {item.label}
          </Link>
        </div>
      ))}
    </nav>
  );
};

// Usage in ChapterContent.tsx
<Breadcrumbs 
  items={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Subjects', href: '/subjects' },
    { label: subjectName, href: `/curriculum/${subjectName}` },
    { label: `Chapter ${chapterNumber}`, href: '#' }
  ]}
/>
```

---

## 🔒 Access Control

### Feature Gating Pattern (from Phase 2)

```typescript
// Free users: All curriculum access
// Premium users: Additional analytics, AI explanations

import { useSubscription } from '@/hooks/useSubscription';

const { isPremium } = useSubscription();

// In chapter content
{isPremium && (
  <Card className="bg-secondary/10 border-secondary">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-secondary" />
        AI Explanation (Premium)
      </CardTitle>
    </CardHeader>
    <CardContent>
      {/* AI-generated explanation of concept */}
    </CardContent>
  </Card>
)}
```

---

## 📊 Analytics & Tracking

### Activity Logging

```typescript
// Log when student accesses content
await supabase.from('activity_log').insert({
  user_id: userId,
  activity_type: 'chapter_accessed',
  subject_name: subjectName,
  activity_description: `Accessed ${chapterTitle}`,
  metadata: {
    chapterNumber,
    duration: readingTime
  }
});

// Log when student completes chapter
await supabase.from('activity_log').insert({
  user_id: userId,
  activity_type: 'chapter_completed',
  subject_name: subjectName,
  activity_description: `Completed ${chapterTitle}`,
  metadata: {
    chapterNumber,
    completionTime: new Date().toISOString()
  }
});
```

---

## ⚠️ Important Considerations

### 1. Content Loading Strategy
- **Lazy load** chapters as user navigates (don't load all at once)
- Use **React.lazy()** for code splitting
- Implement **loading skeletons** for smooth UX

### 2. Offline Support (Future)
- Consider PWA implementation
- Cache recently accessed chapters
- Show offline indicator

### 3. Performance
- Aim for <2s chapter load time
- Optimize images and assets
- Use pagination for long chapters

### 4. Mobile Experience
- Ensure readable text size (16px minimum)
- Optimize touch targets (44px minimum)
- Test scrolling performance

---

## ✅ Phase 3 Success Checklist

Before marking Phase 3 complete, verify:

- [ ] Subject browser displays all grade-appropriate subjects
- [ ] Subject cards on dashboard link to curriculum
- [ ] Chapter navigation works (prev/next buttons)
- [ ] Progress updates when accessing/completing chapters
- [ ] Search returns relevant results
- [ ] Breadcrumbs work throughout navigation
- [ ] Table of contents sticky sidebar works
- [ ] Mobile experience is smooth
- [ ] Loading states implemented
- [ ] Error handling for missing content
- [ ] Activity logging works
- [ ] Design matches Phase 2 styling
- [ ] Accessibility standards maintained
- [ ] Performance targets met (<2s load)

---

## 🚀 Quick Start Commands

```bash
# 1. Create Phase 3 routes in App.tsx
# 2. Create curriculum components directory
mkdir -p src/components/curriculum

# 3. Create curriculum pages directory
mkdir -p src/pages

# 4. Create curriculum data directory (if using JSON)
mkdir -p src/data/curriculum

# 5. Run development server and test routes
npm run dev
```

---

## 📚 Resources

- **Phase 2 Components:** Reuse SubjectGrid, ProgressRing, EmptyState patterns
- **Design Tokens:** See `src/index.css` for color variables
- **Database Schema:** Check Supabase dashboard for table structures
- **Auth Context:** Use `useAuth()` hook for user data
- **Subscription Check:** Use `useSubscription()` for premium features

---

*This guide provides everything needed to build Phase 3 on top of Phase 2's solid foundation.*
*Follow the patterns established in Phase 2 for consistency.*

---

**Ready to Start Phase 3? 🎉**
