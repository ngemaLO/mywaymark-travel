import { Header } from '@/components/Header';
import { useShareLinks, useToggleShareLink, useDeleteShareLink } from '@/hooks/useShareLinks';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  Link as LinkIcon, 
  Copy, 
  Check,
  Trash2,
  ExternalLink,
  Calendar,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { ShareModal } from '@/components/ShareModal';

export default function ShareLinksManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: shareLinks = [], isLoading } = useShareLinks();
  const toggleMutation = useToggleShareLink();
  const deleteMutation = useDeleteShareLink();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleCopy = async (token: string, id: string) => {
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = (id: string, currentActive: boolean) => {
    toggleMutation.mutate({ id, active: !currentActive });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">
            Sign In Required
          </h1>
          <p className="text-muted-foreground mb-8">
            Please sign in to view your share links.
          </p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  const getScopesSummary = (link: typeof shareLinks[0]) => {
    const scopes = [];
    if (link.scope_map) scopes.push('Map');
    if (link.scope_stats) scopes.push('Stats');
    if (link.scope_badges) scopes.push('Badges');
    if (link.scope_timeline) scopes.push('Timeline');
    if (link.scope_notes) scopes.push('Notes');
    if (link.scope_images) scopes.push('Photos');
    return scopes.join(', ') || 'None';
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="gap-2 -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Shared Links
              </h1>
              <p className="text-muted-foreground text-sm">
                Your public travel profile links
              </p>
            </div>
          </div>
          <Button onClick={() => setShareModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Link
          </Button>
        </div>

        {/* Links List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : shareLinks.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <LinkIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-display font-semibold text-foreground mb-2">
              No Share Links Yet
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create a shareable link to let others view your travel profile.
            </p>
            <Button onClick={() => setShareModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Share Link
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {shareLinks.map(link => {
              const expired = isExpired(link.expires_at);
              const isActive = link.active && !expired;
              
              return (
                <div 
                  key={link.id}
                  className="card-elevated p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded truncate max-w-[200px]">
                          {link.token}
                        </code>
                        {expired && (
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                            Expired
                          </span>
                        )}
                        {!expired && !link.active && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            Disabled
                          </span>
                        )}
                        {isActive && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <strong>Sharing:</strong> {getScopesSummary(link)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Detail:</strong> {link.detail_level === 'detailed' ? 'Detailed' : 'Overview'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={link.active || false}
                        onCheckedChange={() => handleToggle(link.id, link.active || false)}
                        disabled={toggleMutation.isPending || expired}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Created {link.created_at ? format(new Date(link.created_at), 'MMM d, yyyy') : 'Unknown'}
                      </span>
                      {link.expires_at && (
                        <span>
                          Expires {format(new Date(link.expires_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(link.token, link.id)}
                        className="gap-1.5"
                      >
                        {copiedId === link.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        Copy
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/share/${link.token}`, '_blank')}
                        className="gap-1.5"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Preview
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Share Link</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this share link. Anyone with the link will no longer be able to view your profile.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(link.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ShareModal open={shareModalOpen} onOpenChange={setShareModalOpen} />
    </div>
  );
}
