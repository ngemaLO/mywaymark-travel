import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  User, 
  Shield, 
  Download, 
  Trash2, 
  LogOut,
  Upload,
  Link as LinkIcon
} from 'lucide-react';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';

export default function Settings() {
  const [privacyNoTracking, setPrivacyNoTracking] = useState(true);
  const [displayName, setDisplayName] = useState('Explorer');

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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>No Background Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Disable all background location tracking and data collection
                </p>
              </div>
              <Switch
                checked={privacyNoTracking}
                onCheckedChange={setPrivacyNoTracking}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <Label>Share Links</Label>
              <p className="text-sm text-muted-foreground">
                Manage your active share links and their permissions.
              </p>
              <Button variant="outline" size="sm" className="gap-2">
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
                  Import from Google Timeline or Flights CSV
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
