import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, StickyNote, Trash2 } from 'lucide-react';
import { useAllStudyNotes, type StudyNote } from '@/hooks/useStudyHighlights';

export const StudyNotesPanel = () => {
  const { notes, loading, updateNote, deleteNote } = useAllStudyNotes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const grouped = useMemo(() => {
    const bySubject: Record<string, Record<string, StudyNote[]>> = {};
    notes.forEach((n) => {
      const topic = `Chapter ${n.chapter_number}: ${n.chapter_title}`;
      bySubject[n.subject_name] = bySubject[n.subject_name] || {};
      bySubject[n.subject_name][topic] = bySubject[n.subject_name][topic] || [];
      bySubject[n.subject_name][topic].push(n);
    });
    return bySubject;
  }, [notes]);

  const startEdit = (note: StudyNote) => {
    setEditingId(note.id);
    setDraft(note.note || '');
  };

  const saveEdit = async (id: string) => {
    const ok = await updateNote(id, draft);
    if (ok) setEditingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <StickyNote className="h-5 w-5 text-primary" aria-hidden="true" />
          My Study Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Highlight text while reading a chapter to save it here with your own notes.
          </p>
        ) : (
          Object.entries(grouped).map(([subject, topics]) => (
            <div key={subject} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{subject}</h3>
              {Object.entries(topics).map(([topic, items]) => (
                <div key={topic} className="rounded-lg border border-border p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{topic}</p>
                  <ul className="space-y-3">
                    {items.map((note) => (
                      <li key={note.id} className="space-y-2">
                        <Link
                          to={`/curriculum/${encodeURIComponent(subject)}/${note.chapter_number}`}
                          className="block text-sm italic text-foreground hover:underline"
                        >
                          "{note.highlighted_text}"
                        </Link>
                        {editingId === note.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              className="min-h-[70px] text-sm"
                              placeholder="Your note"
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" onClick={() => saveEdit(note.id)}>
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-muted-foreground">
                              {note.note || 'No note added'}
                            </p>
                            <div className="flex shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit note"
                                onClick={() => startEdit(note)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete note"
                                onClick={() => deleteNote(note.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
