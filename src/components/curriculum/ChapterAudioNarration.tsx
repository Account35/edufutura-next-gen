import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, Square, Volume2 } from 'lucide-react';

interface ChapterAudioNarrationProps {
  /** The same existing text field used in Reading/Writing mode. */
  content: string | null | undefined;
  chapterTitle: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

/** Strips markdown/HTML so the narration reads naturally. */
const toPlainText = (markdown: string) =>
  markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`|~-]{1,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Auditory learning style: narrates the chapter's existing text content
 * using the browser's speech synthesis. No new content field is used.
 */
export const ChapterAudioNarration = ({ content, chapterTitle }: ChapterAudioNarrationProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const text = useMemo(() => (content ? toPlainText(content) : ''), [content]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsPlaying(false);
    setIsPaused(false);
  }, [supported]);

  // Stop narration when the chapter content changes or the pane unmounts
  useEffect(() => stop, [stop, text]);

  const speak = useCallback(
    (rate: number) => {
      if (!supported || !text) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${chapterTitle}. ${text}`);
      utterance.rate = rate;
      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
      setIsPaused(false);
    },
    [chapterTitle, supported, text]
  );

  const handlePlayPause = () => {
    if (!supported) return;
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }
    if (isPlaying && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }
    speak(speed);
  };

  const handleSpeedChange = (rate: number) => {
    setSpeed(rate);
    if (isPlaying) speak(rate);
  };

  if (!text) {
    return (
      <div className="not-prose mb-6 rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center">
        <Volume2 className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-foreground">Nothing to narrate yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This chapter has no written content to read aloud.
        </p>
      </div>
    );
  }

  return (
    <div className="not-prose mb-6 rounded-2xl border border-border bg-muted/10 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Volume2 className="h-5 w-5 text-secondary" aria-hidden="true" />
        <div className="flex-1 min-w-[10rem]">
          <p className="text-sm font-semibold text-foreground">Listen to this chapter</p>
          <p className="text-xs text-muted-foreground">
            {supported
              ? 'Narration of the chapter text below.'
              : 'Your browser does not support audio narration.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handlePlayPause} disabled={!supported}>
            {isPlaying && !isPaused ? (
              <>
                <Pause className="mr-1.5 h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-4 w-4" /> {isPaused ? 'Resume' : 'Play'}
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={stop} disabled={!supported || !isPlaying}>
            <Square className="mr-1.5 h-4 w-4" /> Stop
          </Button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Speed</span>
        {SPEEDS.map((rate) => (
          <Button
            key={rate}
            size="sm"
            variant={speed === rate ? 'secondary' : 'ghost'}
            onClick={() => handleSpeedChange(rate)}
            disabled={!supported}
            className="h-7 px-2 text-xs"
          >
            {rate}x
          </Button>
        ))}
      </div>
    </div>
  );
};
