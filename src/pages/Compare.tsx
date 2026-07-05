import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVisitedCountries } from '@/hooks/useVisits';
import { usePublicProfile, usePublicVisits } from '@/hooks/useProfile';
import { useProfile } from '@/hooks/useProfile';
import { CompareGlobe } from '@/components/CompareGlobe';
import { getCountryByIso } from '@/data/countries';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function isoToFlag(iso2: string): string {
  return [...iso2.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}

function CountryPill({ iso2 }: { iso2: string }) {
  const country = getCountryByIso(iso2);
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/60 text-foreground">
      {isoToFlag(iso2)} {country?.name ?? iso2}
    </span>
  );
}

function StatCard({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-muted/40">
      <span className="text-2xl font-display font-bold" style={{ color }}>{count}</span>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

export default function Compare() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { visitedIsos: myIsos, isLoading: myLoading } = useVisitedCountries();
  const { profile: myProfile } = useProfile();
  const { data: theirProfile, isLoading: profileLoading } = usePublicProfile(username);
  const { data: theirVisits = [], isLoading: visitsLoading } = usePublicVisits(theirProfile?.user_id);

  const theirIsos = [...new Set(theirVisits.map(v => v.country_iso2).filter(Boolean) as string[])];

  const shared    = myIsos.filter(iso => theirIsos.includes(iso));
  const onlyMine  = myIsos.filter(iso => !theirIsos.includes(iso));
  const onlyTheirs = theirIsos.filter(iso => !myIsos.includes(iso));

  const myName = myProfile?.display_name || 'You';
  const theirName = theirProfile?.display_name || theirProfile?.username || username || 'Them';

  const isLoading = myLoading || profileLoading || visitsLoading;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Globe className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-lg font-semibold text-foreground">Sign in to compare maps</p>
        <Button onClick={() => navigate('/auth')}>Sign in</Button>
      </div>
    );
  }

  if (!profileLoading && !theirProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Globe className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-lg font-semibold text-foreground">Profile not found</p>
        <p className="text-sm text-muted-foreground">This profile doesn't exist or isn't public.</p>
        <Link to="/" className="text-sm text-primary underline underline-offset-4">Back to Waymark</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Top bar */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-40 h-14 flex items-center px-4 gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1 rounded-md text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Map Comparison</span>
        </div>
      </header>

      <main className="container max-w-2xl py-6 space-y-8">
        {/* Who vs who */}
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {myProfile?.avatar_url
              ? <img src={myProfile.avatar_url} alt={myName} className="w-8 h-8 rounded-full object-cover" />
              : <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">{myName[0]}</div>
            }
            <span className="font-medium text-foreground">{myName}</span>
          </div>
          <span className="text-muted-foreground/50">vs</span>
          <div className="flex items-center gap-2">
            {theirProfile?.avatar_url
              ? <img src={theirProfile.avatar_url} alt={theirName} className="w-8 h-8 rounded-full object-cover" />
              : <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{theirName[0]}</div>
            }
            <span className="font-medium text-foreground">{theirName}</span>
          </div>
        </div>

        {/* Globe */}
        {isLoading ? (
          <div className="flex justify-center">
            <Skeleton className="w-64 h-64 rounded-full" />
          </div>
        ) : (
          <CompareGlobe
            myIsos={myIsos}
            theirIsos={theirIsos}
            myName={myName}
            theirName={theirName}
          />
        )}

        {/* Stats */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard count={shared.length}    label="Together"         color="#10B981" />
            <StatCard count={onlyMine.length}  label={`${myName} only`}    color="#F97316" />
            <StatCard count={onlyTheirs.length} label={`${theirName} only`} color="#818CF8" />
          </div>
        )}

        {/* Country breakdowns */}
        {!isLoading && shared.length === 0 && onlyMine.length === 0 && onlyTheirs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">No visit data to compare yet.</p>
        )}

        {!isLoading && shared.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#10B981' }} />
              Countries you've both visited ({shared.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {shared.sort().map(iso => <CountryPill key={iso} iso2={iso} />)}
            </div>
          </section>
        )}

        {!isLoading && onlyMine.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#F97316' }} />
              Only {myName} ({onlyMine.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {onlyMine.sort().map(iso => <CountryPill key={iso} iso2={iso} />)}
            </div>
          </section>
        )}

        {!isLoading && onlyTheirs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#818CF8' }} />
              Only {theirName} ({onlyTheirs.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {onlyTheirs.sort().map(iso => <CountryPill key={iso} iso2={iso} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
