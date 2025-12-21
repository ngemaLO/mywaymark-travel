import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Share2, Menu, X, MapPin, Clock, Settings, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
  const navigate = useNavigate();
  const location = useLocation();

  return (
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
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex"
          >
            <User className="w-4 h-4" />
          </Button>

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
                
                <Button variant="outline" className="justify-start gap-3">
                  <Upload className="w-4 h-4" />
                  Import Data
                </Button>
                
                <Button className="justify-start gap-3">
                  <Share2 className="w-4 h-4" />
                  Share Profile
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
