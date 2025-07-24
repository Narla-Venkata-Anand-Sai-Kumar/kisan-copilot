'use server';

/**
 * @fileOverview Diagnoses plant diseases from an image and suggests remedies in the specified language.
 *
 * - diagnoseCropDisease - A function that handles the plant disease diagnosis process.
 * - DiagnoseCropDiseaseInput - The input type for the diagnoseCropDisease function.
 * - DiagnoseCropDiseaseOutput - The return type for the diagnoseCropDisease function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const DiagnoseCropDiseaseInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  language: z.string().describe('The language for the diagnosis and remedies.'),
});
export type DiagnoseCropDiseaseInput = z.infer<typeof DiagnoseCropDiseaseInputSchema>;

const DiagnoseCropDiseaseOutputSchema = z.object({
  plantName: z.string().describe('The common name of the identified plant.'),
  diagnosis: z.string().describe('The diagnosis of the plant disease.'),
  remedies: z.string().describe('Suggested remedies for the plant disease in the specified language.'),
  audioOutput: z.string().describe('Audio output in WAV format as a data URI.'),
});
export type DiagnoseCropDiseaseOutput = z.infer<typeof DiagnoseCropDiseaseOutputSchema>;

export async function diagnoseCropDisease(
  input: DiagnoseCropDiseaseInput
): Promise<DiagnoseCropDiseaseOutput> {
  return diagnoseCropDiseaseFlow(input);
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const diagnosisPrompt = ai.definePrompt({
  name: 'diagnoseCropDiseasePrompt',
  input: {schema: DiagnoseCropDiseaseInputSchema},
  output: {schema: z.object({
    plantName: z.string().describe('The common name of the identified plant.'),
    diagnosis: z.string().describe('The diagnosis of the plant disease.'),
    remedies: z.string().describe('Suggested remedies for the plant disease in the specified language.'),
  })},
  prompt: `You are an expert in plant diseases. Your task is to provide a detailed and helpful response to users in valid JSON format.
1. First, identify the plant from the image.
2. Then, diagnose the disease in the plant shown in the image.
3. Finally, suggest remedies for the diagnosed disease.

Provide the entire response in the specified language.

Language: {{{language}}}
Image: {{media url=photoDataUri}}
`,
});

const diagnoseCropDiseaseFlow = ai.defineFlow(
  {
    name: 'diagnoseCropDiseaseFlow',
    inputSchema: DiagnoseCropDiseaseInputSchema,
    outputSchema: DiagnoseCropDiseaseOutputSchema,
  },
  async input => {
    const {output: diagnosisOutput} = await diagnosisPrompt(input);

    if (!diagnosisOutput) {
      throw new Error('Could not diagnose crop disease.');
    }

    const responseText = `Plant: ${diagnosisOutput.plantName}. Diagnosis: ${diagnosisOutput.diagnosis}. Remedies: ${diagnosisOutput.remedies}`;

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: responseText,
    });

    if (!media?.url) {
      throw new Error('no media returned');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    return {
      ...diagnosisOutput,
      audioOutput: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
    };
  }
);
