
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Upload, Microscope, Stethoscope, Bot, Sparkles, FlaskConical } from 'lucide-react';
import { diagnoseCropDisease, DiagnoseCropDiseaseOutput } from '@/ai/flows/crop-disease-diagnosis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader } from '@/components/ui/loader';
import { useLanguage } from '@/context/language-context';
import { translations } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';

export default function CropDiagnosis() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<DiagnoseCropDiseaseOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
      <CardHeader className="p-8">
        <CardTitle className="text-3xl text-primary">{t.cropDiseaseDetection}</CardTitle>
        <CardDescription className="text-base">{t.uploadImageDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-8 pt-0">
        <div className="p-6 bg-muted/50 rounded-lg">
            <Label htmlFor="picture" className="text-lg">{t.plantImage}</Label>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
                <Input id="picture" type="file" accept="image/*" onChange={handleImageChange} className="flex-1 bg-background h-12 text-base" />
                <Button onClick={handleSubmit} disabled={isLoading || !imageFile} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-6 text-base">
                <Upload className="mr-2 h-5 w-5" />
                {isLoading ? t.diagnosing : t.diagnose}
                </Button>
            </div>
        </div>

        {imagePreview && !isLoading && !result && (
          <div className="mt-4 flex justify-center p-4 border-2 border-dashed rounded-lg">
            <Image
              src={imagePreview}
              alt="Plant preview"
              width={300}
              height={300}
              className="rounded-lg object-contain"
              data-ai-hint="plant leaf"
            />
          </div>
        )}

        {isLoading && <Loader />}

        {result && (
          <div className="space-y-6 pt-4">
            <div className="flex justify-center p-4 border-2 border-dashed rounded-lg">
              <Image
                src={imagePreview!}
                alt="Plant preview"
                width={300}
                height={300}
                className="rounded-lg object-contain"
                data-ai-hint="plant leaf"
              />
           </div>
            <Alert>
              <Sparkles className="h-5 w-5 text-primary" />
              <AlertTitle className="text-lg text-primary">{t.plantName}</AlertTitle>
              <AlertDescription className="text-base font-semibold">{result.plantName}</AlertDescription>
            </Alert>
            <Alert>
              <Microscope className="h-5 w-5 text-primary" />
              <AlertTitle className="text-lg text-primary">{t.diagnosis}</AlertTitle>
              <AlertDescription className="text-base font-semibold">{result.diagnosis}</AlertDescription>
            </Alert>
            <Alert>
              <Stethoscope className="h-5 w-5 text-primary" />
              <AlertTitle className="text-lg text-primary">{t.remediesIn(language)}</AlertTitle>
              <AlertDescription className="text-base font-semibold">{result.remedies}</AlertDescription>
            </Alert>
             {result.productSuggestions && result.productSuggestions.length > 0 && (
                <Alert>
                    <FlaskConical className="h-5 w-5 text-primary" />
                    <AlertTitle className="text-lg text-primary">Recommended Products</AlertTitle>
                    <AlertDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {result.productSuggestions.map((product, index) => (
                                <Card key={index} className="bg-background/50">
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base flex justify-between items-center">
                                            {product.name}
                                            <Badge variant="secondary">{product.type}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 text-sm">
                                        <p>{product.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </AlertDescription>
                </Alert>
            )}
            <Alert>
              <Bot className="h-5 w-5 text-primary" />
              <AlertTitle className="text-lg text-primary">{t.voiceResponse}</AlertTitle>
              <AlertDescription>
                {result.audioOutput && <audio controls src={result.audioOutput} ref={audioRef} className="w-full mt-2" aria-label="AI voice response" />}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
