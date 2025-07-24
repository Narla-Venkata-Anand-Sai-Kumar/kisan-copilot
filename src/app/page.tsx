import { Leaf, LineChart, Landmark, Mic } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CropDiagnosis from '@/components/feature/crop-diagnosis';
import PriceForecasting from '@/components/feature/price-forecasting';
import SchemeNavigation from '@/components/feature/scheme-navigation';
import VoiceAgent from '@/components/feature/voice-agent';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
        <h1 className="text-2xl font-bold font-headline text-primary-foreground bg-primary py-1 px-3 rounded-lg shadow-md">
          Kisan Copilot
        </h1>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Tabs defaultValue="crop-diagnosis" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="crop-diagnosis" className="flex-col md:flex-row gap-2 py-2 text-xs md:text-sm">
              <Leaf className="h-5 w-5" />
              <span>Crop Diagnosis</span>
            </TabsTrigger>
            <TabsTrigger value="price-forecasting" className="flex-col md:flex-row gap-2 py-2 text-xs md:text-sm">
              <LineChart className="h-5 w-5" />
              <span>Price Forecasting</span>
            </TabsTrigger>
            <TabsTrigger value="scheme-navigation" className="flex-col md:flex-row gap-2 py-2 text-xs md:text-sm">
              <Landmark className="h-5 w-5" />
              <span>Scheme Help</span>
            </TabsTrigger>
            <TabsTrigger value="voice-agent" className="flex-col md:flex-row gap-2 py-2 text-xs md:text-sm">
              <Mic className="h-5 w-5" />
              <span>Voice Agent</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="crop-diagnosis">
            <CropDiagnosis />
          </TabsContent>
          <TabsContent value="price-forecasting">
            <PriceForecasting />
          </TabsContent>
          <TabsContent value="scheme-navigation">
            <SchemeNavigation />
          </TabsContent>
          <TabsContent value="voice-agent">
            <VoiceAgent />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
