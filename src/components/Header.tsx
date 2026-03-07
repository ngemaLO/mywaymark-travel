import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, MapPin, Clock, Settings, User, LogOut, Link as LinkIcon, Plus, Navigation, BookOpen } from 'lucide-react';
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
  { label: 'Letters', path: '/letters', icon: BookOpen },
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className={cn(
                  "gap-2",
                  location.pathname === item.path && "text-primary font-medium"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2"
                  onClick={() => setCheckInOpen(true)}
                >
                  <Navigation className="w-4 h-4" />
                  Check In
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2"
                  onClick={() => setAddTripOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add Entry
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShareModalOpen(true)}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/share-links')}
                  title="Shared links"
                >
                  <LinkIcon className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
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

          {/* Mobile: only show share/profile actions */}
          <div className="flex md:hidden items-center gap-1">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShareModalOpen(true)}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
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
                    <DropdownMenuItem onClick={() => navigate('/share-links')}>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Shared Links
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
        </div>
      </header>

      <ShareModal open={shareModalOpen} onOpenChange={setShareModalOpen} />
      <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
      <CheckInModal open={checkInOpen} onOpenChange={setCheckInOpen} />
    </>
  );
}
