import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import {
  User,
  Shield,
  Download,
  Trash2,
  LogOut,
  Link as LinkIcon,
  Navigation,
  MapPin,
  Home,
  X,
  CalendarIcon,
  Plus,
  BookOpen,
  FolderOpen,
  Library,
  Save,
  Camera,
  Loader2,
  Copy,
  Check,
  Globe,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAIUsage, AI_FREE_LIMIT } from '@/hooks/useItineraries';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentHomeBase, useHomeBaseMutations } from '@/hooks/useHomeBase';
import { getCountryByIso, countries } from '@/data/countries';
import { useVisitedCountries } from '@/hooks/useVisits';
import { useProfile } from '@/hooks/useProfile';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function AIUsageSection() {
  const { used, limit, isPro, canGenerate, resetAt } = useAIUsage();

  const resetMonth = resetAt
    ? format(new Date(resetAt), 'MMMM')
    : null;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-lg font-display font-semibold text-foreground">AI Planning</h2>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 space-y-4">
        {isPro ? (
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Pro — Unlimited generations</p>
              <p className="text-xs text-muted-foreground">Plan as many trips as you like</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">Itinerary generations this month</span>
                <span className={canGenerate ? 'text-foreground' : 'text-destructive'}>
                  {used} / {limit}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${canGenerate ? 'bg-primary' : 'bg-destructive'}`}
                  style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                />
              </div>
              {resetMonth && (
                <p className="text-xs text-muted-foreground">Resets in {resetMonth}</p>
              )}
            </div>
            {!canGenerate && (
              <p className="text-xs text-muted-foreground border border-border/50 rounded-lg p-3">
                You've used your {limit} free AI plan generations this month. Upgrade to Pro for unlimited trip planning.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { visitedIsos } = useVisitedCountries();
  const { profile, update: updateProfile, uploadAvatar } = useProfile();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tripModeEnabled, setTripModeEnabled] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
    if (profile?.username) setUsername(profile.username);
    if (profile?.is_public !== undefined) setIsPublic(profile.is_public);
  }, [profile?.display_name, profile?.username, profile?.is_public]);

  const handleSaveDisplayName = async () => {
    try {
      await updateProfile.mutateAsync({ display_name: displayName });
      toast({ title: 'Display name saved' });
    } catch {
      toast({ title: 'Failed to save name', variant: 'destructive' });
    }
  };

  const handleSaveUsername = async () => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      setUsernameError('3–20 characters, letters, numbers, underscores only');
      return;
    }
    setIsSavingUsername(true);
    setUsernameError('');
    try {
      // Check availability (skip if unchanged)
      if (trimmed !== profile?.username) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('username', trimmed)
          .maybeSingle();
        if (data) { setUsernameError('Username already taken'); setIsSavingUsername(false); return; }
      }
      await updateProfile.mutateAsync({ username: trimmed });
      toast({ title: 'Username saved' });
    } catch {
      toast({ title: 'Failed to save username', variant: 'destructive' });
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    setIsPublic(checked);
    try {
      await updateProfile.mutateAsync({ is_public: checked } as any);
      toast({ title: checked ? 'Profile is now public' : 'Profile set to private' });
    } catch {
      setIsPublic(!checked);
      toast({ title: 'Failed to update visibility', variant: 'destructive' });
    }
  };

  const handleCopyProfileLink = async () => {
    if (!profile?.username) return;
    const url = `${window.location.origin}/u/${profile.username}`;
    await navigator.clipboard.writeText(url);
    setCopiedProfile(true);
    setTimeout(() => setCopiedProfile(false), 2000);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      await updateProfile.mutateAsync({ avatar_url: url });
      toast({ title: 'Photo updated' });
    } catch {
      toast({ title: 'Failed to upload photo', variant: 'destructive' });
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleExportData = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const [visitsRes, notesRes, chaptersRes, lettersRes] = await Promise.all([
        supabase.from('visits').select('*').eq('user_id', user.id),
        supabase.from('country_notes').select('*').eq('user_id', user.id),
        supabase.from('chapters').select('*').eq('user_id', user.id),
        supabase.from('waymark_letters').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        visits: visitsRes.data ?? [],
        notes: notesRes.data ?? [],
        chapters: chaptersRes.data ?? [],
        letters: lettersRes.data ?? [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `waymark-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export downloaded' });
    } catch {
      toast({ title: 'Export failed. Please try again.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    await signOut();
    navigate('/auth');
    toast({
      title: 'Signed out',
      description: 'Contact support to complete account deletion.',
    });
  };
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [stillLivingHere, setStillLivingHere] = useState(true);
  const navigate = useNavigate();
  
  const { homeBase, homeBases, isLoading: homeBaseLoading } = useCurrentHomeBase();
  const { setHomeBase, deleteHomeBase } = useHomeBaseMutations();
  
  const currentHomeCountry = homeBase ? getCountryByIso(homeBase.country_iso2) : null;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const resetForm = () => {
    setSelectedCountry('');
    setStartDate(undefined);
    setEndDate(undefined);
    setStillLivingHere(true);
  };

  const initials = (() => {
    if (displayName.trim()) {
      return displayName.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    }
    return (user?.email?.[0] ?? '?').toUpperCase();
  })();

  const joinDate = user?.created_at
    ? format(new Date(user.created_at), 'MMMM yyyy')
    : null;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="container py-8 max-w-2xl space-y-8">
        {/* Profile Hero Card */}
        <section className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6">
          <div className="flex items-center gap-5">
            {/* Avatar — clickable to upload */}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-16 h-16 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-lg overflow-hidden group cursor-pointer"
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
              ) : profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-primary-foreground">{initials}</span>
              )}
              {!isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <div className="min-w-0 space-y-1">
              <p className="text-lg font-display font-bold text-foreground truncate">
                {displayName || user?.email?.split('@')[0] || 'Traveller'}
              </p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              {joinDate && (
                <p className="text-xs text-muted-foreground/70">Exploring since {joinDate}</p>
              )}
            </div>
          </div>

          {visitedIsos.length > 0 && (
            <div className="mt-5 pt-5 border-t border-border/50 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground font-medium">{visitedIsos.length}</span>
              <span className="text-sm text-muted-foreground">
                {visitedIsos.length === 1 ? 'country visited' : 'countries visited'}
              </span>
            </div>
          )}
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
              <div className="flex gap-2">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDisplayName}
                  disabled={updateProfile.isPending || !displayName.trim()}
                  className="shrink-0 gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </Button>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value.toLowerCase()); setUsernameError(''); }}
                    placeholder="yourname"
                    className="pl-7"
                    maxLength={20}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveUsername}
                  disabled={isSavingUsername || !username.trim()}
                  className="shrink-0 gap-1.5"
                >
                  {isSavingUsername ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </Button>
              </div>
              {usernameError ? (
                <p className="text-xs text-destructive">{usernameError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Letters, numbers, underscores. 3–20 characters.</p>
              )}
            </div>

            {/* Public profile toggle */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Public profile</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anyone with your link can see your visited countries
                  </p>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={handleTogglePublic}
                  disabled={!profile?.username}
                />
              </div>
              {!profile?.username && (
                <p className="text-xs text-muted-foreground">Set a username first to enable a public profile.</p>
              )}
              {isPublic && profile?.username && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full"
                  onClick={handleCopyProfileLink}
                >
                  {copiedProfile ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedProfile ? 'Copied!' : `Copy link — waymark.app/u/${profile.username}`}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email ?? ''}
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
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <p className="text-sm font-medium text-foreground">Your data stays private</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Nothing is shared publicly unless you create a share link</li>
                <li>• Share links can be revoked at any time</li>
                <li>• You control exactly what each link reveals</li>
              </ul>
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleExportData}
                disabled={isExporting}
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting…' : 'Export'}
              </Button>
            </div>
          </div>
        </section>

        {/* AI Planning Section */}
        <AIUsageSection />

        {/* Library Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Library className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              Library
            </h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/travels')}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Chapters</p>
                  <p className="text-sm text-muted-foreground">Organise your travels into named life periods</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/letters')}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Reflections</p>
                  <p className="text-sm text-muted-foreground">Your AI-written travel reflections</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/share-links')}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <LinkIcon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Shared Links</p>
                  <p className="text-sm text-muted-foreground">Manage who can view your travel profile</p>
                </div>
              </div>
            </button>
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
              <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
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
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </section>
      </main>
      <BottomNav />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all your travel data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAccount}
            >
              Delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
