'use client';

import { useState, useRef, useEffect } from 'react';
import { TrendingUp, Coins, Building2, Bot } from 'lucide-react';
import { marketPriceForecasting } from '@/ai/flows/market-price-forecasting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader } from '@/components/ui/loader';
import { translations } from '@/lib/i18n';

interface PriceForecastingProps {
  language: string;
}

export default function PriceForecasting({ language }: PriceForecastingProps) {
  const [crop, setCrop] = useState('');
  const [location, setLocation] = useState('');
  const [result, setResult] = useState<{ forecast: string; suggestion: string; audioOutput: string; } | null>(null);
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
    if (!crop || !location) {
      toast({
        title: t.missingInformation,
        description: t.enterCropAndLocation,
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
      const response = await marketPriceForecasting({ crop, location, language });
      setResult(response);
    } catch (error) {
      console.error('Error fetching price forecast:', error);
      toast({
        title: 'Error',
        description: t.failedToGetForecast,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">{t.marketPriceForecasting}</CardTitle>
        <CardDescription>{t.marketPriceDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="crop" className="text-base">{t.cropName}</Label>
              <div className="relative">
                 <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                 <Input id="crop" placeholder={t.cropPlaceholder} value={crop} onChange={(e) => setCrop(e.target.value)} required className="pl-10 bg-background" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-base">{t.location}</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input id="location" placeholder={t.locationPlaceholder} value={location} onChange={(e) => setLocation(e.target.value)} required className="pl-10 bg-background" />
              </div>
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
            <TrendingUp className="mr-2 h-4 w-4" />
            {isLoading ? t.forecasting : t.getForecast}
          </Button>
        </form>

        {isLoading && <Loader />}

        {result && (
          <div className="space-y-4 pt-6">
            <Alert>
              <AlertTitle className="text-primary">{t.forecastIn(language)}</AlertTitle>
              <AlertDescription className="text-lg font-semibold">{result.forecast}</AlertDescription>
            </Alert>
            <Alert>
              <AlertTitle className="text-primary">{t.suggestionIn(language)}</AlertTitle>
              <AlertDescription className="text-lg font-semibold">{result.suggestion}</AlertDescription>
            </Alert>
             <Alert>
              <Bot className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">{t.voiceResponse}</AlertTitle>
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
