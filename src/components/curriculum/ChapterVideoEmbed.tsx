import { useMemo } from 'react';
import { VideoOff } from 'lucide-react';

interface ChapterVideoEmbedProps {
  videoUrl?: string | null;
  chapterTitle: string;
}

/**
 * Builds a privacy/branding-friendly embed URL:
 * - modestbranding=1 (reduced platform branding)
 * - rel=0 / no related videos from other channels
 */
const buildEmbedUrl = (url: string): string | null => {
  const trimmed = url.trim();

  const youtube = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/,
  );
  if (youtube) {
    return `https://www.youtube-nocookie.com/embed/${youtube[1]}?modestbranding=1&rel=0&iv_load_policy=3`;
  }

  const vimeo = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return `https://player.vimeo.com/video/${vimeo[1]}?title=0&byline=0&portrait=0&dnt=1`;
  }

  return null;
};

const isDirectVideoFile = (url: string) => /\.(mp4|webm|ogg)($|\?)/i.test(url);

export const ChapterVideoEmbed = ({ videoUrl, chapterTitle }: ChapterVideoEmbedProps) => {
  const embed = useMemo(() => (videoUrl ? buildEmbedUrl(videoUrl) : null), [videoUrl]);

  if (!videoUrl || (!embed && !isDirectVideoFile(videoUrl))) {
    return (
      <div className="not-prose mb-6 rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center">
        <VideoOff className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-foreground">
          No video available for this topic
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Once a video is linked to this topic it will play here.
        </p>
      </div>
    );
  }

  return (
    <div className="not-prose mb-6 overflow-hidden rounded-2xl border border-border bg-background">
      {embed ? (
        <iframe
          src={embed}
          title={`${chapterTitle} video`}
          className="aspect-video w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <video
          src={videoUrl}
          controls
          controlsList="nodownload"
          className="aspect-video w-full bg-black"
          aria-label={`${chapterTitle} video`}
        />
      )}
    </div>
  );
};
