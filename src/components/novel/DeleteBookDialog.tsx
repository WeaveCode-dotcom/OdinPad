import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useNovelContext } from '@/contexts/NovelContext';
import { trackEvent } from '@/lib/analytics';

interface DeleteBookDialogProps {
  novelId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

export default function DeleteBookDialog({ novelId, open, onOpenChange, source = 'dashboard' }: DeleteBookDialogProps) {
  const { deleteNovel } = useNovelContext();

  const handleDelete = async () => {
    if (!novelId) return;
    try {
      await deleteNovel(novelId);
      trackEvent('book_deleted', { source });
      toast({ title: 'Book deleted' });
      onOpenChange(false);
    } catch {
      toast({
        title: 'Could not delete book',
        description: 'Check your connection and try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this book?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the project from your library and cloud storage. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" type="button" onClick={() => void handleDelete()}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
