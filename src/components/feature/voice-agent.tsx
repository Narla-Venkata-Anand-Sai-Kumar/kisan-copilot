'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Bot, Loader2, User, Sparkles } from 'lucide-react';
import { voiceFirstInteraction } from '@/ai/flows/voice-first-interaction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { translations } from '@/lib/i18n';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Status = 'idle' | 'recording' | 'processing' | 'playing';

interface InteractionResult {
  transcribedText: string;
  responseText: string;
  audioOutput: string;
}

export default function VoiceAgent() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<InteractionResult | null>(null);
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

 const getButtonText = () => {
    switch (status) {
      case 'recording': return t.stopRecording;
      case 'processing': return t.processing;
      case 'playing': return t.playing;
      default: return t.startListening;
    }
  }

 const getButtonIcon = () => {
     switch (status) {
      case 'recording': return <Square className="h-5 w-5" />;
      case 'processing': return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'playing': return <Bot className="h-5 w-5" />;
      default: return <Mic className="h-5 w-5" />;
    }
 }

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">{t.voiceAgentIn(language)}</CardTitle>
        <CardDescription>{t.voiceAgentDescription(language)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-6">
        <Button 
          onClick={status === 'recording' ? stopRecording : startRecording}
          disabled={status === 'processing' || status === 'playing'}
          variant={status === 'recording' ? 'destructive' : 'default'}
          size="lg" 
          className="w-full max-w-xs h-16 text-lg bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {getButtonIcon()}
          {getButtonText()}
        </Button>
        
        {result && (
          <div className="w-full space-y-4 pt-4">
              {result.transcribedText && (
                 <Alert>
                    <User className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary">{t.yourQueryTranscribed}</AlertTitle>
                    <AlertDescription>
                      <p className="font-semibold">{result.transcribedText}</p>
                    </AlertDescription>
                </Alert>
              )}
              <Alert>
                <Sparkles className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary">{t.aiResponse}</AlertTitle>
                <AlertDescription>
                  <p className="whitespace-pre-wrap">{result.responseText}</p>
                  {result.audioOutput && (
                    <audio
                      controls
                      autoPlay
                      src={result.audioOutput}
                      className="w-full mt-2"
                      aria-label="AI voice response"
                    />
                  )}
                </AlertDescription>
              </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
