import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  User, 
  Shield, 
  Download, 
  Trash2, 
  LogOut,
  Upload,
  Link as LinkIcon,
  Navigation,
  MapPin,
  Home,
  X,
  CalendarIcon,
  Plus
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentHomeBase, useHomeBaseMutations } from '@/hooks/useHomeBase';
import { getCountryByIso, countries } from '@/data/countries';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Settings() {
  const [displayName, setDisplayName] = useState('Explorer');
  const [tripModeEnabled, setTripModeEnabled] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [stillLivingHere, setStillLivingHere] = useState(true);
  const navigate = useNavigate();
  
  const { homeBase, homeBases, isLoading: homeBaseLoading } = useCurrentHomeBase();
  const { setHomeBase, deleteHomeBase } = useHomeBaseMutations();
  
  const currentHomeCountry = homeBase ? getCountryByIso(homeBase.country_iso2) : null;

  const resetForm = () => {
    setSelectedCountry('');
    setStartDate(undefined);
    setEndDate(undefined);
    setStillLivingHere(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container py-8 max-w-2xl space-y-8">
        {/* Page Header */}
        <section className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Your account, privacy, and data preferences.
          </p>
        </section>

        {/* Profile Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              Profile
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value="explorer@example.com"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support for assistance.
              </p>
            </div>
          </div>
        </section>

        {/* Home Base Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              Home Base
            </h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Where you've lived. Home base periods are separate from your travel entries.
            </p>

            {/* Existing home bases list */}
            {homeBases.length > 0 && (
              <div className="space-y-2">
                {homeBases.map((hb) => {
                  const country = getCountryByIso(hb.country_iso2);
                  const isActive = !hb.end_date;
                  return (
                    <div 
                      key={hb.id} 
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg",
                        isActive ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{country?.name || hb.country_iso2}</p>
                          {isActive && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(hb.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          {hb.end_date && (
                            <> — {new Date(hb.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</>
                          )}
                          {!hb.end_date && ' — Present'}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteHomeBase.mutate(hb.id)}
                        disabled={deleteHomeBase.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new home base form */}
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add home base
              </p>
              
              <div className="flex gap-2">
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(country => (
                      <SelectItem key={country.iso2} value={country.iso2}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCountry && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedCountry('')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      defaultMonth={startDate}
                      disabled={(date) => date > new Date() || (endDate ? date > endDate : false)}
                    />
                  </PopoverContent>
                </Popover>
                {startDate && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setStartDate(undefined)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Still living here toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Still living here</p>
                  <p className="text-xs text-muted-foreground">Toggle off to set an end date</p>
                </div>
                <Switch
                  checked={stillLivingHere}
                  onCheckedChange={(checked) => {
                    setStillLivingHere(checked);
                    if (checked) setEndDate(undefined);
                  }}
                />
              </div>

              {/* End date picker - only shown when not still living here */}
              {!stillLivingHere && (
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MMM yyyy") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        defaultMonth={endDate || startDate}
                        disabled={(date) => date > new Date() || (startDate ? date < startDate : false)}
                      />
                    </PopoverContent>
                  </Popover>
                  {endDate && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setEndDate(undefined)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    if (selectedCountry && startDate) {
                      setHomeBase.mutate({ 
                        countryIso2: selectedCountry, 
                        startDate: format(startDate, 'yyyy-MM-dd'),
                        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
                        stillLivingHere
                      });
                      resetForm();
                    }
                  }}
                  disabled={!selectedCountry || !startDate || (!stillLivingHere && !endDate) || setHomeBase.isPending}
                >
                  Add Home Base
                </Button>
                {(selectedCountry || startDate || endDate) && (
                  <Button variant="outline" onClick={resetForm}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Location & Check-in Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              Location & Check-in
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <p className="text-sm font-medium text-foreground">Privacy-First Location</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Location is only accessed when you tap "Check In"</li>
                <li>• No background tracking ever</li>
                <li>• No continuous location monitoring</li>
                <li>• Works only while the app is open</li>
              </ul>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium text-foreground">Trip Mode</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  When enabled, Waymark can suggest countries to check in when the app is open
                </p>
              </div>
              <Switch
                checked={tripModeEnabled}
                onCheckedChange={setTripModeEnabled}
              />
            </div>

            {tripModeEnabled && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-primary">
                  Trip Mode is active. Open Waymark while traveling to get check-in suggestions. 
                  Location is only used in the foreground — never in the background.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Privacy Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              Privacy
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Share Links</Label>
              <p className="text-sm text-muted-foreground">
                Your active share links and their permissions.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => navigate('/share-links')}
              >
                <LinkIcon className="w-4 h-4" />
                View Share Links
              </Button>
            </div>
          </div>
        </section>

        {/* Data Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              Your Data
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">Export Data</p>
                <p className="text-sm text-muted-foreground">
                  Download all your travel data as JSON
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              Danger Zone
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20">
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">Sign Out</p>
                <p className="text-sm text-muted-foreground">
                  Sign out of your account on this device
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20">
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
