import { useNavigate, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useItineraries, useDeleteItinerary } from '@/hooks/useItineraries';
import { Plus, MapPin, Trash2, Loader2, Compass } from 'lucide-react';
import { format } from 'date-fns';

export default function Plan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: itineraries = [], isLoading } = useItineraries();
  const deleteItinerary = useDeleteItinerary();

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />
      <main className="container py-8 max-w-2xl space-y-8">
        <section className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Trip Planner
            </h1>
            <p className="text-muted-foreground">
              AI-powered itineraries, shaped by your travel history.
            </p>
          </div>
          <Button onClick={() => navigate('/plan/new')} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            New Plan
          </Button>
        </section>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
          </div>
        ) : itineraries.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
              <Compass className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground">No plans yet.</p>
            <Button variant="outline" onClick={() => navigate('/plan/new')} className="gap-2">
              <Plus className="w-4 h-4" />
              Plan your first trip
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {itineraries.map((itin) => (
              <div
                key={itin.id}
                className="group flex items-center justify-between p-5 rounded-xl bg-card/60 hover:bg-card/80 backdrop-blur-sm border border-border/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/plan/${itin.id}`)}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <p className="font-medium text-foreground truncate">{itin.destination}</p>
                    {itin.status === 'generating' && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Generating
                      </span>
                    )}
                    {itin.status === 'failed' && (
                      <span className="text-xs text-destructive">Failed</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {format(new Date(itin.start_date), 'MMM d')} –{' '}
                    {format(new Date(itin.end_date), 'MMM d, yyyy')}
                    {itin.content.length > 0 && ` · ${itin.content.length} days planned`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItinerary.mutate(itin.id);
                  }}
                  disabled={deleteItinerary.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
