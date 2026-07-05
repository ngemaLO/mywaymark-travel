import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Camera, Loader2 } from 'lucide-react';

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { update, uploadAvatar } = useProfile();

  const [name, setName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return <Navigate to="/auth" replace />;

  const initials = name.trim()
    ? name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : (user.email?.[0] ?? '?').toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      let avatar_url: string | undefined;
      if (avatarFile) {
        avatar_url = await uploadAvatar(avatarFile);
      }
      await update.mutateAsync({
        display_name: name.trim(),
        onboarding_complete: true,
        ...(avatar_url ? { avatar_url } : {}),
      });
      navigate('/', { replace: true });
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg mx-auto">
            <MapPin className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Welcome to Waymark</h1>
            <p className="text-muted-foreground mt-1">Let's set up your profile to get started.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 space-y-6">
          {/* Avatar upload */}
          <div className="flex flex-col items-center space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-primary flex items-center justify-center overflow-hidden group shadow-lg cursor-pointer"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                <Camera className="w-5 h-5 text-white" />
                <span className="text-xs text-white font-medium">
                  {avatarPreview ? 'Change' : 'Add photo'}
                </span>
              </div>
            </button>
            <p className="text-xs text-muted-foreground">
              {avatarFile ? avatarFile.name : 'Tap to add a profile photo'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              placeholder="e.g. Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This is how you'll appear in the app.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up…
              </>
            ) : (
              'Get started'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
