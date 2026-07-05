import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Loader2 } from 'lucide-react';
import { useChapters, useDeleteChapter, FREE_CHAPTER_LIMIT } from '@/hooks/useChapters';
import { CreateChapterModal } from '@/components/CreateChapterModal';
import { EditChapterModal } from '@/components/EditChapterModal';
import { ChapterEntriesModal } from '@/components/ChapterEntriesModal';
import { ChapterCard } from '@/components/ChapterCard';
import type { Chapter } from '@/hooks/useChapters';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChaptersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChaptersSheet({ open, onOpenChange }: ChaptersSheetProps) {
  const { data: chapters = [], isLoading } = useChapters();
  const deleteChapter = useDeleteChapter();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [viewingEntriesChapter, setViewingEntriesChapter] = useState<Chapter | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null);

  const canCreateMore = chapters.length < FREE_CHAPTER_LIMIT;

  const handleDelete = async () => {
    if (!deletingChapter) return;
    await deleteChapter.mutateAsync(deletingChapter.id);
    setDeletingChapter(null);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-display text-2xl">Chapters</SheetTitle>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setCreateOpen(true)}
                disabled={!canCreateMore}
              >
                <Plus className="w-3.5 h-3.5" />
                New chapter
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Organize your travels into meaningful life periods.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!canCreateMore && (
              <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground">
                  You've used {chapters.length} of {FREE_CHAPTER_LIMIT} free chapters.{' '}
                  <button className="text-primary hover:underline">Upgrade to Pro</button> for unlimited.
                </p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
              </div>
            ) : chapters.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No chapters yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Group your travels into life periods — "College Years", "Living Abroad", "Southeast Asia".
                  </p>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Create first chapter
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {chapters.map(chapter => (
                  <ChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    onEdit={() => setEditingChapter(chapter)}
                    onDelete={() => setDeletingChapter(chapter)}
                    onViewEntries={() => setViewingEntriesChapter(chapter)}
                  />
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CreateChapterModal open={createOpen} onOpenChange={setCreateOpen} />

      <EditChapterModal
        chapter={editingChapter}
        open={!!editingChapter}
        onOpenChange={(open) => !open && setEditingChapter(null)}
      />

      <ChapterEntriesModal
        chapter={viewingEntriesChapter}
        open={!!viewingEntriesChapter}
        onOpenChange={(open) => !open && setViewingEntriesChapter(null)}
      />

      <AlertDialog open={!!deletingChapter} onOpenChange={(open) => !open && setDeletingChapter(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chapter?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{deletingChapter?.title}" and remove all trip associations. Your trips will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteChapter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
