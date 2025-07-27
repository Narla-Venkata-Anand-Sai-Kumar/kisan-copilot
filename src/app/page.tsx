
'use client';
import { useState } from 'react';
import { Leaf, LineChart, Landmark, Mic, Languages, CalendarDays } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { translations } from '@/lib/i18n';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CropDiagnosis from '@/components/feature/crop-diagnosis';
import PriceForecasting from '@/components/feature/price-forecasting';
import SchemeNavigation from '@/components/feature/scheme-navigation';
import VoiceAgent from '@/components/feature/voice-agent';
import CropAdvisory from '@/components/feature/crop-advisory';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Home() {
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState('crop-diagnosis');

  const t = translations[language];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-20 items-center justify-between gap-4 border-b bg-card px-6 md:px-8">
         <h1 className="text-3xl font-bold text-primary cursor-pointer">
            {t.kisanCopilot}
          </h1>
        <div className="flex items-center gap-2">
            <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language-global" className="w-[150px]">
                  <Languages className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kannada">Kannada</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="Tamil">Tamil</SelectItem>
                  <SelectItem value="Telugu">Telugu</SelectItem>
                </SelectContent>
              </Select>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 md:p-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
            <TabsTrigger value="crop-diagnosis" className="flex flex-col md:flex-row items-center gap-2 py-3 text-sm md:text-base">
              <Leaf className="h-6 w-6" />
              <span>{t.cropDiagnosis}</span>
            </TabsTrigger>
             <TabsTrigger value="crop-advisory" className="flex flex-col md:flex-row items-center gap-2 py-3 text-sm md:text-base">
              <CalendarDays className="h-6 w-6" />
              <span>{t.cropAdvisory}</span>
            </TabsTrigger>
            <TabsTrigger value="price-forecasting" className="flex flex-col md:flex-row items-center gap-2 py-3 text-sm md:text-base">
              <LineChart className="h-6 w-6" />
              <span>{t.priceForecasting}</span>
            </TabsTrigger>
            <TabsTrigger value="scheme-navigation" className="flex flex-col md:flex-row items-center gap-2 py-3 text-sm md:text-base">
              <Landmark className="h-6 w-6" />
              <span>{t.schemeHelp}</span>
            </TabsTrigger>
            <TabsTrigger value="voice-agent" className="flex flex-col md:flex-row items-center gap-2 py-3 text-sm md:text-base">
              <Mic className="h-6 w-6" />
              <span>{t.voiceAgent}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="crop-diagnosis">
            <CropDiagnosis />
          </TabsContent>
          <TabsContent value="crop-advisory">
            <CropAdvisory />
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
