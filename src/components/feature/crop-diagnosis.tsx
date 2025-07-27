'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Upload, Microscope, Stethoscope, Bot, Sparkles } from 'lucide-react';
import { diagnoseCropDisease } from '@/ai/flows/crop-disease-diagnosis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader } from '@/components/ui/loader';
import { useLanguage } from '@/context/language-context';
import { translations } from '@/lib/i18n';

export default function CropDiagnosis() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ plantName: string; diagnosis: string; remedies: string; audioOutput: string; } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { language } = useLanguage();

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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      toast({
        title: t.noImageSelected,
        description: t.pleaseUploadImage,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    if(audioRef.current) {
        audioRef.current.pause();
    }

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onloadend = async () => {
      const photoDataUri = reader.result as string;
      try {
        const response = await diagnoseCropDisease({ photoDataUri, language });
        setResult(response);
      } catch (error) {
        console.error('Error diagnosing crop disease:', error);
        toast({
          title: 'Error',
          description: t.failedToDiagnose,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = (error) => {
        console.error('Error reading file:', error);
        toast({
          title: t.fileReadError,
          description: t.couldNotReadFile,
          variant: 'destructive',
        });
        setIsLoading(false);
    };
  };

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">{t.cropDiseaseDetection}</CardTitle>
        <CardDescription>{t.uploadImageDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg">
            <Label htmlFor="picture" className="text-base">{t.plantImage}</Label>
            <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
                <Input id="picture" type="file" accept="image/*" onChange={handleImageChange} className="flex-1 bg-background" />
                <Button onClick={handleSubmit} disabled={isLoading || !imageFile} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                <Upload className="mr-2 h-4 w-4" />
                {isLoading ? t.diagnosing : t.diagnose}
                </Button>
            </div>
        </div>

        {imagePreview && !isLoading && !result && (
          <div className="mt-4 flex justify-center p-4 border-2 border-dashed rounded-lg">
            <Image
              src={imagePreview}
              alt="Plant preview"
              width={250}
              height={250}
              className="rounded-lg object-contain"
              data-ai-hint="plant leaf"
            />
          </div>
        )}

        {isLoading && <Loader />}

        {result && (
          <div className="space-y-4 pt-4">
            <div className="flex justify-center p-4 border-2 border-dashed rounded-lg">
              <Image
                src={imagePreview!}
                alt="Plant preview"
                width={250}
                height={250}
                className="rounded-lg object-contain"
                data-ai-hint="plant leaf"
              />
           </div>
            <Alert>
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">{t.plantName}</AlertTitle>
              <AlertDescription className="font-semibold">{result.plantName}</AlertDescription>
            </Alert>
            <Alert>
              <Microscope className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">{t.diagnosis}</AlertTitle>
              <AlertDescription className="font-semibold">{result.diagnosis}</AlertDescription>
            </Alert>
            <Alert>
              <Stethoscope className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">{t.remediesIn(language)}</AlertTitle>
              <AlertDescription className="font-semibold">{result.remedies}</AlertDescription>
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
