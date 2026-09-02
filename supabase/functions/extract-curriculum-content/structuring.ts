// Structuring step: runs AFTER extraction (AI or local) and BEFORE the result
// is returned to the admin import wizard.
//
// It does not introduce any new hierarchy level or schema field. It maps onto
// the existing Phase 1 shape only:
//   curriculum_chapters row  = module
//   markdown headings inside content_markdown = topics within that module
//
// Everything below normalizes raw/AI text into clearly headed, sectioned
// topic modules using the fields that already exist on the chapter payload.

export interface StructuredChapter {
  chapter_number: number;
  chapter_title: string;
  chapter_description: string;
  content_markdown: string;
  difficulty_level?: string;
  estimated_duration_minutes?: number;
  caps_code?: string;
  key_concepts?: string[];
}

const MAX_TOPIC_CHARS = 2600;
const MIN_CHAPTER_CHARS = 200;

function cleanInline(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function titleCaseIfShouting(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  if (letters.length > 2 && letters === letters.toUpperCase()) {
    return trimmed.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }
  return trimmed;
}

function cleanHeading(value: string): string {
  return titleCaseIfShouting(
    cleanInline(value)
      .replace(/^#{1,6}\s*/, '')
      .replace(/[:.\s\-–—]+$/, '')
      .replace(/^[•*\-–—]\s*/, '')
  ).slice(0, 110);
}

/** Lines that read like a topic heading in raw curriculum text. */
function looksLikeHeading(line: string): boolean {
  const text = line.trim();
  if (!text || text.length > 110) return false;
  if (/^#{1,6}\s+\S/.test(text)) return true;
  if (/^(?:topic|section|unit|lesson|module|part|chapter)\s+\d+[a-z]?\b/i.test(text)) return true;
  if (/^\d+(?:\.\d+){0,3}[).:]?\s+[A-Za-z][^.!?]*$/.test(text) && text.length <= 90) return true;
  // Short, sentence-free, title-ish line (e.g. "PHOTOSYNTHESIS" or "Balancing Equations")
  if (!/[.!?;]$/.test(text) && text.split(/\s+/).length <= 10) {
    const letters = text.replace(/[^A-Za-z]/g, '');
    if (letters.length >= 3 && (letters === letters.toUpperCase() || /^[A-Z]/.test(text))) {
      return !/^[a-z]/.test(text);
    }
  }
  return false;
}

interface Topic {
  heading: string;
  body: string;
}

/** Split a chapter's markdown into topic sections with explicit headings. */
function splitIntoTopics(markdown: string, fallbackTitle: string): Topic[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const topics: Topic[] = [];
  let currentHeading = '';
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join('\n').trim();
    if (!currentHeading && !body) return;
    topics.push({ heading: currentHeading, body });
    buffer = [];
  };

  for (const line of lines) {
    if (looksLikeHeading(line)) {
      flush();
      currentHeading = cleanHeading(line);
    } else {
      buffer.push(line);
    }
  }
  flush();

  // No headings detected at all -> derive sections from paragraph groups.
  const hasHeadings = topics.some((t) => t.heading);
  if (!hasHeadings) {
    const whole = markdown.trim();
    if (!whole) return [{ heading: cleanHeading(fallbackTitle) || 'Overview', body: '' }];
    return chunkByParagraph(whole).map((body, index, all) => ({
      heading: all.length === 1
        ? cleanHeading(fallbackTitle) || 'Overview'
        : deriveHeading(body, index + 1),
      body,
    }));
  }

  // Content before the first heading becomes an "Overview" topic.
  const normalized: Topic[] = [];
  for (const topic of topics) {
    if (!topic.heading) {
      if (topic.body) normalized.push({ heading: 'Overview', body: topic.body });
      continue;
    }
    normalized.push(topic);
  }

  // Split any oversized topic so sections stay readable.
  const sized: Topic[] = [];
  for (const topic of normalized) {
    if (topic.body.length <= MAX_TOPIC_CHARS) {
      sized.push(topic);
      continue;
    }
    const parts = chunkByParagraph(topic.body);
    parts.forEach((body, index) => {
      sized.push({
        heading: index === 0 ? topic.heading : `${topic.heading} (continued ${index + 1})`,
        body,
      });
    });
  }

  return sized.filter((topic) => topic.heading || topic.body);
}

function chunkByParagraph(text: string, maxChars = MAX_TOPIC_CHARS): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > maxChars) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text.trim()];
}

function deriveHeading(body: string, index: number): string {
  const firstSentence = cleanInline(body).split(/(?<=[.!?])\s/)[0] || '';
  const words = firstSentence.split(/\s+/).slice(0, 7).join(' ').replace(/[,;:.]+$/, '');
  return words ? titleCaseIfShouting(words).slice(0, 90) : `Section ${index}`;
}

function buildMarkdown(chapterTitle: string, topics: Topic[]): string {
  const parts: string[] = [`# ${chapterTitle}`];
  for (const topic of topics) {
    const heading = topic.heading || 'Overview';
    const duplicatesTitle =
      topics.length === 1 && heading.toLowerCase() === chapterTitle.toLowerCase();
    if (!duplicatesTitle) parts.push(`## ${heading}`);

    if (topic.body.trim()) parts.push(topic.body.trim());
  }
  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

function estimateDuration(text: string, existing?: number): number {
  if (typeof existing === 'number' && existing >= 5 && existing <= 240) return existing;
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.round((words / 180) * 5) * 5; // ~180 wpm study pace, rounded to 5
  return Math.max(15, Math.min(120, minutes || 20));
}

function normalizeDifficulty(value?: string): string {
  const v = (value || '').toLowerCase();
  if (v.startsWith('beg') || v.startsWith('easy')) return 'Beginner';
  if (v.startsWith('adv') || v.startsWith('hard')) return 'Advanced';
  return 'Intermediate';
}

function buildDescription(existing: string | undefined, topics: Topic[]): string {
  const current = cleanInline(existing || '');
  if (current.length >= 40) return current.slice(0, 300);
  const firstBody = topics.map((t) => t.body).find((b) => b.trim());
  if (firstBody) {
    const sentence = cleanInline(firstBody).split(/(?<=[.!?])\s/).slice(0, 2).join(' ');
    if (sentence.length >= 40) return sentence.slice(0, 300);
  }
  const headings = topics.map((t) => t.heading).filter(Boolean).slice(0, 4);
  if (headings.length) return `Covers ${headings.join(', ')}.`.slice(0, 300);
  return current || 'Imported curriculum content.';
}

/**
 * Structure extracted chapters into clearly headed, sectioned topic modules.
 * Pure transformation over the existing chapter fields — no new fields added.
 */
export function structureChapters(rawChapters: unknown): StructuredChapter[] {
  const input = Array.isArray(rawChapters) ? rawChapters : [];
  const staged: StructuredChapter[] = [];

  for (const item of input) {
    const chapter = (item || {}) as Record<string, unknown>;
    const rawContent = typeof chapter.content_markdown === 'string' ? chapter.content_markdown : '';
    const rawTitle = typeof chapter.chapter_title === 'string' ? chapter.chapter_title : '';
    const title = cleanHeading(rawTitle) || `Module ${staged.length + 1}`;

    const topics = splitIntoTopics(rawContent, title);
    const content = buildMarkdown(title, topics);
    const headings = topics.map((t) => t.heading).filter(Boolean);

    const existingConcepts = Array.isArray(chapter.key_concepts)
      ? (chapter.key_concepts as unknown[]).filter((c): c is string => typeof c === 'string' && !!c.trim())
      : [];
    const concepts = (existingConcepts.length > 0 ? existingConcepts : headings)
      .map((c) => cleanInline(c))
      .filter((c, i, arr) => c && arr.indexOf(c) === i)
      .slice(0, 8);

    staged.push({
      chapter_number: 0,
      chapter_title: title,
      chapter_description: buildDescription(
        typeof chapter.chapter_description === 'string' ? chapter.chapter_description : '',
        topics,
      ),
      content_markdown: content,
      difficulty_level: normalizeDifficulty(
        typeof chapter.difficulty_level === 'string' ? chapter.difficulty_level : undefined,
      ),
      estimated_duration_minutes: estimateDuration(
        content,
        typeof chapter.estimated_duration_minutes === 'number' ? chapter.estimated_duration_minutes : undefined,
      ),
      caps_code: typeof chapter.caps_code === 'string' ? chapter.caps_code.trim() : '',
      key_concepts: concepts,
    });
  }

  // Merge fragments that are too small to stand alone as a module.
  const merged: StructuredChapter[] = [];
  for (const chapter of staged) {
    const previous = merged[merged.length - 1];
    if (previous && chapter.content_markdown.length < MIN_CHAPTER_CHARS) {
      previous.content_markdown = `${previous.content_markdown}\n\n${chapter.content_markdown
        .replace(/^#\s+.*\n?/, `## ${chapter.chapter_title}\n`)
        .trim()}`;
      previous.estimated_duration_minutes = estimateDuration(previous.content_markdown);
      previous.key_concepts = [
        ...new Set([...(previous.key_concepts || []), ...(chapter.key_concepts || [])]),
      ].slice(0, 8);
      continue;
    }
    merged.push(chapter);
  }

  // Deduplicate by title and renumber sequentially.
  const seen = new Set<string>();
  const result: StructuredChapter[] = [];
  for (const chapter of merged) {
    const key = chapter.chapter_title.toLowerCase();
    if (seen.has(key)) {
      const existing = result.find((c) => c.chapter_title.toLowerCase() === key);
      if (existing) {
        existing.content_markdown = `${existing.content_markdown}\n\n${chapter.content_markdown
          .replace(/^#\s+.*\n?/, '')
          .trim()}`;
      }
      continue;
    }
    seen.add(key);
    result.push(chapter);
  }

  result.forEach((chapter, index) => {
    chapter.chapter_number = index + 1;
  });

  return result;
}
