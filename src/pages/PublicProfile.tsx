import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePublicProfile, usePublicVisits } from '@/hooks/useProfile';
import { useIsFollowing, useFollow, useUnfollow, useFollowerCount, useFollowingCount } from '@/hooks/useFollows';
import { useAuth } from '@/contexts/AuthContext';
import { getCountryByIso } from '@/data/countries';
import { Globe, MapPin, Copy, Check, UserPlus, UserCheck, Loader2, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { format } from 'date-fns';

function isoToFlag(iso2: string): string {
  return [...iso2.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading: loadingProfile } = usePublicProfile(username);
  const { data: visits = [], isLoading: loadingVisits } = usePublicVisits(profile?.user_id);
  const { data: followerCount = 0 } = useFollowerCount(profile?.user_id);
  const { data: followingCount = 0 } = useFollowingCount(profile?.user_id);
  const { data: isFollowing } = useIsFollowing(profile?.user_id);
  const follow = useFollow();
  const unfollow = useUnfollow();
  const [copied, setCopied] = useState(false);

  const isOwnProfile = !!user && user.id === profile?.user_id;
  const followPending = follow.isPending || unfollow.isPending;

  const handleFollow = () => {
    if (!user) { navigate('/auth'); return; }
    if (!profile) return;
    isFollowing ? unfollow.mutate(profile.user_id) : follow.mutate(profile.user_id);
  };

  const visitedIsos = [...new Set(visits.map(v => v.country_iso2))].filter(Boolean) as string[];
  const countryCount = visitedIsos.length;

  const profileUrl = window.location.href;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = profile?.display_name
    ? profile.display_name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (username?.[0] ?? '?').toUpperCase();

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Globe className="w-6 h-6 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-6">
        <Globe className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-lg font-semibold text-foreground">Profile not found</p>
        <p className="text-sm text-muted-foreground">
          This profile doesn't exist or isn't public.
        </p>
        <Link to="/" className="text-sm text-primary underline underline-offset-4">
          Back to Waymark
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-40 h-14 flex items-center px-4 gap-3">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Globe className="w-4 h-4 text-primary" />
          Waymark
        </Link>
      </header>

      <main className="container max-w-xl py-10 space-y-8">
        {/* Profile hero */}
        <div className="flex flex-col items-center text-center gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name ?? username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
            )}
          </div>

          {/* Name + username */}
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-bold text-foreground">
              {profile.display_name || `@${profile.username}`}
            </h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground">{countryCount}</span>
              <span className="text-muted-foreground">{countryCount === 1 ? 'country' : 'countries'}</span>
            </div>
            <div className="text-muted-foreground/40">·</div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-foreground">{followerCount}</span>
              <span className="text-muted-foreground">followers</span>
            </div>
            <div className="text-muted-foreground/40">·</div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-foreground">{followingCount}</span>
              <span className="text-muted-foreground">following</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {!isOwnProfile && (
              <Button
                size="sm"
                variant={isFollowing ? 'outline' : 'default'}
                className="gap-1.5"
                onClick={handleFollow}
                disabled={followPending}
              >
                {followPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : isFollowing
                    ? <UserCheck className="w-3.5 h-3.5" />
                    : <UserPlus className="w-3.5 h-3.5" />
                }
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
            {!isOwnProfile && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/compare/${profile.username}`)}>
                <GitCompare className="w-3.5 h-3.5" />
                Compare maps
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCopy}>
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </div>

        {/* Country grid */}
        {loadingVisits ? (
          <div className="flex justify-center py-8">
            <Globe className="w-5 h-5 animate-spin text-muted-foreground/50" />
          </div>
        ) : countryCount === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No countries logged yet.
          </div>
        ) : (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Countries
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visitedIsos.map(iso2 => {
                const country = getCountryByIso(iso2);
                const lastVisit = visits.find(v => v.country_iso2 === iso2);
                return (
                  <div
                    key={iso2}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm"
                  >
                    <span className="text-2xl leading-none select-none" role="img">
                      {isoToFlag(iso2)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {country?.name ?? iso2}
                      </p>
                      {lastVisit?.arrival_date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(lastVisit.arrival_date), 'MMM yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer CTA */}
        <div className="text-center pt-4 pb-8 space-y-2">
          <p className="text-xs text-muted-foreground">Track your own travels on Waymark</p>
          <Link to="/auth">
            <Button size="sm">Get started — it's free</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
