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
import { Loader2 } from 'lucide-react';
import { useDeleteVisit } from '@/hooks/useVisitMutations';
import { getCountryByIso } from '@/data/countries';

interface Visit {
  id: string;
  country_iso2: string;
  arrival_date: string;
}

interface DeleteVisitDialogProps {
  visit: Visit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteVisitDialog({ visit, open, onOpenChange }: DeleteVisitDialogProps) {
  const deleteMutation = useDeleteVisit();
  const country = visit ? getCountryByIso(visit.country_iso2) : null;

  const handleDelete = async () => {
    if (!visit) return;
    await deleteMutation.mutateAsync(visit.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Visit</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this visit to {country?.name || 'this country'}? 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
