
'use client';

import { useState } from 'react';
import { Calendar, Droplets, Bug, Sprout, Hash } from 'lucide-react';
import { getCropAdvisoryCalendar, CropAdvisoryCalendarOutput } from '@/ai/flows/crop-advisory-calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader } from '@/components/ui/loader';
import { useLanguage } from '@/context/language-context';
import { translations } from '@/lib/i18n';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function CropAdvisory() {
  const [crop, setCrop] = useState('');
  const [location, setLocation] = useState('');
  const [sowingDate, setSowingDate] = useState<Date>();
  const [result, setResult] = useState<CropAdvisoryCalendarOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crop || !location || !sowingDate) {
      toast({
        title: t.missingInformation,
        description: t.fillAllAdvisoryFields,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await getCropAdvisoryCalendar({
        crop,
        location,
        sowingDate: format(sowingDate, 'yyyy-MM-dd'),
        language,
      });
      setResult(response);
    } catch (error) {
      console.error('Error fetching crop advisory:', error);
      toast({
        title: 'Error',
        description: t.failedToGetAdvisory,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
        case 'Fertilizer': return <Sprout className="h-5 w-5 text-primary" />;
        case 'Irrigation': return <Droplets className="h-5 w-5 text-primary" />;
        case 'Pest Control': return <Bug className="h-5 w-5 text-primary" />;
        case 'Preparation': return <Sprout className="h-5 w-5 text-primary" />;
        case 'Harvesting': return <Sprout className="h-5 w-5 text-primary" />;
        default: return <Hash className="h-5 w-5 text-primary" />;
    }
  }


  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="p-8">
        <CardTitle className="text-3xl text-primary">{t.cropAdvisoryCalendar}</CardTitle>
        <CardDescription className="text-base">{t.cropAdvisoryDescription}</CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-muted/50 rounded-lg">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="crop" className="text-lg">{t.cropName}</Label>
              <Input id="crop" placeholder={t.cropPlaceholder} value={crop} onChange={(e) => setCrop(e.target.value)} required className="bg-background h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="text-lg">{t.location}</Label>
              <Input id="location" placeholder={t.locationPlaceholder} value={location} onChange={(e) => setLocation(e.target.value)} required className="bg-background h-12 text-base" />
            </div>
             <div className="space-y-2 flex flex-col">
              <Label htmlFor="sowing-date" className="text-lg">{t.sowingDate}</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="sowing-date"
                        variant={"outline"}
                        className={cn(
                            "justify-start text-left font-normal bg-background h-12 text-base",
                            !sowingDate && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {sowingDate ? format(sowingDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <CalendarPicker
                        mode="single"
                        selected={sowingDate}
                        onSelect={setSowingDate}
                        initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-8 text-base">
            <Calendar className="mr-2 h-5 w-5" />
            {isLoading ? t.gettingAdvisory : t.getAdvisory}
          </Button>
        </form>

        {isLoading && <Loader />}

        {result && (
          <div className="space-y-6 pt-8">
             <Alert>
                <AlertTitle className="text-xl text-primary">{t.advisoryFor(crop)}</AlertTitle>
            </Alert>
            <div className="relative pl-8 space-y-8 border-l-2 border-primary/20">
              {result.schedule.map((event, index) => (
                <div key={index} className="relative">
                   <div className="absolute -left-[42px] top-1.5 flex items-center justify-center w-8 h-8 bg-primary rounded-full text-primary-foreground font-bold">
                       {getCategoryIcon(event.category)}
                   </div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center text-lg">
                                <span>{event.title}</span>
                                <span className="text-sm font-medium text-muted-foreground">{event.week}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-base">{event.description}</p>
                        </CardContent>
                    </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
