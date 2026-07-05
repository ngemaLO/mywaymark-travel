import { useRef, useState, useEffect, useCallback } from 'react';
import { ImagePlus, Loader2, Play, Trash2, X, ChevronLeft, ChevronRight, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useVisitMedia,
  useUploadVisitPhotos,
  useAddVisitVideo,
  useDeleteVisitMedia,
  getYouTubeId,
  getVimeoId,
} from '@/hooks/useVisitMedia';
import type { VisitMedia } from '@/hooks/useVisitMedia';

interface VisitMediaGalleryProps {
  visitId: string;
}

function mediaThumbnail(m: VisitMedia): string | null {
  if (m.media_type === 'photo') return m.url;
  const ytId = getYouTubeId(m.url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
  return null;
}

function VideoEmbed({ url }: { url: string }) {
  const ytId = getYouTubeId(url);
  const vimeoId = getVimeoId(url);
  if (ytId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytId}`}
        className="w-full aspect-video rounded-xl"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  if (vimeoId) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoId}`}
        className="w-full aspect-video rounded-xl"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return <p className="text-sm text-muted-foreground">Unsupported video URL</p>;
}

function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: VisitMedia[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const item = items[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {index > 0 && (
        <button
          className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Previous"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      <div
        className="max-w-4xl max-h-[90vh] w-full mx-16 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {item.media_type === 'photo' ? (
          <img
            src={item.url}
            alt=""
            className="max-w-full max-h-[85vh] rounded-xl object-contain"
          />
        ) : (
          <div className="w-full">
            <VideoEmbed url={item.url} />
          </div>
        )}
      </div>

      {index < items.length - 1 && (
        <button
          className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <p className="absolute bottom-4 text-white/60 text-sm">
        {index + 1} / {items.length}
      </p>
    </div>
  );
}

export function VisitMediaGallery({ visitId }: VisitMediaGalleryProps) {
  const { data: media = [], isLoading } = useVisitMedia(visitId);
  const uploadPhotos = useUploadVisitPhotos();
  const addVideo = useAddVisitVideo();
  const deleteMedia = useDeleteVisitMedia();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await uploadPhotos.mutateAsync({ visitId, files: Array.from(files) });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [visitId, uploadPhotos]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleAddVideo = async () => {
    if (!videoUrl.trim()) return;
    await addVideo.mutateAsync({ visitId, url: videoUrl.trim() });
    setVideoUrl('');
    setShowVideoInput(false);
  };

  const handleDelete = (m: VisitMedia) => {
    deleteMedia.mutate({ id: m.id, visitId, storagePath: m.storage_path });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading media…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {media.map((m, i) => {
            const thumb = mediaThumbnail(m);
            return (
              <div
                key={m.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-muted/40 cursor-pointer"
                onClick={() => setLightboxIndex(i)}
              >
                {thumb ? (
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Play className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                {m.media_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-8 h-8 text-white drop-shadow" />
                  </div>
                )}
                <button
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); handleDelete(m); }}
                  disabled={deleteMedia.isPending}
                  aria-label="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload zone */}
      <div
        className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {uploadPhotos.isPending ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Uploading…</span>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center gap-1">
            <ImagePlus className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Tap to add photos <span className="text-xs">(or drag & drop)</span>
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>

      {/* Video URL */}
      {showVideoInput ? (
        <div className="flex gap-2">
          <Input
            placeholder="YouTube or Vimeo URL…"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
            autoFocus
            className="flex-1 h-9 text-sm"
          />
          <Button size="sm" onClick={handleAddVideo} disabled={addVideo.isPending || !videoUrl.trim()}>
            {addVideo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowVideoInput(false); setVideoUrl(''); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowVideoInput(true)}
        >
          <Link className="w-3.5 h-3.5" />
          Add YouTube / Vimeo video
        </button>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          items={media}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setLightboxIndex(i => (i !== null && i < media.length - 1 ? i + 1 : i))}
        />
      )}
    </div>
  );
}
