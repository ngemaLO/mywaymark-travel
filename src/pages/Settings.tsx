import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  X
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentHomeBase, useHomeBaseMutations } from '@/hooks/useHomeBase';
import { getCountryByIso, countries } from '@/data/countries';
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
  const navigate = useNavigate();
  
  const { homeBase, isLoading: homeBaseLoading } = useCurrentHomeBase();
  const { setHomeBase, clearHomeBase } = useHomeBaseMutations();
  
  const currentHomeCountry = homeBase ? getCountryByIso(homeBase.country_iso2) : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 max-w-2xl space-y-8">
        {/* Page Header */}
        <section className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account, privacy, and data preferences.
          </p>
        </section>

        {/* Profile Section */}
        <section className="card-elevated p-6 space-y-6">
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
        <section className="card-elevated p-6 space-y-6">
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
              Your home base represents where you currently live. It won't count as a trip in your travel stats.
            </p>

            {currentHomeCountry ? (
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{currentHomeCountry.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Since {new Date(homeBase!.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => clearHomeBase.mutate()}
                  disabled={clearHomeBase.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
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
                <Button 
                  onClick={() => {
                    if (selectedCountry) {
                      setHomeBase.mutate({ countryIso2: selectedCountry });
                      setSelectedCountry('');
                    }
                  }}
                  disabled={!selectedCountry || setHomeBase.isPending}
                >
                  Set
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Location & Check-in Section */}
        <section className="card-elevated p-6 space-y-6">
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
        <section className="card-elevated p-6 space-y-6">
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
                Manage your active share links and their permissions.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => navigate('/share-links')}
              >
                <LinkIcon className="w-4 h-4" />
                Manage Share Links
              </Button>
            </div>
          </div>
        </section>

        {/* Data Section */}
        <section className="card-elevated p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              Data Management
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">Import Data</p>
                <p className="text-sm text-muted-foreground">
                  Import flights from a CSV file
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="w-4 h-4" />
                Import
              </Button>
            </div>
            
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
        <section className="card-elevated p-6 space-y-6 border-destructive/20">
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
    </div>
  );
}
