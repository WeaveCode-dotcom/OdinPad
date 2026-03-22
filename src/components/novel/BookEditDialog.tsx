import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useNovelContext } from '@/contexts/NovelContext';
import { validateAndNormalizeBookCreation } from '@/lib/book-creation';
import { STORY_FRAMEWORKS } from '@/lib/story-frameworks';
import { trackEvent } from '@/lib/analytics';
import type { Novel } from '@/types/novel';

const CREATION_GENRES = ['Fantasy', 'Romance', 'Mystery', 'Literary', 'Sci-Fi', 'Thriller', 'Historical', 'General'];
const STATUS_OPTIONS: NonNullable<Novel['status']>[] = ['brainstorming', 'outlining', 'drafting', 'editing', 'complete'];

interface BookEditDialogProps {
  novelId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** analytics source tag */
  source?: string;
}

export default function BookEditDialog({ novelId, open, onOpenChange, source = 'dashboard' }: BookEditDialogProps) {
  const { novels, patchNovel } = useNovelContext();
  const novel = novels.find(n => n.id === novelId) ?? null;

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [frameworkId, setFrameworkId] = useState('three-act');
  const [premise, setPremise] = useState('');
  const [targetWordCount, setTargetWordCount] = useState('');
  const [status, setStatus] = useState<NonNullable<Novel['status']>>('drafting');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !novel) return;
    setTitle(novel.title);
    setAuthor(novel.author);
    setGenre(novel.genre ?? 'General');
    setFrameworkId(novel.frameworkId ?? 'three-act');
    setPremise(novel.premise ?? '');
    setTargetWordCount(novel.targetWordCount != null ? String(novel.targetWordCount) : '');
    setStatus(novel.status ?? 'drafting');
    setFormError(null);
  }, [open, novel]);

  const handleSave = () => {
    if (!novelId) return;
    const validation = validateAndNormalizeBookCreation(
      {
        title,
        author,
        genre,
        frameworkId,
        premise,
        targetWordCount,
        status,
      },
      novels.filter(n => n.id !== novelId).map(n => n.title),
    );
    setFormError(validation.errors[0] ?? null);
    if (validation.errors.length > 0) return;
    patchNovel(novelId, {
      title: validation.normalized.title,
      author: validation.normalized.author,
      genre: validation.normalized.genre,
      premise: validation.normalized.premise,
      targetWordCount: validation.normalized.targetWordCount,
      frameworkId: validation.normalized.frameworkId,
      status: validation.normalized.status,
    });
    trackEvent('book_updated', { source });
    toast({
      title: 'Book updated',
      ...(validation.warnings[0] ? { description: validation.warnings[0] } : {}),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit book</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Author</label>
            <Input value={author} onChange={e => setAuthor(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Genre *</label>
            <Select value={genre || 'General'} onValueChange={setGenre}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CREATION_GENRES.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Template *</label>
            <Select value={frameworkId} onValueChange={setFrameworkId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORY_FRAMEWORKS.map(fw => (
                  <SelectItem key={fw.id} value={fw.id}>{fw.shortName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Status</label>
            <Select value={status} onValueChange={v => setStatus(v as NonNullable<Novel['status']>)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Premise</label>
            <Input value={premise} onChange={e => setPremise(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Target word count</label>
            <Input value={targetWordCount} onChange={e => setTargetWordCount(e.target.value)} placeholder="Optional" />
          </div>
          {formError && (
            <p className="rounded-sm border-2 border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()}>
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
