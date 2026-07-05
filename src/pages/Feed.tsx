import { useState, useMemo } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed, useSearchProfiles, useFollow, useUnfollow, useIsFollowing, useFollowingCount, useFollowing } from '@/hooks/useFollows';
import { useActiveConnectionPartnerIds } from '@/hooks/useTripConnections';
import { ScanToConnectModal } from '@/components/connections/ScanToConnectModal';
import { getCountryByIso } from '@/data/countries';
import { formatDistanceToNow } from 'date-fns';
import { Search, Users, Loader2, UserPlus, UserCheck, Handshake, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

function isoToFlag(iso2: string): string {
  return [...iso2.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}

function Avatar({ avatarUrl, name, size = 'md' }: { avatarUrl: string | null; name: string; size?: 'sm' | 'md' }) {
  const initials = name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const cls = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={cn('rounded-full bg-primary flex items-center justify-center shrink-0 overflow-hidden font-bold text-primary-foreground', cls)}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        : <span>{initials}</span>
      }
    </div>
  );
}

function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { data: isFollowing, isLoading } = useIsFollowing(targetUserId);
  const follow = useFollow();
  const unfollow = useUnfollow();
  const pending = follow.isPending || unfollow.isPending;

  if (isLoading) return <div className="w-20 h-7 rounded-full bg-muted animate-pulse" />;

  return isFollowing ? (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1"
      onClick={() => unfollow.mutate(targetUserId)}
      disabled={pending}
    >
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
      Following
    </Button>
  ) : (
    <Button
      size="sm"
      className="h-7 text-xs gap-1"
      onClick={() => follow.mutate(targetUserId)}
      disabled={pending}
    >
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
      Follow
    </Button>
  );
}

function SearchSection() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const { data: results = [], isFetching } = useSearchProfiles(query);
  const { data: connectionPartnerIds = [] } = useActiveConnectionPartnerIds();
  const connectionSet = useMemo(() => new Set(connectionPartnerIds), [connectionPartnerIds]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by username…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-9"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {query.trim().length >= 2 && (
        <div className="space-y-1">
          {results.length === 0 && !isFetching ? (
            <p className="text-sm text-muted-foreground text-center py-4">No travelers found for "@{query}"</p>
          ) : (
            results.map(profile => (
              <div
                key={profile.user_id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/60"
              >
                <Link to={`/u/${profile.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar avatarUrl={profile.avatar_url} name={profile.display_name || profile.username || '?'} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {profile.display_name || `@${profile.username}`}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs text-muted-foreground">@{profile.username}</p>
                      {connectionSet.has(profile.user_id) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/70 rounded-full px-1.5 py-0.5 shrink-0">
                          <Handshake className="w-2.5 h-2.5" />
                          Met in person
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                {user && profile.user_id !== user.id && (
                  <FollowButton targetUserId={profile.user_id} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function FollowingList() {
  const { user } = useAuth();
  const { data: following = [] } = useFollowing(user?.id);
  const { data: connectionPartnerIds = [] } = useActiveConnectionPartnerIds();
  const connectionSet = useMemo(() => new Set(connectionPartnerIds), [connectionPartnerIds]);

  if (following.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Following
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {following.map(profile => (
          <Link
            key={profile.user_id}
            to={`/u/${profile.username}`}
            className="flex flex-col items-center gap-1.5 shrink-0 w-16"
          >
            <div className="relative">
              <Avatar avatarUrl={profile.avatar_url} name={profile.display_name || profile.username || '?'} />
              {connectionSet.has(profile.user_id) && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary border-2 border-background flex items-center justify-center"
                  title="Met in person"
                >
                  <Handshake className="w-2 h-2 text-primary-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate w-full text-center">
              {profile.username}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const { data: feed = [], isLoading } = useFeed();
  const { data: followingCount = 0 } = useFollowingCount(user?.id);
  const { data: connectionPartnerIds = [] } = useActiveConnectionPartnerIds();
  const hasSocialSources = followingCount > 0 || connectionPartnerIds.length > 0;
  const [scanOpen, setScanOpen] = useState(false);

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="container py-6 max-w-xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Feed</h1>
            <p className="text-sm text-muted-foreground mt-0.5">See where your friends are going</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0 mt-1"
            onClick={() => setScanOpen(true)}
          >
            <ScanLine className="w-3.5 h-3.5" />
            Scan to connect
          </Button>
        </div>

        {/* Search */}
        <SearchSection />

        {/* Following avatars */}
        <FollowingList />

        {/* Feed */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
          </div>
        ) : !hasSocialSources ? (
          <div className="flex flex-col items-center text-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">No one in your feed yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Follow travelers above, or connect with someone you meet on the road to see their journeys here.
            </p>
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              None of the people you follow have logged any public trips yet.
            </p>
          </div>
        ) : (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent activity
            </h2>
            <div className="space-y-2">
              {feed.map(item => {
                const country = getCountryByIso(item.country_iso2);
                const name = item.display_name || `@${item.username}` || 'A traveler';
                const timeAgo = formatDistanceToNow(new Date(item.arrival_date), { addSuffix: true });

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm"
                  >
                    <Link to={`/u/${item.username}`}>
                      <Avatar avatarUrl={item.avatar_url} name={name} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        <Link
                          to={`/u/${item.username}`}
                          className="font-semibold hover:text-primary transition-colors"
                        >
                          {name}
                        </Link>
                        {' '}visited{' '}
                        <span className="font-medium">
                          {isoToFlag(item.country_iso2)} {country?.name ?? item.country_iso2}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        {item.source === 'connection' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 rounded-full px-1.5 py-0.5">
                            <Handshake className="w-2.5 h-2.5" />
                            Met in person
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <ScanToConnectModal open={scanOpen} onOpenChange={setScanOpen} />
      <BottomNav />
    </div>
  );
}
