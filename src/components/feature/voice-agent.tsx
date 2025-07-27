'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Bot, Loader2 } from 'lucide-react';
import { voiceFirstInteraction } from '@/ai/flows/voice-first-interaction';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { translations } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

type Status = 'idle' | 'recording' | 'processing' | 'playing';

interface InteractionResult {
  transcribedText: string;
  responseText: string;
  audioOutput: string;
}
interface VoiceAgentProps {
  className?: string;
}

export default function VoiceAgent({ className }: VoiceAgentProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [setResult] = useState<InteractionResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const { language } = useLanguage();

  const t = translations[language];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audioRef.current = audio;
      audio.autoplay = true;
      audio.onplay = () => setStatus('playing');
      audio.onpause = () => setStatus('idle');
      audio.onended = () => setStatus('idle');
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      };
    }
  }, []);

  const startRecording = async () => {
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = handleStopRecording;
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setStatus('recording');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: t.microphoneError,
        description: t.microphoneErrorDescription,
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
       mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleStopRecording = async () => {
    setStatus('processing');
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const audioDataUri = reader.result as string;
      try {
        const response = await voiceFirstInteraction({ audioDataUri, language });
        setResult(response);
        if (audioRef.current && response.audioOutput) {
          audioRef.current.src = response.audioOutput;
        } else {
            setStatus('idle');
        }
      } catch (error) {
        console.error('Error with voice interaction:', error);
        toast({
          title: t.aiError,
          description: t.failedToProcessVoice,
          variant: 'destructive',
        });
        setStatus('idle');
      }
    };
  };

 const renderButton = () => {
    switch (status) {
      case 'recording':
        return (
          <Button onClick={stopRecording} variant="destructive" size="lg" className="w-full">
            <Square className="mr-2 h-5 w-5" /> {t.stopRecording}
          </Button>
        );
      case 'processing':
        return (
          <Button disabled size="lg" className="w-full bg-accent hover:bg-accent text-accent-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t.processing}
          </Button>
        );
      case 'playing':
        return (
          <Button disabled size="lg" className="w-full bg-accent hover:bg-accent text-accent-foreground">
            <Bot className="mr-2 h-5 w-5" /> {t.playing}
          </Button>
        );
      case 'idle':
      default:
        return (
          <Button onClick={startRecording} size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            <Mic className="mr-2 h-5 w-5" /> {t.startListening}
          </Button>
        );
    }
  };

  return (
    <Card className={cn("shadow-xl border-none w-full max-w-sm", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-left w-full">
          <Label className="text-muted-foreground">{`${t.languageLabel}: ${language}`}</Label>
        </div>
        {renderButton()}
        
        <button onClick={status === 'recording' ? stopRecording : startRecording} className={cn('h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 text-foreground',
           status === 'recording' ? 'bg-red-500/20' : 'bg-muted'
        )}>
            <Mic className="h-8 w-8" />
        </button>

      </CardContent>
    </Card>
  );
}
