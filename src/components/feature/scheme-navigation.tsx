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

interface SchemeNavigationProps {
  language: string;
}

export default function SchemeNavigation({ language }: SchemeNavigationProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ answer: string, audioOutput: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audioRef.current = audio;
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
      audioRef.current.play().catch(e => console.error("Audio autoplay failed:", e));
    }
  }, [result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) {
      toast({
        title: 'Question is empty',
        description: 'Please enter your question about government schemes.',
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
        description: 'Failed to get scheme information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Government Scheme Navigator</CardTitle>
        <CardDescription>Ask about government schemes for farmers and get answers in your selected language.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="query">Your Question</Label>
            <Textarea
              id="query"
              placeholder="e.g., What is PM-Kisan scheme and who is eligible?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="space-y-1.5 flex-grow">
               <Label>Language: {language}</Label>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              <HelpCircle className="mr-2 h-4 w-4" />
              {isLoading ? 'Searching...' : 'Ask Question'}
            </Button>
          </div>
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
              <AlertTitle>Answer (in {language})</AlertTitle>
              <AlertDescription>
                <p className="whitespace-pre-wrap">{result.answer}</p>
              </AlertDescription>
            </Alert>
            <Alert>
              <Bot className="h-4 w-4" />
              <AlertTitle>Voice Response</AlertTitle>
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
