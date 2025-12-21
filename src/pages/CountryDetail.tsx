import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { getCountryByIso } from '@/data/countries';
import { 
  getCountryBadgeState, 
  getCitiesByCountry, 
  getTripsByCountry,
  getCountryNote,
  mockVisitedCountries
} from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Check, 
  Edit2, 
  MapPin, 
  Calendar,
  ImagePlus,
  Save,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function CountryDetail() {
  const { iso } = useParams<{ iso: string }>();
  const navigate = useNavigate();
  const [isEditingNote, setIsEditingNote] = useState(false);
  
  const country = iso ? getCountryByIso(iso) : null;
  const badgeState = iso ? getCountryBadgeState(iso) : 'locked';
  const cities = iso ? getCitiesByCountry(iso) : [];
  const trips = iso ? getTripsByCountry(iso) : [];
  const existingNote = iso ? getCountryNote(iso) : null;
  const visitData = iso ? mockVisitedCountries[iso] : null;
  
  const [noteText, setNoteText] = useState(existingNote?.note || '');

  if (!country || badgeState === 'locked') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">
            Country Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            This country hasn't been added to your travel log yet.
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

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
              {country.continent} • {visitData?.visitCount || 0} visits
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
                    onClick={() => setIsEditingNote(true)}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                )}
              </div>
              
              {isEditingNote ? (
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
                        onClick={() => {
                          setNoteText(existingNote?.note || '');
                          setIsEditingNote(false);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => setIsEditingNote(false)}>
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-foreground leading-relaxed">
                  {noteText || (
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
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                  <ImagePlus className="w-4 h-4" />
                  Add Photo
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Empty state */}
                <div className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary/70 transition-colors cursor-pointer">
                  <ImagePlus className="w-8 h-8 mb-2" />
                  <span className="text-sm">Add photo</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload up to 5 photos from your travels to {country.name}
              </p>
            </section>

            {/* Trips Section */}
            {trips.length > 0 && (
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
                          {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
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
            {/* Cities Visited */}
            <section className="card-elevated p-6 space-y-4">
              <h2 className="text-lg font-display font-semibold text-foreground">
                Cities Visited
              </h2>
              {cities.length > 0 ? (
                <ul className="space-y-2">
                  {cities.map(city => (
                    <li 
                      key={city.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-foreground">{city.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No cities logged yet.
                </p>
              )}
              <Button variant="outline" size="sm" className="w-full">
                Add City
              </Button>
            </section>

            {/* Quick Stats */}
            <section className="card-elevated p-6 space-y-4">
              <h2 className="text-lg font-display font-semibold text-foreground">
                Quick Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-foreground">
                    {visitData?.visitCount || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Visits</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-foreground">
                    {cities.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Cities</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
