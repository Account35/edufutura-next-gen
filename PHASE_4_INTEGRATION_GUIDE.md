# Phase 4: AI Study Assistant - Integration Guide

## Overview
Phase 4 will build an AI-powered study assistant for personalized tutoring, explanations, and learning support. This document outlines all integration points prepared in Phase 3.

## Database Schema (Already Created)

### AI Conversations Table
```sql
ai_conversations (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  subject_name text,
  chapter_id uuid REFERENCES curriculum_chapters(id),
  started_at timestamp,
  last_message_at timestamp,
  message_count integer DEFAULT 0,
  created_at timestamp
)
```

### AI Messages Table
```sql
ai_messages (
  id uuid PRIMARY KEY,
  conversation_id uuid REFERENCES ai_conversations(id),
  role text CHECK (role IN ('user', 'assistant', 'system')),
  message_text text NOT NULL,
  tokens_used integer DEFAULT 0,
  created_at timestamp
)
```

### AI Feedback Table
```sql
ai_feedback (
  id uuid PRIMARY KEY,
  message_id uuid REFERENCES ai_messages(id),
  user_id uuid REFERENCES auth.users(id),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback_text text,
  created_at timestamp
)
```

## Chapter Context Exposure

### Current Implementation
Chapter content pages expose the following context through component state:
- `chapter.id` - Current chapter UUID
- `subjectName` - Subject name from URL params
- `chapter.chapter_title` - Chapter title
- `chapter.content_markdown` - Full chapter content
- `chapter.key_concepts` - Array of key concepts
- `chapter.glossary_terms` - JSONB of glossary terms
- `chapter.learning_outcomes` - Array of learning objectives

### Phase 4 Usage
Create a React Context Provider to expose this data:

```typescript
// src/contexts/ChapterContext.tsx
export const ChapterContext = createContext<{
  chapterId: string | null;
  subjectName: string | null;
  chapterTitle: string | null;
  content: string | null;
  keyConcepts: string[];
  glossaryTerms: Record<string, string>;
}>({
  chapterId: null,
  subjectName: null,
  chapterTitle: null,
  content: null,
  keyConcepts: [],
  glossaryTerms: {}
});
```

## AI Assistant UI Locations

### Desktop (1024px+)
- **Floating Button**: Bottom-right corner (24px from bottom, 24px from right)
- **Chat Panel**: Slide-in from right (400px width)
- **Icon**: MessageCircle from lucide-react
- **z-index**: 40 (below modals, above content)

### Mobile (<1024px)
- **Toolbar Button**: Add to bottom mobile toolbar (replace or add 5th button)
- **Full-Screen Modal**: Overlay entire screen
- **Back Button**: Top-left to close
- **Input**: Fixed at bottom with send button

## Navigation Integration

### Dashboard Quick Actions
The "Talk to AI tutor" quick action in Dashboard currently shows a "Coming soon" placeholder. Phase 4 should:
1. Remove the placeholder logic
2. Navigate to `/ai-tutor` route OR open AI chat modal
3. Pass current subject context if user came from a subject page

```typescript
// Current placeholder (src/pages/Dashboard.tsx)
{
  icon: <MessageSquare className="h-6 w-6" />,
  label: "Talk to AI tutor",
  onClick: () => toast.info("AI tutor coming in Phase 4!"),
  badge: "Premium"
}

// Phase 4 implementation
{
  icon: <MessageSquare className="h-6 w-6" />,
  label: "Talk to AI tutor",
  onClick: () => {
    if (accountType === 'premium') {
      navigate('/ai-tutor'); // OR openAIModal()
    } else {
      showUpgradeModal();
    }
  },
  badge: "Premium"
}
```

### Chapter Content Page
Add AI help button near key concepts or difficult sections:

```typescript
// Position after learning outcomes, before main content
{accountType === 'premium' ? (
  <Button onClick={() => openAIChat(chapter.id)}>
    <Sparkles className="mr-2 h-4 w-4" />
    Ask AI Tutor
  </Button>
) : (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" disabled>
          <Sparkles className="mr-2 h-4 w-4" />
          Ask AI Tutor
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Premium feature - Upgrade to unlock AI tutor</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

## Progress Data for AI Personalization

### User Chapter Progress
Query `user_chapter_progress` to identify struggling areas:

```typescript
// Identify struggling chapters
const strugglingChapters = await supabase
  .from('user_chapter_progress')
  .select('*, curriculum_chapters(chapter_title)')
  .eq('user_id', userId)
  .or('progress_percentage.lt.50,time_spent_minutes.gte.estimated_duration_minutes');
```

### Incomplete Prerequisites
Check prerequisite gaps suggesting foundational weaknesses:

```typescript
// Find prerequisite gaps
const incompletePrereqs = await supabase
  .from('chapter_prerequisites')
  .select(`
    prerequisite_chapter_id,
    curriculum_chapters!prerequisite_chapter_id(chapter_title),
    user_chapter_progress!prerequisite_chapter_id(status)
  `)
  .eq('chapter_id', currentChapterId)
  .neq('user_chapter_progress.status', 'completed');
```

### Low Quiz Scores
Use `average_quiz_score` from `user_progress` (populated in Phase 5):

```typescript
// Find weak subjects
const weakSubjects = await supabase
  .from('user_progress')
  .select('subject_name, average_quiz_score')
  .eq('user_id', userId)
  .lt('average_quiz_score', 60);
```

## AI Response Guidelines

### Use Curriculum Terminology
Always reference `key_concepts` and `glossary_terms` from chapters table:

```typescript
const generateResponse = async (userQuestion: string, chapterId: string) => {
  // Fetch chapter context
  const { data: chapter } = await supabase
    .from('curriculum_chapters')
    .select('key_concepts, glossary_terms')
    .eq('id', chapterId)
    .single();

  // Include in AI prompt
  const systemPrompt = `
    You are an AI tutor for South African CAPS curriculum.
    Current chapter key concepts: ${chapter.key_concepts.join(', ')}
    Use these exact terms when explaining concepts.
    Glossary: ${JSON.stringify(chapter.glossary_terms)}
  `;
};
```

### Learning Style Adaptation
Use `study_preferences.learning_style` to personalize responses:

```typescript
const userPrefs = await supabase
  .from('study_preferences')
  .select('learning_style, study_pace')
  .eq('user_id', userId)
  .single();

// Adjust AI responses
if (userPrefs.learning_style === 'visual') {
  systemPrompt += "Suggest diagrams and visual explanations.";
} else if (userPrefs.learning_style === 'kinesthetic') {
  systemPrompt += "Suggest hands-on activities and practical examples.";
}
```

## Premium Feature Gating

### Check Subscription Status
```typescript
const { data: user } = await supabase
  .from('users')
  .select('account_type, subscription_status')
  .eq('id', userId)
  .single();

const hasAIAccess = 
  user.account_type === 'premium' && 
  user.subscription_status === 'active';
```

### Rate Limiting
Implement usage limits for AI calls:
- Free tier: 0 AI questions per day (completely locked)
- Premium tier: Unlimited AI questions
- Track in `ai_conversations` table message_count

## Expected AI Interaction Patterns

### Question Answering
```
User: "What is photosynthesis?"
AI: [Explains using chapter's key concepts and glossary terms]
```

### Concept Explanation
```
User: "I don't understand cellular respiration"
AI: [Breaks down concept, references chapter sections, suggests practice problems]
```

### Practice Problem Generation
```
User: "Give me practice problems on algebra"
AI: [Generates problems based on current chapter difficulty level]
```

### Study Schedule Creation
```
User: "Help me plan my study time"
AI: [Uses study_preferences daily_goal_minutes and weekly_goal_hours]
```

### Motivational Support
```
User: "I'm struggling with this subject"
AI: [Encourages, suggests starting with easier prerequisite chapters]
```

## Integration with Lovable AI Gateway

### Edge Function Setup
Create `/supabase/functions/ai-tutor/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { messages, chapterId } = await req.json();
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  // Fetch chapter context for system prompt
  // Call Lovable AI Gateway
  // Stream response back to client

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      stream: true
    })
  });

  return new Response(response.body, {
    headers: { "Content-Type": "text/event-stream" }
  });
});
```

## Success Metrics to Track

1. **AI Conversations Started**: Count of `ai_conversations` records
2. **Messages Exchanged**: Sum of `message_count` across conversations
3. **User Ratings**: Average of `ai_feedback.rating`
4. **Improvement Correlation**: Compare quiz scores before/after AI tutoring
5. **Struggling Student Engagement**: % of low-performing students using AI

## Testing Checklist

- [ ] AI chat opens from dashboard quick action
- [ ] AI help button appears on chapter pages (premium only)
- [ ] Free users see upgrade prompt
- [ ] Chapter context correctly passed to AI
- [ ] AI responses use curriculum terminology
- [ ] Conversation history persists across sessions
- [ ] Mobile UI works on small screens
- [ ] Streaming responses display progressively
- [ ] Rate limiting enforces premium boundaries
- [ ] Feedback system captures user ratings

## Security Considerations

1. **RLS Policies**: Already implemented - users can only access their own conversations
2. **API Key Security**: LOVABLE_API_KEY stored in Supabase secrets
3. **Content Filtering**: Implement content moderation on user input
4. **Token Usage Tracking**: Monitor `tokens_used` to prevent abuse
5. **Premium Verification**: Always verify subscription server-side

---

**Note**: This is preparation documentation. Phase 4 implementation will build on these integration points. Do not implement AI functionality until explicitly tasked in Phase 4.
