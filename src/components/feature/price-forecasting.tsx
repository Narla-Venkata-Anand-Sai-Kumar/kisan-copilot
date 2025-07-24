'use client';

import { useState } from 'react';
import { TrendingUp, Coins, Building2 } from 'lucide-react';
import { marketPriceForecasting } from '@/ai/flows/market-price-forecasting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function PriceForecasting() {
  const [crop, setCrop] = useState('');
  const [location, setLocation] = useState('');
  const [result, setResult] = useState<{ forecast: string; suggestion: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crop || !location) {
      toast({
        title: 'Missing information',
        description: 'Please enter both crop and location.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await marketPriceForecasting({ crop, location });
      setResult(response);
    } catch (error) {
      console.error('Error fetching price forecast:', error);
      toast({
        title: 'Error',
        description: 'Failed to get price forecast. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Market Price Forecasting</CardTitle>
        <CardDescription>Get real-time market price forecasts and selling suggestions in Kannada.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="crop">Crop Name</Label>
              <div className="relative">
                 <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                 <Input id="crop" placeholder="e.g., Tomato" value={crop} onChange={(e) => setCrop(e.target.value)} required className="pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input id="location" placeholder="e.g., Kolar" value={location} onChange={(e) => setLocation(e.target.value)} required className="pl-10" />
              </div>
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
            <TrendingUp className="mr-2 h-4 w-4" />
            {isLoading ? 'Forecasting...' : 'Get Forecast'}
          </Button>
        </form>

        {isLoading && (
          <div className="space-y-4 pt-6">
             <div className="space-y-2">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4 pt-6">
            <Alert>
              <AlertTitle>Forecast (in Kannada)</AlertTitle>
              <AlertDescription className="text-lg font-semibold">{result.forecast}</AlertDescription>
            </Alert>
            <Alert>
              <AlertTitle>Suggestion (in Kannada)</AlertTitle>
              <AlertDescription className="text-lg font-semibold">{result.suggestion}</AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
