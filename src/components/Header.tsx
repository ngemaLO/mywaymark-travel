import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Share2, Menu, MapPin, Clock, Settings, User, LogOut, Link as LinkIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ShareModal } from '@/components/ShareModal';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

const navItems = [
  { label: 'Dashboard', path: '/', icon: MapPin },
  { label: 'Timeline', path: '/timeline', icon: Clock },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
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
        <div className="container flex h-16 items-center justify-between">
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
                  location.pathname === item.path && "bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Import
                </Button>
                
                <Button
                  size="sm"
                  className="hidden sm:flex gap-2"
                  onClick={() => setShareModalOpen(true)}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex"
                  onClick={() => navigate('/share-links')}
                  title="Manage share links"
                >
                  <LinkIcon className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex"
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

            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <nav className="flex flex-col gap-2 mt-8">
                  {navItems.map(item => (
                    <Button
                      key={item.path}
                      variant={location.pathname === item.path ? "secondary" : "ghost"}
                      className="justify-start gap-3"
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  ))}
                  
                  <hr className="my-4 border-border" />
                  
                  {user ? (
                    <>
                      <Button variant="outline" className="justify-start gap-3">
                        <Upload className="w-4 h-4" />
                        Import Data
                      </Button>
                      
                      <Button 
                        className="justify-start gap-3"
                        onClick={() => {
                          setShareModalOpen(true);
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                        Share Profile
                      </Button>

                      <Button 
                        variant="ghost" 
                        className="justify-start gap-3"
                        onClick={() => {
                          navigate('/share-links');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LinkIcon className="w-4 h-4" />
                        Manage Links
                      </Button>

                      <Button 
                        variant="ghost" 
                        className="justify-start gap-3 text-destructive"
                        onClick={() => {
                          handleSignOut();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <Button 
                      className="justify-start gap-3"
                      onClick={() => {
                        navigate('/auth');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <User className="w-4 h-4" />
                      Sign In
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <ShareModal open={shareModalOpen} onOpenChange={setShareModalOpen} />
    </>
  );
}
