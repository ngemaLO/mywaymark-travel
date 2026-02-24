import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Settings2, Sparkles, Loader2 } from 'lucide-react';
import { useTextToSpeech, useAvailableVoices, pickCalmVoice, type TTSOptions } from '@/hooks/useSpeech';
import { useIsPremium } from '@/hooks/usePremium';
import { toast } from 'sonner';

interface TTSControlsProps {
  text: string;
  /** If true, auto-select a calm voice as default */
  preferCalm?: boolean;
  className?: string;
}

const ELEVENLABS_VOICES = [
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', desc: 'Calm & warm' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', desc: 'Clear & natural' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', desc: 'Soft & friendly' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', desc: 'Deep & confident' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', desc: 'Warm & articulate' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', desc: 'Smooth & composed' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', desc: 'Bright & expressive' },
];

export function TTSControls({ text, preferCalm = false, className }: TTSControlsProps) {
  const tts = useTextToSpeech();
  const voices = useAvailableVoices();
  const { isPremium } = useIsPremium();
  const [rate, setRate] = useState(preferCalm ? 0.85 : 0.95);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(-1);
  const [usePremiumVoice, setUsePremiumVoice] = useState(true);
  const [selectedElevenLabsVoice, setSelectedElevenLabsVoice] = useState(
    preferCalm ? 'FGY2WhTYpPnrIDTdsKH5' : 'Xb7hH8MSUJpSbSDYk0k2'
  );
  const [isLoadingPremium, setIsLoadingPremium] = useState(false);
  const [isPremiumPlaying, setIsPremiumPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!tts.isSupported || !text) return null;

  const isSpeaking = tts.isSpeaking || isPremiumPlaying;

  const getVoice = (): SpeechSynthesisVoice | undefined => {
    if (selectedVoiceIndex >= 0 && voices[selectedVoiceIndex]) {
      return voices[selectedVoiceIndex].voice;
    }
    if (preferCalm) return pickCalmVoice(voices);
    return undefined;
  };

  const stopAll = () => {
    tts.stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPremiumPlaying(false);
    setIsLoadingPremium(false);
  };

  const playWithElevenLabs = async () => {
    setIsLoadingPremium(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId: selectedElevenLabsVoice, calm: preferCalm }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPremiumPlaying(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPremiumPlaying(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      setIsLoadingPremium(false);
      setIsPremiumPlaying(true);
      await audio.play();
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      setIsLoadingPremium(false);
      setIsPremiumPlaying(false);
      toast.error('Voice playback failed. Falling back to browser voice.');
      // Fallback to browser TTS
      const options: TTSOptions = { rate, voice: getVoice() };
      tts.speak(text, options);
    }
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      stopAll();
    } else if (isPremium && usePremiumVoice) {
      playWithElevenLabs();
    } else {
      const options: TTSOptions = { rate, voice: getVoice() };
      tts.speak(text, options);
    }
  };

  return (
    <div className={`flex items-center gap-0.5 ${className ?? ''}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSpeak}
        disabled={isLoadingPremium}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        {isLoadingPremium ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSpeaking ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
        {isLoadingPremium ? 'Loading' : isSpeaking ? 'Stop' : 'Read'}
        {isPremium && usePremiumVoice && !isSpeaking && !isLoadingPremium && (
                <Sparkles className="w-3 h-3 text-primary" />
        )}
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-4" align="end">
          {/* Premium voice toggle & picker */}
          {isPremium && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Natural Voice
                </label>
                <button
                  onClick={() => setUsePremiumVoice(!usePremiumVoice)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    usePremiumVoice ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${
                      usePremiumVoice ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {usePremiumVoice && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Voice
                  </label>
                  <select
                    value={selectedElevenLabsVoice}
                    onChange={(e) => setSelectedElevenLabsVoice(e.target.value)}
                    className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground"
                  >
                    {ELEVENLABS_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {v.desc}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Speed slider - only for browser voices */}
          {(!isPremium || !usePremiumVoice) && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Speed
                </label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[rate]}
                    onValueChange={([v]) => setRate(v)}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {rate.toFixed(1)}×
                  </span>
                </div>
              </div>

              {voices.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Voice
                  </label>
                  <select
                    value={selectedVoiceIndex}
                    onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
                    className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground"
                  >
                    <option value={-1}>Default{preferCalm ? ' (calm)' : ''}</option>
                    {voices.map((v, i) => (
                      <option key={i} value={i}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {!isPremium && (
            <p className="text-[10px] text-muted-foreground/60 leading-snug">
              Upgrade to Premium for natural human-like voices
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
