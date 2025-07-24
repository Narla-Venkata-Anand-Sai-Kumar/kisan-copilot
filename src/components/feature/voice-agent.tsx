'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Bot, Loader2, User, Sparkles } from 'lucide-react';
import { voiceFirstInteraction } from '@/ai/flows/voice-first-interaction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { translations } from '@/lib/i18n';

type Status = 'idle' | 'recording' | 'processing' | 'playing';

interface InteractionResult {
  transcribedText: string;
  responseText: string;
  audioOutput: string;
}
interface VoiceAgentProps {
  language: string;
}

export default function VoiceAgent({ language }: VoiceAgentProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<InteractionResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

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
       // Stop all media tracks to turn off the microphone indicator
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
        if (audioRef.current) {
          audioRef.current.src = response.audioOutput;
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
          <Button onClick={stopRecording} variant="destructive" size="lg" className="w-48">
            <Square className="mr-2 h-5 w-5" /> {t.stopRecording}
          </Button>
        );
      case 'processing':
        return (
          <Button disabled size="lg" className="w-48">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t.processing}
          </Button>
        );
      case 'playing':
        return (
          <Button disabled size="lg" className="w-48">
            <Bot className="mr-2 h-5 w-5" /> {t.playing}
          </Button>
        );
      case 'idle':
      default:
        return (
          <Button onClick={startRecording} size="lg" className="w-48">
            <Mic className="mr-2 h-5 w-5" /> {t.startRecording}
          </Button>
        );
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t.voiceAgentIn(language)}</CardTitle>
        <CardDescription>
          {t.voiceAgentDescription(language)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-6 p-10">
        <div
          className={`h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300
          ${status === 'recording' ? 'bg-destructive/20 scale-110 animate-pulse' : 'bg-muted'}
          ${status === 'processing' ? 'bg-primary/20' : ''}
          ${status === 'playing' ? 'bg-accent/20' : ''}`}
        >
          {status === 'recording' && <Mic className="h-10 w-10 text-destructive" />}
          {status === 'processing' && <Loader2 className="h-10 w-10 text-primary animate-spin" />}
          {status === 'playing' && <Bot className="h-10 w-10 text-accent" />}
          {status === 'idle' && <Mic className="h-10 w-10 text-muted-foreground" />}
        </div>
        {renderButton()}

        {result && (
          <div className="w-full pt-4 space-y-4">
            <Alert>
              <User className="h-4 w-4" />
              <AlertTitle>{t.yourQueryTranscribed}</AlertTitle>
              <AlertDescription>
                <p className="font-semibold">{result.transcribedText}</p>
              </AlertDescription>
            </Alert>
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>{t.aiResponse}</AlertTitle>
              <AlertDescription>
                 <p className="mb-2">{result.responseText}</p>
                 {result.audioOutput && <audio controls autoPlay src={result.audioOutput} className="w-full mt-2" aria-label="AI voice response" />}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
