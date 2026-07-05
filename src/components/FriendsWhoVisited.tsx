import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { format } from 'date-fns';
import { useFriendsWhoVisited } from '@/hooks/useFollows';

interface Props {
  iso2: string;
  variant?: 'compact' | 'sidebar';
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const letters = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : name.slice(0, 2);
  return <>{letters.toUpperCase()}</>;
}

function FriendAvatar({ avatarUrl, name, size }: { avatarUrl: string | null; name: string; size: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <div className={`${dim} rounded-full bg-muted border-2 border-background flex items-center justify-center overflow-hidden flex-shrink-0 font-medium text-muted-foreground`}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        : <Initials name={name || '?'} />
      }
    </div>
  );
}

export function FriendsWhoVisited({ iso2, variant = 'compact' }: Props) {
  const navigate = useNavigate();
  const { data: friends = [], isLoading } = useFriendsWhoVisited(iso2);

  if (isLoading || friends.length === 0) return null;

  if (variant === 'compact') {
    const shown = friends.slice(0, 4);
    const overflow = friends.length - shown.length;
    const names = friends.slice(0, 2).map(f => f.display_name || f.username || 'Someone');
    const label = friends.length === 1
      ? `${names[0]} has been here`
      : friends.length === 2
        ? `${names[0]} & ${names[1]} have been here`
        : `${names[0]}, ${names[1]} & ${friends.length - 2} ${friends.length - 2 === 1 ? 'other' : 'others'} have been here`;

    return (
      <div className="country-panel-friends">
        <div className="country-panel-friends-avatars">
          {shown.map(f => (
            <button
              key={f.user_id}
              title={f.display_name || f.username || undefined}
              onClick={() => f.username && navigate(`/u/${f.username}`)}
              className="country-panel-friends-avatar-btn"
            >
              <FriendAvatar
                avatarUrl={f.avatar_url}
                name={f.display_name || f.username || '?'}
                size="sm"
              />
            </button>
          ))}
          {overflow > 0 && (
            <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground flex-shrink-0">
              +{overflow}
            </div>
          )}
        </div>
        <p className="country-panel-friends-label">{label}</p>
      </div>
    );
  }

  // sidebar variant
  return (
    <section className="card-elevated p-6 space-y-4">
      <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
        <Users className="w-4 h-4" />
        Friends here
        <span className="ml-auto text-sm font-normal text-muted-foreground">{friends.length}</span>
      </h2>
      <ul className="space-y-3">
        {friends.slice(0, 6).map(f => {
          const name = f.display_name || f.username || 'Someone';
          return (
            <li key={f.user_id}>
              <button
                className="w-full flex items-center gap-3 group text-left"
                onClick={() => f.username && navigate(`/u/${f.username}`)}
                disabled={!f.username}
              >
                <FriendAvatar avatarUrl={f.avatar_url} name={name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {name}
                  </p>
                  {f.most_recent_visit && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(f.most_recent_visit), 'MMM yyyy')}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
