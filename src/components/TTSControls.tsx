import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Settings2 } from 'lucide-react';
import { useTextToSpeech, useAvailableVoices, pickCalmVoice, type TTSOptions } from '@/hooks/useSpeech';

interface TTSControlsProps {
  text: string;
  /** If true, auto-select a calm voice as default */
  preferCalm?: boolean;
  className?: string;
}

export function TTSControls({ text, preferCalm = false, className }: TTSControlsProps) {
  const tts = useTextToSpeech();
  const voices = useAvailableVoices();
  const [rate, setRate] = useState(preferCalm ? 0.85 : 0.95);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(-1);

  if (!tts.isSupported || !text) return null;

  const getVoice = (): SpeechSynthesisVoice | undefined => {
    if (selectedVoiceIndex >= 0 && voices[selectedVoiceIndex]) {
      return voices[selectedVoiceIndex].voice;
    }
    if (preferCalm) return pickCalmVoice(voices);
    return undefined;
  };

  const handleSpeak = () => {
    if (tts.isSpeaking) {
      tts.stop();
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
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        {tts.isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        {tts.isSpeaking ? 'Stop' : 'Read'}
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
        </PopoverContent>
      </Popover>
    </div>
  );
}
