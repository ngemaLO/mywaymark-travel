import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { getCountryByIso } from '@/data/countries';
import { useVisitedCountries, useVisitsByCountry } from '@/hooks/useVisits';
import { useCountryNote, useSaveCountryNote } from '@/hooks/useCountryNotes';
import { useCountryImages, useAddCountryImage, useDeleteCountryImage, getMaxImagesPerCountry } from '@/hooks/useCountryImages';
import { useTripsByCountry } from '@/hooks/useTripsByCountry';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Check, 
  Edit2, 
  MapPin, 
  Calendar,
  ImagePlus,
  Save,
  X,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CountryDetail() {
  const { iso } = useParams<{ iso: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  
  const country = iso ? getCountryByIso(iso) : null;
  const { getCountryBadgeState, isLoading: visitsLoading } = useVisitedCountries();
  const { visitCount } = useVisitsByCountry(iso || '');
  const { data: note, isLoading: noteLoading } = useCountryNote(iso || '');
  const { data: images = [], isLoading: imagesLoading } = useCountryImages(iso || '');
  const { data: trips = [], isLoading: tripsLoading } = useTripsByCountry(iso || '');
  const saveNoteMutation = useSaveCountryNote();
  const addImageMutation = useAddCountryImage();
  const deleteImageMutation = useDeleteCountryImage();
  
  const badgeState = iso ? getCountryBadgeState(iso) : 'locked';
  const [noteText, setNoteText] = useState('');
  
  // Sync note text when data loads
  const currentNoteText = isEditingNote ? noteText : (note?.note || '');

  const maxImages = getMaxImagesPerCountry();
  const canAddImage = images.length < maxImages;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">
            Sign In Required
          </h1>
          <p className="text-muted-foreground mb-8">
            Please sign in to view country details.
          </p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!country) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">
            Country Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            This country doesn't exist in our database.
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (visitsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 space-y-8">
          <Skeleton className="h-10 w-24" />
          <div className="flex gap-6">
            <Skeleton className="w-32 h-32 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (badgeState === 'locked') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">
            Country Not Visited
          </h1>
          <p className="text-muted-foreground mb-8">
            You haven't added any visits to {country.name} yet.
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleSaveNote = async () => {
    if (!iso) return;
    await saveNoteMutation.mutateAsync({ countryIso2: iso, note: noteText });
    setIsEditingNote(false);
  };

  const handleStartEditNote = () => {
    setNoteText(note?.note || '');
    setIsEditingNote(true);
  };

  const handleAddImage = async () => {
    if (!iso || !imageUrl.trim()) return;
    await addImageMutation.mutateAsync({ countryIso2: iso, imageUrl: imageUrl.trim() });
    setImageUrl('');
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!iso) return;
    await deleteImageMutation.mutateAsync({ imageId, countryIso2: iso });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-8">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Hero Section */}
        <section className="flex flex-col md:flex-row items-start gap-6">
          {/* Country Badge Large */}
          <div
            className={cn(
              "w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-bold shadow-lg",
              badgeState === 'declared' && "bg-gradient-to-br from-amber to-amber-dark text-amber-foreground",
              badgeState === 'verified' && "bg-primary text-primary-foreground"
            )}
          >
            {country.iso2}
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                {country.name}
              </h1>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1",
                badgeState === 'declared' && "bg-amber/20 text-amber-dark",
                badgeState === 'verified' && "bg-primary/10 text-primary"
              )}>
                <Check className="w-3 h-3" />
                {badgeState === 'verified' ? 'Verified' : 'Declared'}
              </span>
            </div>
            <p className="text-muted-foreground">
              {country.continent} • {visitCount} visits
            </p>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Notes Section */}
            <section className="card-elevated p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold text-foreground">
                  Personal Notes
                </h2>
                {!isEditingNote && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditNote}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                )}
              </div>
              
              {noteLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : isEditingNote ? (
                <div className="space-y-3">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add your personal notes about this country..."
                    className="min-h-[120px] resize-none"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {noteText.length}/500 characters
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingNote(false)}
                        disabled={saveNoteMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSaveNote}
                        disabled={saveNoteMutation.isPending}
                      >
                        {saveNoteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-foreground leading-relaxed">
                  {currentNoteText || (
                    <span className="text-muted-foreground italic">
                      No notes yet. Click edit to add your thoughts about this country.
                    </span>
                  )}
                </p>
              )}
            </section>

            {/* Images Section */}
            <section className="card-elevated p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold text-foreground">
                  Photos
                </h2>
                <span className="text-sm text-muted-foreground">
                  {images.length}/{maxImages}
                </span>
              </div>

              {/* Image limit warning */}
              {!canAddImage && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You've reached the maximum of {maxImages} photos for this country. Delete an existing photo to add a new one.
                  </AlertDescription>
                </Alert>
              )}
              
              {imagesLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="aspect-square rounded-xl" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map(image => (
                      <div key={image.id} className="relative group aspect-square">
                        <img
                          src={image.image_url}
                          alt={`Photo from ${country.name}`}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <button
                          onClick={() => handleDeleteImage(image.id)}
                          disabled={deleteImageMutation.isPending}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Add photo placeholder */}
                    {canAddImage && (
                      <div className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary/70 transition-colors">
                        <ImagePlus className="w-8 h-8 mb-2" />
                        <span className="text-sm">Add photo</span>
                      </div>
                    )}
                  </div>

                  {/* Add image form */}
                  {canAddImage && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste image URL..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleAddImage}
                        disabled={!imageUrl.trim() || addImageMutation.isPending}
                      >
                        {addImageMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Add'
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
              
              <p className="text-xs text-muted-foreground">
                Upload up to {maxImages} photos from your travels to {country.name}
              </p>
            </section>

            {/* Trips Section */}
            {tripsLoading ? (
              <section className="card-elevated p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-20 w-full" />
              </section>
            ) : trips.length > 0 && (
              <section className="card-elevated p-6 space-y-4">
                <h2 className="text-lg font-display font-semibold text-foreground">
                  Related Trips
                </h2>
                <div className="space-y-3">
                  {trips.map(trip => (
                    <div 
                      key={trip.id}
                      className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <h3 className="font-medium text-foreground">
                        {trip.title || 'Untitled Trip'}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {format(new Date(trip.start_date), 'MMM d')}
                          {trip.end_date && ` - ${format(new Date(trip.end_date), 'MMM d, yyyy')}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <section className="card-elevated p-6 space-y-4">
              <h2 className="text-lg font-display font-semibold text-foreground">
                Quick Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-foreground">
                    {visitCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Visits</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-foreground">
                    {trips.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Trips</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
