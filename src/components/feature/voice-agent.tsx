'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Bot, Loader2 } from 'lucide-react';
import { voiceFirstInteraction } from '@/ai/flows/voice-first-interaction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Status = 'idle' | 'recording' | 'processing' | 'playing';

export default function VoiceAgent() {
  const [status, setStatus] = useState<Status>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setStatus('idle');
      return () => {
        if(audioRef.current) {
          audioRef.current.onended = null;
        }
      }
    }
  }, []);

  const startRecording = async () => {
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
        title: 'Microphone Error',
        description: 'Could not access microphone. Please check your browser permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
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
        const response = await voiceFirstInteraction({ audioDataUri });
        setAudioUrl(response.audioOutput);
        if (audioRef.current) {
          audioRef.current.src = response.audioOutput;
          audioRef.current.play();
          setStatus('playing');
        }
      } catch (error) {
        console.error('Error with voice interaction:', error);
        toast({
          title: 'AI Error',
          description: 'Failed to process voice command. Please try again.',
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
            <Square className="mr-2 h-5 w-5" /> Stop Recording
          </Button>
        );
      case 'processing':
        return (
          <Button disabled size="lg" className="w-48">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
          </Button>
        );
      case 'playing':
         return (
          <Button disabled size="lg" className="w-48">
            <Bot className="mr-2 h-5 w-5" /> Playing...
          </Button>
        );
      case 'idle':
      default:
        return (
          <Button onClick={startRecording} size="lg" className="w-48">
            <Mic className="mr-2 h-5 w-5" /> Start Recording
          </Button>
        );
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Voice Agent (Kannada)</CardTitle>
        <CardDescription>
          Press the button and speak your query in Kannada. The AI will respond in voice.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-6 p-10">
        <div className={`h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300
          ${status === 'recording' ? 'bg-destructive/20 scale-110 animate-pulse' : 'bg-muted'}
          ${status === 'processing' ? 'bg-primary/20' : ''}
          ${status === 'playing' ? 'bg-accent/20' : ''}`}>
          {status === 'recording' && <Mic className="h-10 w-10 text-destructive" />}
          {status === 'processing' && <Loader2 className="h-10 w-10 text-primary animate-spin" />}
          {status === 'playing' && <Bot className="h-10 w-10 text-accent" />}
          {status === 'idle' && <Mic className="h-10 w-10 text-muted-foreground" />}
        </div>
        {renderButton()}
        
        {audioUrl && (
          <div className="w-full pt-4">
             <Alert>
              <AlertTitle>Audio Response</AlertTitle>
              <AlertDescription>
                <audio controls src={audioUrl} className="w-full mt-2" aria-label="AI voice response" />
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
