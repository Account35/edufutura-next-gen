import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Highlighter, StickyNote, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useStudyHighlights } from '@/hooks/useStudyHighlights';
import { useAuth } from '@/hooks/useAuth';

interface ChapterHighlighterProps {
  chapterId: string;
  children: ReactNode;
}

const HIGHLIGHT_CLASS = 'ef-highlight';

/** Removes previously injected highlight marks so we can re-apply cleanly. */
const clearMarks = (root: HTMLElement) => {
  root.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`).forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
    parent.normalize();
  });
};

/** Wraps every occurrence of `text` inside root with a highlight mark. */
const applyMark = (root: HTMLElement, text: string, id: string, hasNote: boolean) => {
  const needle = text.trim();
  if (needle.length < 2) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.parentElement?.closest(`mark.${HIGHLIGHT_CLASS}`)) continue;
    if (node.textContent && node.textContent.includes(needle)) targets.push(node);
  }

  targets.forEach((node) => {
    const value = node.textContent || '';
    const index = value.indexOf(needle);
    if (index === -1) return;
    const after = node.splitText(index);
    after.splitText(needle.length);
    const mark = document.createElement('mark');
    mark.className = HIGHLIGHT_CLASS;
    mark.dataset.highlightId = id;
    mark.textContent = needle;
    mark.style.backgroundColor = 'hsl(var(--primary) / 0.18)';
    mark.style.borderBottom = hasNote ? '2px solid hsl(var(--primary))' : 'none';
    mark.style.borderRadius = '2px';
    mark.style.padding = '0 2px';
    mark.style.color = 'inherit';
    after.parentNode?.replaceChild(mark, after);
  });
};

export const ChapterHighlighter = ({ chapterId, children }: ChapterHighlighterProps) => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const { highlights, addHighlight, deleteHighlight } = useStudyHighlights(chapterId);
  const [selectionText, setSelectionText] = useState('');
  const [note, setNote] = useState('');
  const [popover, setPopover] = useState<{ top: number; left: number } | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-render persisted highlights whenever content or highlights change
  const renderHighlights = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    clearMarks(root);
    highlights.forEach((h) => applyMark(root, h.highlighted_text, h.id, Boolean(h.note)));
  }, [highlights]);

  useEffect(() => {
    renderHighlights();
    // Content can render asynchronously (markdown); retry briefly.
    const timer = window.setTimeout(renderHighlights, 400);
    return () => window.clearTimeout(timer);
  }, [renderHighlights, chapterId]);

  const handleMouseUp = () => {
    if (!user) return;
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';
    if (!selection || text.length < 3 || !containerRef.current) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setSelectionText(text);
    setNote('');
    setPopover({
      top: rect.bottom - containerRect.top + 8,
      left: Math.max(0, rect.left - containerRect.left),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await addHighlight(selectionText, note);
    setSaving(false);
    setPopover(null);
    setSelectionText('');
    setNote('');
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div ref={containerRef} className="relative" onMouseUp={handleMouseUp}>
      {children}

      {popover && (
        <Card
          className="absolute z-40 w-80 p-3 shadow-lg"
          style={{ top: popover.top, left: popover.left }}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="line-clamp-3 text-xs italic text-muted-foreground">"{selectionText}"</p>
            <button
              type="button"
              aria-label="Cancel highlight"
              onClick={() => setPopover(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            className="mb-2 min-h-[70px] text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPopover(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Highlighter className="mr-1 h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save highlight'}
            </Button>
          </div>
        </Card>
      )}

      {highlights.length > 0 && (
        <div className="not-prose mt-8 rounded-2xl border border-border bg-muted/10 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <StickyNote className="h-4 w-4" aria-hidden="true" />
            Your highlights on this topic ({highlights.length})
          </h3>
          <ul className="space-y-3">
            {highlights.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-3 rounded-lg bg-background p-3">
                <div className="min-w-0">
                  <p className="text-sm italic text-foreground">"{h.highlighted_text}"</p>
                  {h.note && <p className="mt-1 text-sm text-muted-foreground">{h.note}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete highlight"
                  onClick={() => deleteHighlight(h.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
