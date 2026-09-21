// Multi-grade aggregation for the curriculum extraction pipeline.
//
// The model is called once per small page group and returns flat items:
//   { grade_level, subject, chapter_title, topic_title, key_concepts, content_markdown }
//
// This module joins those items back into grade/subject groups whose chapters
// match the existing curriculum_chapters payload shape (title + description +
// content_markdown with `# Module` / `## Topic` headings), so the existing
// structuring step and the student content pane keep working unchanged.

export interface ExtractedItem {
  grade_level: number;
  subject: string;
  chapter_title: string;
  topic_title: string;
  key_concepts: string[];
  content_markdown: string;
}

export interface AggregatedChapter {
  chapter_number: number;
  chapter_title: string;
  chapter_description: string;
  content_markdown: string;
  difficulty_level?: string;
  estimated_duration_minutes?: number;
  caps_code?: string;
  key_concepts?: string[];
}

export interface GradeGroup {
  grade_level: number;
  subject: string;
  chapters: AggregatedChapter[];
}

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function clean(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function toGrade(value: unknown): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? '').replace(/\D+/g, ''), 10);
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : 0;
}

/** Coerce whatever the model returned into well-formed items. */
export function normalizeItems(
  raw: unknown,
  fallbackGrade: number,
  fallbackSubject: string,
): ExtractedItem[] {
  const list = Array.isArray(raw) ? raw : [];
  const items: ExtractedItem[] = [];

  for (const entry of list) {
    const item = (entry || {}) as Record<string, unknown>;
    const content = typeof item.content_markdown === 'string' ? item.content_markdown.trim() : '';
    const topic = clean(item.topic_title);
    const chapter = clean(item.chapter_title) || topic || 'Imported Section';
    if (!content && !topic) continue;

    items.push({
      grade_level: toGrade(item.grade_level) || fallbackGrade,
      subject: clean(item.subject) || fallbackSubject,
      chapter_title: chapter.slice(0, 110),
      topic_title: (topic || chapter).slice(0, 110),
      key_concepts: Array.isArray(item.key_concepts)
        ? (item.key_concepts as unknown[])
            .map((c) => clean(c))
            .filter(Boolean)
            .slice(0, 8)
        : [],
      content_markdown: content,
    });
  }

  return items;
}

interface TopicBucket {
  topic_title: string;
  content: string;
}

interface ChapterBucket {
  chapter_title: string;
  topics: TopicBucket[];
  topicKeys: Set<string>;
  concepts: string[];
}

/**
 * Group items by grade + subject, then by chapter, preserving document order
 * and dropping topics repeated across a page boundary.
 */
export function aggregateItems(items: ExtractedItem[]): GradeGroup[] {
  const groups = new Map<string, { grade_level: number; subject: string; chapters: Map<string, ChapterBucket> }>();

  for (const item of items) {
    const groupKey = `${item.grade_level}|${norm(item.subject)}`;
    let group = groups.get(groupKey);
    if (!group) {
      group = { grade_level: item.grade_level, subject: item.subject, chapters: new Map() };
      groups.set(groupKey, group);
    }

    const chapterKey = norm(item.chapter_title);
    let chapter = group.chapters.get(chapterKey);
    if (!chapter) {
      chapter = {
        chapter_title: item.chapter_title,
        topics: [],
        topicKeys: new Set(),
        concepts: [],
      };
      group.chapters.set(chapterKey, chapter);
    }

    const topicKey = `${norm(item.topic_title)}::${norm(item.content_markdown).slice(0, 120)}`;
    if (chapter.topicKeys.has(topicKey)) continue;
    chapter.topicKeys.add(topicKey);
    chapter.topics.push({ topic_title: item.topic_title, content: item.content_markdown });

    for (const concept of item.key_concepts) {
      if (!chapter.concepts.some((c) => norm(c) === norm(concept))) chapter.concepts.push(concept);
    }
  }

  const result: GradeGroup[] = [];
  for (const group of groups.values()) {
    const chapters: AggregatedChapter[] = [];
    let index = 0;

    for (const chapter of group.chapters.values()) {
      index += 1;
      const parts: string[] = [`# ${chapter.chapter_title}`];
      for (const topic of chapter.topics) {
        const heading = topic.topic_title.trim();
        const duplicatesTitle =
          chapter.topics.length === 1 && norm(heading) === norm(chapter.chapter_title);
        if (heading && !duplicatesTitle) parts.push(`## ${heading}`);
        if (topic.content.trim()) parts.push(topic.content.trim());
      }

      const content = parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
      const firstBody = chapter.topics.map((t) => t.content).find((c) => c.trim()) || '';
      const description = firstBody
        ? firstBody.replace(/\s+/g, ' ').trim().slice(0, 260)
        : `Covers ${chapter.topics.map((t) => t.topic_title).filter(Boolean).slice(0, 4).join(', ')}.`;

      chapters.push({
        chapter_number: index,
        chapter_title: chapter.chapter_title,
        chapter_description: description,
        content_markdown: content,
        key_concepts: chapter.concepts.slice(0, 8),
      });
    }

    if (chapters.length > 0) {
      result.push({ grade_level: group.grade_level, subject: group.subject, chapters });
    }
  }

  // Lower grades first so nothing reads as "the main grade".
  result.sort((a, b) => a.grade_level - b.grade_level || a.subject.localeCompare(b.subject));
  return result;
}
