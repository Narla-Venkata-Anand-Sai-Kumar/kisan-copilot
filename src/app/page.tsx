'use client';
import { useState } from 'react';
import { Leaf, LineChart, Landmark, Mic, Languages, BarChart } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { translations } from '@/lib/i18n';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CropDiagnosis from '@/components/feature/crop-diagnosis';
import PriceForecasting from '@/components/feature/price-forecasting';
import SchemeNavigation from '@/components/feature/scheme-navigation';
import VoiceAgent from '@/components/feature/voice-agent';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function FeatureCard({ icon, title, description, value, onSelect }) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-300"
      onClick={() => onSelect(value)}
    >
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <div className="bg-accent/10 p-3 rounded-md">{icon}</div>
        <CardTitle className="text-lg text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  )
}


export default function Home() {
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState('home');

  const t = translations[language];

  if (activeTab !== 'home') {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
           <h1 onClick={() => setActiveTab('home')} className="text-2xl font-bold text-primary cursor-pointer">
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
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="crop-diagnosis" className="flex flex-col md:flex-row items-center gap-2 py-2 text-xs md:text-sm">
                <Leaf className="h-5 w-5" />
                <span>{t.cropDiagnosis}</span>
              </TabsTrigger>
              <TabsTrigger value="price-forecasting" className="flex flex-col md:flex-row items-center gap-2 py-2 text-xs md:text-sm">
                <LineChart className="h-5 w-5" />
                <span>{t.priceForecasting}</span>
              </TabsTrigger>
              <TabsTrigger value="scheme-navigation" className="flex flex-col md:flex-row items-center gap-2 py-2 text-xs md:text-sm">
                <Landmark className="h-5 w-5" />
                <span>{t.schemeHelp}</span>
              </TabsTrigger>
              <TabsTrigger value="farm-analytics" className="flex flex-col md:flex-row items-center gap-2 py-2 text-xs md:text-sm">
                <BarChart className="h-5 w-5" />
                <span>{t.farmAnalytics}</span>
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
            <TabsContent value="farm-analytics">
               <Card>
                <CardHeader>
                  <CardTitle>{t.farmAnalytics}</CardTitle>
                  <CardDescription>This feature is coming soon.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Farm analytics will provide insights into your farm's performance.</p>
                </CardContent>
              </Card>
            </TabsContent>
             <TabsContent value="voice-agent">
                <VoiceAgent />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  }

  return (
      <div className="flex flex-col min-h-screen bg-background">
          <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
              <h1 className="text-5xl font-bold text-primary">
                  {t.welcomeToGreenPulse}
              </h1>
              <p className="mt-2 text-xl text-primary/80">
                  {t.aiPoweredFarmAssistant}
              </p>

              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
                  <FeatureCard 
                      icon={<Leaf className="h-6 w-6 text-accent" />}
                      title={t.cropDiseaseDetection}
                      description={t.cropDiseaseDescription}
                      value="crop-diagnosis"
                      onSelect={setActiveTab}
                  />
                  <FeatureCard 
                      icon={<LineChart className="h-6 w-6 text-accent" />}
                      title={t.marketPrices}
                      description={t.marketPricesDescription}
                      value="price-forecasting"
                      onSelect={setActiveTab}
                  />
                  <FeatureCard 
                      icon={<Landmark className="h-6 w-6 text-accent" />}
                      title={t.governmentSchemes}
                      description={t.governmentSchemesDescription}
                      value="scheme-navigation"
                      onSelect={setActiveTab}
                  />
                  <FeatureCard 
                      icon={<BarChart className="h-6 w-6 text-accent" />}
                      title={t.farmAnalytics}
                      description={t.farmAnalyticsDescription}
                      value="farm-analytics"
                      onSelect={setActiveTab}
                  />
              </div>
              <div className="mt-8 text-center">
                  <p className="text-muted-foreground flex items-center justify-center gap-2">
                    <Mic className="h-4 w-4" /> {t.speakNaturally}
                  </p>
              </div>
          </main>
          
          <div className="fixed bottom-4 right-4">
              <VoiceAgent />
          </div>
          
           <div className="fixed top-4 right-4">
              <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language-global" className="w-[150px] bg-card">
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
      </div>
  );
}
