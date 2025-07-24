'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Upload, Microscope, Stethoscope, Bot } from 'lucide-react';
import { diagnoseCropDisease } from '@/ai/flows/crop-disease-diagnosis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function CropDiagnosis() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ diagnosis: string; remedies: string; audioOutput: string; } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
        title: 'No image selected',
        description: 'Please upload an image of the plant.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onloadend = async () => {
      const photoDataUri = reader.result as string;
      try {
        const response = await diagnoseCropDisease({ photoDataUri });
        setResult(response);
      } catch (error) {
        console.error('Error diagnosing crop disease:', error);
        toast({
          title: 'Error',
          description: 'Failed to diagnose crop disease. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = (error) => {
        console.error('Error reading file:', error);
        toast({
          title: 'File Read Error',
          description: 'Could not read the selected image file.',
          variant: 'destructive',
        });
        setIsLoading(false);
    };
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Crop Disease Detection</CardTitle>
        <CardDescription>Upload an image of a plant to diagnose diseases and get remedies.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="picture">Plant Image</Label>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Input id="picture" type="file" accept="image/*" onChange={handleImageChange} className="flex-1" />
            <Button onClick={handleSubmit} disabled={isLoading || !imageFile} className="w-full sm:w-auto">
              <Upload className="mr-2 h-4 w-4" />
              {isLoading ? 'Diagnosing...' : 'Diagnose'}
            </Button>
          </div>
        </div>

        {imagePreview && (
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

        {isLoading && (
          <div className="space-y-4 pt-4">
             <div className="space-y-2">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4 pt-4">
            <Alert>
              <Microscope className="h-4 w-4" />
              <AlertTitle>Diagnosis</AlertTitle>
              <AlertDescription className="font-semibold">{result.diagnosis}</AlertDescription>
            </Alert>
            <Alert>
              <Stethoscope className="h-4 w-4" />
              <AlertTitle>Remedies (in Kannada)</AlertTitle>
              <AlertDescription className="font-semibold">{result.remedies}</AlertDescription>
            </Alert>
            <Alert>
              <Bot className="h-4 w-4" />
              <AlertTitle>Voice Response</AlertTitle>
              <AlertDescription>
                {result.audioOutput && <audio controls src={result.audioOutput} className="w-full mt-2" aria-label="AI voice response" />}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
