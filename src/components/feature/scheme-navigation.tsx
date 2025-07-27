'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, Bot, Mic, Square, User } from 'lucide-react';
import { navigateGovernmentSchemes } from '@/ai/flows/government-scheme-navigation';
import { transcribeSchemeQuery } from '@/ai/flows/transcribe-scheme-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { translations } from '@/lib/i18n';
import { Loader } from '@/components/ui/loader';

type Status = 'idle' | 'recording' | 'processing-audio' | 'processing-text';

interface SchemeNavigationProps {
  language: string;
}

export default function SchemeNavigation({ language }: SchemeNavigationProps) {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [result, setResult] = useState<{ answer: string; audioOutput: string } | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const t = translations[language];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audioRef.current = audio;
      audio.autoplay = true;
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      };
    }
  }, []);

  useEffect(() => {
    if (result?.audioOutput && audioRef.current) {
      audioRef.current.src = result.audioOutput;
      audioRef.current.play();
    }
  }, [result]);

  const startRecording = async () => {
    setResult(null);
    setQuery('');
    setSubmittedQuery('');
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
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleStopRecording = async () => {
    setStatus('processing-audio');
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const audioDataUri = reader.result as string;
      try {
        const response = await transcribeSchemeQuery({ audioDataUri, language });
        const transcribedText = response.transcribedText;
        setQuery(transcribedText);
        // Automatically trigger the search after transcription
        await handleSearch(transcribedText);
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

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSearch(query);
  };
  
  const handleSearch = async (searchText: string) => {
    if (!searchText.trim()) {
      toast({
        title: t.questionIsEmpty,
        description: t.enterYourQuestion,
        variant: 'destructive',
      });
      setStatus('idle');
      return;
    }

    setStatus('processing-text');
    setResult(null);
    setSubmittedQuery(searchText);
    if (audioRef.current) {
      audioRef.current.pause();
    }

    try {
      const response = await navigateGovernmentSchemes({ query: searchText, language });
      setResult(response);
    } catch (error) {
      console.error('Error fetching scheme information:', error);
      toast({
        title: 'Error',
        description: t.failedToGetSchemeInfo,
        variant: 'destructive',
      });
    } finally {
      setStatus('idle');
    }
  };

  const isLoading = status === 'processing-audio' || status === 'processing-text';

  const getButtonText = () => {
    switch (status) {
      case 'processing-audio':
        return t.processing;
      case 'processing-text':
        return t.searching;
      default:
        return t.askWithVoice;
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t.governmentSchemeNavigator}</CardTitle>
        <CardDescription>{t.schemeNavigatorDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="query">{t.yourQuestion}</Label>
            <Textarea
              id="query"
              placeholder={t.schemePlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={isLoading || !query} className="w-full sm:w-auto">
              <HelpCircle className="mr-2 h-4 w-4" />
              {status === 'processing-text' ? t.searching : t.askQuestion}
            </Button>
            {status === 'recording' ? (
              <Button onClick={stopRecording} variant="destructive" className="w-full sm:w-auto">
                <Square className="mr-2 h-4 w-4" /> {t.stopRecording}
              </Button>
            ) : (
              <Button onClick={startRecording} disabled={isLoading} variant="outline" type="button" className="w-full sm:w-auto">
                <Mic className="mr-2 h-4 w-4" />
                {getButtonText()}
              </Button>
            )}
          </div>
        </form>

        {isLoading && <Loader />}

        {result && (
          <div className="pt-6 space-y-4">
            {submittedQuery && (
               <Alert>
                  <User className="h-4 w-4" />
                  <AlertTitle>{t.yourQuery}</AlertTitle>
                  <AlertDescription>
                    <p className="font-semibold">{submittedQuery}</p>
                  </AlertDescription>
              </Alert>
            )}
            <Alert>
              <Bot className="h-4 w-4" />
              <AlertTitle>{t.answerIn(language)}</AlertTitle>
              <AlertDescription>
                <p className="whitespace-pre-wrap">{result.answer}</p>
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
