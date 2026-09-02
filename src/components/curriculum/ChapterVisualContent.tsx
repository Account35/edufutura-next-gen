import { useMemo } from 'react';
import { FileText, ImageOff, PlayCircle } from 'lucide-react';

interface ChapterVisualContentProps {
  contentType?: string | null;
  contentUrl?: string | null;
  thumbnailUrl?: string | null;
  contentMarkdown?: string | null;
  chapterTitle: string;
}

type MediaItem =
  | { kind: 'image'; url: string; alt: string }
  | { kind: 'video'; url: string }
  | { kind: 'pdf'; url: string };

const isVideo = (type?: string | null, url?: string | null) =>
  type === 'video' || /\.(mp4|webm|ogg)$/i.test(url || '') || /youtube\.com|youtu\.be|vimeo\.com/i.test(url || '');

const isPdf = (type?: string | null, url?: string | null) =>
  type === 'pdf' || /\.pdf($|\?)/i.test(url || '');

const isImage = (type?: string | null, url?: string | null) =>
  type === 'image' || /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(url || '');

const embedUrl = (url: string) => {
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
};

/**
 * Renders the media/diagrams already stored on a chapter.
 * Never fabricates placeholder media - shows an empty state when nothing exists.
 */
export const ChapterVisualContent = ({
  contentType,
  contentUrl,
  thumbnailUrl,
  contentMarkdown,
  chapterTitle,
}: ChapterVisualContentProps) => {
  const media = useMemo<MediaItem[]>(() => {
    const items: MediaItem[] = [];

    if (contentUrl) {
      if (isVideo(contentType, contentUrl)) items.push({ kind: 'video', url: contentUrl });
      else if (isPdf(contentType, contentUrl)) items.push({ kind: 'pdf', url: contentUrl });
      else if (isImage(contentType, contentUrl)) items.push({ kind: 'image', url: contentUrl, alt: chapterTitle });
    }

    if (thumbnailUrl) {
      items.push({ kind: 'image', url: thumbnailUrl, alt: `${chapterTitle} illustration` });
    }

    // Images/diagrams already embedded in the chapter content
    if (contentMarkdown) {
      const markdownImages = contentMarkdown.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g);
      for (const match of markdownImages) {
        items.push({ kind: 'image', url: match[2], alt: match[1] || chapterTitle });
      }
      const htmlImages = contentMarkdown.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
      for (const match of htmlImages) {
        items.push({ kind: 'image', url: match[1], alt: chapterTitle });
      }
    }

    // De-duplicate by url
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [contentType, contentUrl, thumbnailUrl, contentMarkdown, chapterTitle]);

  if (media.length === 0) {
    return (
      <div className="not-prose mb-6 rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center">
        <ImageOff className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-foreground">
          No visuals have been added to this chapter yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          The written explanation below covers the same content.
        </p>
      </div>
    );
  }

  return (
    <div className="not-prose mb-6 space-y-4">
      {media.map((item) => {
        if (item.kind === 'image') {
          return (
            <figure key={item.url} className="overflow-hidden rounded-2xl border border-border bg-background">
              <img src={item.url} alt={item.alt} loading="lazy" className="w-full object-cover" />
              {item.alt && (
                <figcaption className="px-4 py-2 text-xs text-muted-foreground">{item.alt}</figcaption>
              )}
            </figure>
          );
        }

        if (item.kind === 'video') {
          const embed = embedUrl(item.url);
          return (
            <div key={item.url} className="overflow-hidden rounded-2xl border border-border bg-background">
              {embed ? (
                <iframe
                  src={embed}
                  title={`${chapterTitle} video`}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={item.url} controls className="w-full" aria-label={`${chapterTitle} video`} />
              )}
              <p className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
                <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" /> Chapter video
              </p>
            </div>
          );
        }

        return (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 text-sm font-medium text-primary hover:bg-muted/20"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Open the chapter PDF
          </a>
        );
      })}
    </div>
  );
};
