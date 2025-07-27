
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
import { useLanguage } from '@/context/language-context';
import { translations } from '@/lib/i18n';
import { Loader } from '@/components/ui/loader';

type Status = 'idle' | 'recording' | 'processing-audio' | 'processing-text';

export default function SchemeNavigation() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [result, setResult] = useState<{ answer: string; audioOutput: string } | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { language } = useLanguage();

  const t = translations[language];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
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
    <Card className="shadow-lg border-none">
      <CardHeader className="p-8">
        <CardTitle className="text-3xl text-primary">{t.governmentSchemeNavigator}</CardTitle>
        <CardDescription className="text-base">{t.schemeNavigatorDescription}</CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <form onSubmit={handleTextSubmit} className="space-y-6 p-6 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="query" className="text-lg">{t.yourQuestion}</Label>
            <Textarea
              id="query"
              placeholder={t.schemePlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={5}
              disabled={isLoading}
              className="bg-background text-base"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button type="submit" disabled={isLoading || !query} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-8 text-base">
              <HelpCircle className="mr-2 h-5 w-5" />
              {status === 'processing-text' ? t.searching : t.askQuestion}
            </Button>
            {status === 'recording' ? (
              <Button onClick={stopRecording} variant="destructive" className="w-full sm:w-auto h-12 px-8 text-base">
                <Square className="mr-2 h-5 w-5" /> {t.stopRecording}
              </Button>
            ) : (
              <Button onClick={startRecording} disabled={isLoading} variant="outline" type="button" className="w-full sm:w-auto h-12 px-8 text-base">
                <Mic className="mr-2 h-5 w-5" />
                {getButtonText()}
              </Button>
            )}
          </div>
        </form>

        {isLoading && <Loader />}

        {result && (
          <div className="pt-8 space-y-6">
            {submittedQuery && (
               <Alert>
                  <User className="h-5 w-5 text-primary" />
                  <AlertTitle className="text-lg text-primary">{t.yourQuery}</AlertTitle>
                  <AlertDescription>
                    <p className="text-base font-semibold">{submittedQuery}</p>
                  </AlertDescription>
              </Alert>
            )}
            <Alert>
              <Bot className="h-5 w-5 text-primary" />
              <AlertTitle className="text-lg text-primary">{t.answerIn(language)}</AlertTitle>
              <AlertDescription>
                <p className="whitespace-pre-wrap text-base">{result.answer}</p>
                {result.audioOutput && (
                  <audio
                    controls
                    src={result.audioOutput}
                    ref={audioRef}
                    className="w-full mt-4"
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
