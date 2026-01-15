import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useChapters, useDeleteChapter, FREE_CHAPTER_LIMIT } from '@/hooks/useChapters';
import { CreateChapterModal } from '@/components/CreateChapterModal';
import { EditChapterModal } from '@/components/EditChapterModal';
import { ManageChapterTripsModal } from '@/components/ManageChapterTripsModal';
import { ChapterCard } from '@/components/ChapterCard';
import { BookOpen, Plus, Loader2 } from 'lucide-react';
import type { Chapter } from '@/hooks/useChapters';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Chapters() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: chapters = [], isLoading } = useChapters();
  const deleteChapter = useDeleteChapter();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [managingTripsChapter, setManagingTripsChapter] = useState<Chapter | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null);

  const canCreateMore = chapters.length < FREE_CHAPTER_LIMIT;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">
            Sign In Required
          </h1>
          <p className="text-muted-foreground mb-8">
            Please sign in to manage your chapters.
          </p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!deletingChapter) return;
    await deleteChapter.mutateAsync(deletingChapter.id);
    setDeletingChapter(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-8">
        {/* Page Header */}
        <section className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Chapters
            </h1>
            <p className="text-muted-foreground">
              Organize your travels into meaningful life chapters.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Chapter
          </Button>
        </section>

        {/* Free limit notice */}
        {!canCreateMore && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-sm text-muted-foreground">
              You've used {chapters.length} of {FREE_CHAPTER_LIMIT} free chapters.{' '}
              <button className="text-primary hover:underline">Upgrade to Pro</button> for unlimited chapters.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-16 space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-display font-semibold text-foreground">
                No Chapters Yet
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Chapters help you organize your travels into life periods — 
                like "College Years" or "European Adventure".
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Chapter
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {chapters.map((chapter) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                onEdit={() => setEditingChapter(chapter)}
                onDelete={() => setDeletingChapter(chapter)}
                onManageTrips={() => setManagingTripsChapter(chapter)}
              />
            ))}
          </div>
        )}
      </main>

      <CreateChapterModal open={createOpen} onOpenChange={setCreateOpen} />
      
      <EditChapterModal
        chapter={editingChapter}
        open={!!editingChapter}
        onOpenChange={(open) => !open && setEditingChapter(null)}
      />

      <ManageChapterTripsModal
        chapter={managingTripsChapter}
        open={!!managingTripsChapter}
        onOpenChange={(open) => !open && setManagingTripsChapter(null)}
      />

      <AlertDialog open={!!deletingChapter} onOpenChange={(open) => !open && setDeletingChapter(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chapter?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{deletingChapter?.title}" and remove all trip associations. 
              Your trips themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteChapter.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
