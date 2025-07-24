'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, Bot } from 'lucide-react';
import { navigateGovernmentSchemes } from '@/ai/flows/government-scheme-navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { translations } from '@/lib/i18n';

interface SchemeNavigationProps {
  language: string;
}

export default function SchemeNavigation({ language }: SchemeNavigationProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ answer: string, audioOutput: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    }
  }, [result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) {
      toast({
        title: t.questionIsEmpty,
        description: t.enterYourQuestion,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    if(audioRef.current) {
      audioRef.current.pause();
    }

    try {
      const response = await navigateGovernmentSchemes({ query, language });
      setResult(response);
    } catch (error) {
      console.error('Error fetching scheme information:', error);
      toast({
        title: 'Error',
        description: t.failedToGetSchemeInfo,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t.governmentSchemeNavigator}</CardTitle>
        <CardDescription>{t.schemeNavigatorDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="query">{t.yourQuestion}</Label>
            <Textarea
              id="query"
              placeholder={t.schemePlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            <HelpCircle className="mr-2 h-4 w-4" />
            {isLoading ? t.searching : t.askQuestion}
          </Button>
        </form>

        {isLoading && (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
          </div>
        )}

        {result && (
          <div className="pt-6 space-y-4">
            <Alert>
              <Bot className="h-4 w-4" />
              <AlertTitle>{t.answerIn(language)}</AlertTitle>
              <AlertDescription>
                <p className="whitespace-pre-wrap">{result.answer}</p>
              </AlertDescription>
            </Alert>
            <Alert>
              <Bot className="h-4 w-4" />
              <AlertTitle>{t.voiceResponse}</AlertTitle>
              <AlertDescription>
                {result.audioOutput && <audio controls autoPlay src={result.audioOutput} className="w-full mt-2" aria-label="AI voice response" />}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
