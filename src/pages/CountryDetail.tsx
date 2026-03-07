import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { getCountryByIso } from '@/data/countries';
import { getCountryFacts } from '@/data/countryFacts';
import { useVisitedCountries, useVisitsByCountry } from '@/hooks/useVisits';
import { useCountryNote, useCountryNotes, useSaveCountryNote, useAddCountryNote, useDeleteCountryNote } from '@/hooks/useCountryNotes';
import { useIsPremium } from '@/hooks/usePremium';
import { useCountryImages, useAddCountryImage, useDeleteCountryImage, useUploadCountryImage, getMaxImagesPerCountry } from '@/hooks/useCountryImages';
import { useCitiesByCountry, useAddCity, useRemoveCity } from '@/hooks/useCities';
import { useCurrentHomeBase } from '@/hooks/useHomeBase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CityCombobox } from '@/components/CityCombobox';
import { EditVisitModal } from '@/components/EditVisitModal';
import { DeleteVisitDialog } from '@/components/DeleteVisitDialog';
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
  AlertCircle,
  Building2,
  Plus,
  Home,
  Mic,
  MicOff,
  Lightbulb
} from 'lucide-react';
import { format } from 'date-fns';
import { useState, useRef, useCallback } from 'react';
import { useSpeechToText } from '@/hooks/useSpeech';
import { TTSControls } from '@/components/TTSControls';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Visit } from '@/hooks/useVisits';

export default function CountryDetail() {
  const { iso } = useParams<{ iso: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isAddingNewNote, setIsAddingNewNote] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [cityName, setCityName] = useState('');
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [deletingVisit, setDeletingVisit] = useState<Visit | null>(null);
  
  const country = iso ? getCountryByIso(iso) : null;
  const { isVisited, isLoading: visitsLoading } = useVisitedCountries();
  const { visits: countryVisits, visitCount } = useVisitsByCountry(iso || '');
  const { data: note, isLoading: noteLoading } = useCountryNote(iso || '');
  const { data: allNotes = [], isLoading: allNotesLoading } = useCountryNotes(iso || '');
  const { data: images = [], isLoading: imagesLoading } = useCountryImages(iso || '');
  const { data: cities = [], isLoading: citiesLoading } = useCitiesByCountry(iso || '');
  const { homeBase } = useCurrentHomeBase();
  const saveNoteMutation = useSaveCountryNote();
  const addNoteMutation = useAddCountryNote();
  const deleteNoteMutation = useDeleteCountryNote();
  const { isPremium } = useIsPremium();
  const addImageMutation = useAddCountryImage();
  const uploadImageMutation = useUploadCountryImage();
  const deleteImageMutation = useDeleteCountryImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addCityMutation = useAddCity();
  const removeCityMutation = useRemoveCity();
  
  const visited = iso ? isVisited(iso) : false;
  const isHomeBase = homeBase?.country_iso2 === iso;
  const [noteText, setNoteText] = useState('');
  
  // Speech hooks
  const handleDictationResult = useCallback((transcript: string) => {
    setNoteText(prev => {
      const separator = prev.trim() ? ' ' : '';
      return prev + separator + transcript;
    });
  }, []);
  const stt = useSpeechToText(handleDictationResult);
  
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

  if (!visited) {
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

  const handleSaveNote = async (noteId?: string) => {
    if (!iso) return;
    await saveNoteMutation.mutateAsync({ countryIso2: iso, note: noteText, noteId });
    setIsEditingNote(false);
    setEditingNoteId(null);
  };

  const handleStartEditNote = (existingNote?: { id: string; note: string | null }) => {
    setNoteText(existingNote?.note || '');
    setEditingNoteId(existingNote?.id || null);
    setIsEditingNote(true);
    setIsAddingNewNote(false);
  };

  const handleStartAddNote = () => {
    setNoteText('');
    setIsAddingNewNote(true);
    setIsEditingNote(false);
    setEditingNoteId(null);
  };

  const handleSaveNewNote = async () => {
    if (!iso || !noteText.trim()) return;
    await addNoteMutation.mutateAsync({ countryIso2: iso, note: noteText });
    setIsAddingNewNote(false);
    setNoteText('');
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!iso) return;
    await deleteNoteMutation.mutateAsync({ noteId, countryIso2: iso });
  };

  const handleAddImage = async () => {
    if (!iso || !imageUrl.trim()) return;
    await addImageMutation.mutateAsync({ countryIso2: iso, imageUrl: imageUrl.trim() });
    setImageUrl('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !iso) return;
    await uploadImageMutation.mutateAsync({ countryIso2: iso, file });
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!iso) return;
    await deleteImageMutation.mutateAsync({ imageId, countryIso2: iso });
  };

  const handleAddCity = async () => {
    if (!iso || !cityName.trim()) return;
    await addCityMutation.mutateAsync({ countryIso2: iso, cityName: cityName.trim() });
    setCityName('');
    setIsAddingCity(false);
  };

  const handleRemoveCity = async (placeId: string) => {
    if (!iso) return;
    await removeCityMutation.mutateAsync({ placeId, countryIso2: iso });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
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
              "w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center text-5xl md:text-6xl shadow-lg",
              "bg-muted/30"
            )}
          >
            {[...country.iso2.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')}
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                {country.name}
              </h1>
              {isHomeBase ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 bg-foreground/10 text-foreground border border-foreground/20">
                  <Home className="w-3 h-3" />
                  Home
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 bg-primary/10 text-primary">
                  <Check className="w-3 h-3" />
                  Visited
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {country.continent}
              {!isHomeBase && visitCount > 0 && (
                <> • {visitCount} {visitCount !== 1 ? 'times' : 'time'}</>
              )}
              {isHomeBase && homeBase?.start_date && (
                <> • Home since {new Date(homeBase.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</>
              )}
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
                <div className="flex gap-1 items-center">
                  {isPremium && !isAddingNewNote && !isEditingNote && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartAddNote}
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="w-4 h-4" />
                      Add note
                    </Button>
                  )}
                  {!isPremium && !isEditingNote && (
                    <>
                      <TTSControls text={currentNoteText} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEditNote(note ? { id: note.id, note: note.note } : undefined)}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {(noteLoading || allNotesLoading) ? (
                <Skeleton className="h-24 w-full" />
              ) : isPremium ? (
                /* Premium: multiple notes */
                <div className="space-y-3">
                  {/* Add new note form */}
                  {isAddingNewNote && (
                    <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
                      <Textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Write a new note..."
                        className="min-h-[100px] resize-none"
                        maxLength={500}
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {noteText.length}/500 characters
                          </span>
                          {stt.isSupported && (
                            <Button
                              variant={stt.isListening ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => stt.isListening ? stt.stopListening() : stt.startListening()}
                              disabled={addNoteMutation.isPending}
                              className={`gap-1.5 ${stt.isListening ? 'animate-pulse' : ''}`}
                            >
                              {stt.isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                              {stt.isListening ? 'Listening…' : 'Dictate'}
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { stt.stopListening(); setIsAddingNewNote(false); setNoteText(''); }}
                            disabled={addNoteMutation.isPending}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => { stt.stopListening(); handleSaveNewNote(); }}
                            disabled={addNoteMutation.isPending || !noteText.trim()}
                          >
                            {addNoteMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-1" />
                            )}
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit existing note form */}
                  {isEditingNote && editingNoteId && (
                    <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
                      <Textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Edit your note..."
                        className="min-h-[100px] resize-none"
                        maxLength={500}
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {noteText.length}/500 characters
                          </span>
                          {stt.isSupported && (
                            <Button
                              variant={stt.isListening ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => stt.isListening ? stt.stopListening() : stt.startListening()}
                              disabled={saveNoteMutation.isPending}
                              className={`gap-1.5 ${stt.isListening ? 'animate-pulse' : ''}`}
                            >
                              {stt.isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                              {stt.isListening ? 'Listening…' : 'Dictate'}
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { stt.stopListening(); setIsEditingNote(false); setEditingNoteId(null); }}
                            disabled={saveNoteMutation.isPending}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => { stt.stopListening(); handleSaveNote(editingNoteId); }}
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
                  )}

                  {/* List of notes */}
                  {allNotes.length > 0 ? (
                    allNotes.map((n) => (
                      <div key={n.id} className="group p-4 rounded-xl bg-muted/30 space-y-2">
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">{n.note}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {n.updated_at ? format(new Date(n.updated_at), 'MMM d, yyyy') : ''}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TTSControls text={n.note || ''} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleStartEditNote({ id: n.id, note: n.note })}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteNote(n.id)}
                              disabled={deleteNoteMutation.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : !isAddingNewNote && (
                    <p className="text-muted-foreground italic text-sm">
                      No notes yet. Click "Add note" to start writing.
                    </p>
                  )}
                </div>
              ) : isEditingNote ? (
                /* Free tier: single note editing */
                <div className="space-y-3">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add your personal notes about this country..."
                    className="min-h-[120px] resize-none"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {noteText.length}/500 characters
                      </span>
                      {stt.isSupported && (
                        <Button
                          variant={stt.isListening ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => stt.isListening ? stt.stopListening() : stt.startListening()}
                          disabled={saveNoteMutation.isPending}
                          className={`gap-1.5 ${stt.isListening ? 'animate-pulse' : ''}`}
                        >
                          {stt.isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          {stt.isListening ? 'Listening…' : 'Dictate'}
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { stt.stopListening(); setIsEditingNote(false); }}
                        disabled={saveNoteMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => { stt.stopListening(); handleSaveNote(editingNoteId || undefined); }}
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

            {/* Cities Section */}
            <section className="card-elevated p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Cities Visited
                </h2>
                {!isAddingCity && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingCity(true)}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="w-4 h-4" />
                    Add City
                  </Button>
                )}
              </div>

              {citiesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <>
                  {/* Add city form */}
                  {isAddingCity && (
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <CityCombobox
                          countryIso2={iso || ''}
                          value={cityName}
                          onSelect={(city) => {
                            setCityName(city);
                          }}
                          disabled={addCityMutation.isPending}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setIsAddingCity(false);
                          setCityName('');
                        }}
                        disabled={addCityMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button 
                        onClick={handleAddCity}
                        disabled={!cityName.trim() || addCityMutation.isPending}
                      >
                        {addCityMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Add'
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Cities list */}
                  {cities.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {cities.map(city => (
                        <div 
                          key={city.id}
                          className="group flex items-center gap-2 px-3 py-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <span className="text-sm font-medium text-foreground">
                            {city.name}
                          </span>
                          <button
                            onClick={() => handleRemoveCity(city.id)}
                            disabled={removeCityMutation.isPending}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : !isAddingCity && (
                    <p className="text-sm text-muted-foreground italic">
                      No cities added yet. Click "Add City" to remember which cities you've been to in {country.name}.
                    </p>
                  )}
                </>
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
                    
                    {/* Add photo placeholder - now clickable */}
                    {canAddImage && (
                      <label 
                        className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary/70 transition-colors cursor-pointer"
                      >
                        {uploadImageMutation.isPending ? (
                          <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                        ) : (
                          <ImagePlus className="w-8 h-8 mb-2" />
                        )}
                        <span className="text-sm">
                          {uploadImageMutation.isPending ? 'Uploading...' : 'Add photo'}
                        </span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileSelect}
                          disabled={uploadImageMutation.isPending}
                        />
                      </label>
                    )}
                  </div>

                  {/* Add image via URL form */}
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

            {/* Visits Section */}
            <section className="card-elevated p-6 space-y-4">
              <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Your Visits
              </h2>
              
              {countryVisits.length > 0 ? (
                <div className="space-y-3">
                  {countryVisits.map((visit) => (
                    <div 
                      key={visit.id}
                      className="group flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>
                            {visit.departure_date 
                              ? `${format(new Date(visit.arrival_date), 'MMM d, yyyy')} - ${format(new Date(visit.departure_date), 'MMM d, yyyy')}`
                              : format(new Date(visit.arrival_date), 'MMM d, yyyy')
                            }
                          </span>
                        </div>
                        {visit.source && visit.source !== 'manual' && (
                          <span className="text-xs text-muted-foreground capitalize mt-1">
                            via {visit.source}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingVisit(visit)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingVisit(visit)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No visits recorded yet.
                </p>
              )}
            </section>

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
                  <p className="text-xs text-muted-foreground">Times</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-foreground">
                    {cities.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Cities</p>
                </div>
              </div>
            </section>

            {/* Travel Facts */}
            <section className="card-elevated p-6 space-y-4">
              <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Did You Know?
              </h2>
              <ul className="space-y-3">
                {getCountryFacts(iso || '', country.continent).map((fact, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-4 border-l-2 border-primary/20">
                    {fact}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>

      <EditVisitModal
        visit={editingVisit}
        open={!!editingVisit}
        onOpenChange={(open) => !open && setEditingVisit(null)}
      />

      <DeleteVisitDialog
        visit={deletingVisit}
        open={!!deletingVisit}
        onOpenChange={(open) => !open && setDeletingVisit(null)}
      />
      <BottomNav />
    </div>
  );
}
