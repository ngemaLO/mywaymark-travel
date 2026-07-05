import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, MapPin, Clock, Settings, User, LogOut, Plus, Navigation, BarChart2, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ShareModal } from '@/components/ShareModal';
import { AddTripModal } from '@/components/AddTripModal';
import { CheckInModal } from '@/components/CheckInModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { label: 'Dashboard', path: '/', icon: MapPin },
  { label: 'Timeline', path: '/timeline', icon: Clock },
  { label: 'Stats', path: '/stats', icon: BarChart2 },
  { label: 'Plan', path: '/plan', icon: Navigation },
  { label: 'Feed', path: '/feed', icon: Users },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function Header() {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [addTripOpen, setAddTripOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 md:h-16 items-center justify-between">
          {/* Logo */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold text-foreground">Waymark</span>
          </button>

          {/* Desktop: Clean minimal nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  location.pathname === item.path 
                    ? "text-foreground" 
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Desktop: Compact action group */}
          <div className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                <Button
                  size="sm"
                  onClick={() => setAddTripOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Log Visit
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setCheckInOpen(true)}>
                      <Navigation className="w-4 h-4 mr-2" />
                      Check In
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShareModalOpen(true)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate('/auth')}
                className="gap-2"
              >
                <User className="w-4 h-4" />
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile: minimal top actions */}
          <div className="flex md:hidden items-center gap-1">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <User className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCheckInOpen(true)}>
                    <Navigation className="w-4 h-4 mr-2" />
                    Check In
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShareModalOpen(true)}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate('/auth')}
                className="gap-2"
              >
                <User className="w-4 h-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <ShareModal open={shareModalOpen} onOpenChange={setShareModalOpen} />
      <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
      <CheckInModal open={checkInOpen} onOpenChange={setCheckInOpen} />
    </>
  );
}
