// Phase 7: Automated video matching.
//
// Runs AFTER the Phase 6 structuring step. For each structured chapter
// (= module/topic) we search for one matching educational video using the
// already-detected grade + subject and the chapter title, and store the
// result in the existing `video_url` reference field added in Phase 4.
//
// No schema changes, no display logic — this only populates video_url.

interface ChapterLike {
  chapter_title: string;
  video_url?: string | null;
  [key: string]: unknown;
}

const MAX_CHAPTERS_TO_MATCH = 25;
const SEARCH_TIMEOUT_MS = 8000;

function buildQuery(title: string, subject: string, grade: number): string {
  const parts = [title.trim()];
  if (subject && !/imported curriculum/i.test(subject)) parts.push(subject.trim());
  if (grade >= 4 && grade <= 12) parts.push(`grade ${grade}`);
  parts.push('lesson');
  return parts.filter(Boolean).join(' ');
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Preferred path: official YouTube Data API when a key is configured. */
async function searchViaDataApi(query: string, apiKey: string): Promise<string | null> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('safeSearch', 'strict');
  url.searchParams.set('videoEmbeddable', 'true');
  url.searchParams.set('relevanceLanguage', 'en');
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);

  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const json = await res.json();
  const id = json?.items?.[0]?.id?.videoId;
  return typeof id === 'string' && id.length === 11 ? id : null;
}

/** Fallback: parse the public YouTube results page for the first video id. */
async function searchViaResultsPage(query: string): Promise<string | null> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
  const res = await fetchWithTimeout(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`YouTube search ${res.status}`);
  const html = await res.text();
  const match = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
  return match ? match[1] : null;
}

async function findVideoForChapter(
  title: string,
  subject: string,
  grade: number,
  apiKey: string | undefined,
): Promise<string | null> {
  const query = buildQuery(title, subject, grade);
  if (!query.trim()) return null;

  if (apiKey) {
    try {
      const id = await searchViaDataApi(query, apiKey);
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    } catch (err) {
      console.warn('video match (api) failed:', (err as Error)?.message);
    }
  }

  try {
    const id = await searchViaResultsPage(query);
    if (id) return `https://www.youtube.com/watch?v=${id}`;
  } catch (err) {
    console.warn('video match (scrape) failed:', (err as Error)?.message);
  }

  return null;
}

/**
 * Attach one matching video URL per chapter. Chapters that already carry a
 * video_url are left untouched; failures leave the field empty so the Phase 4
 * "no video available" state renders.
 */
export async function attachVideosToChapters<T extends ChapterLike>(
  chapters: T[],
  subject: string,
  grade: number,
): Promise<{ chapters: T[]; matched: number }> {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return { chapters: chapters || [], matched: 0 };
  }
  const apiKey = Deno.env.get('YOUTUBE_API_KEY') || undefined;
  let matched = 0;

  const targets = chapters.slice(0, MAX_CHAPTERS_TO_MATCH);

  // Small concurrency so a large import does not stall the request.
  const CONCURRENCY = 4;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (chapter) => {
        if (chapter.video_url) return;
        const url = await findVideoForChapter(chapter.chapter_title, subject, grade, apiKey);
        if (url) {
          chapter.video_url = url;
          matched += 1;
        }
      }),
    );
  }

  return { chapters, matched };
}
