'use server';

/**
 * @fileOverview Diagnoses plant diseases by calling a dedicated Vertex AI agent.
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
  name: 'cropDiagnosisPrompt',
  input: { schema: DiagnoseCropDiseaseInputSchema },
  output: { schema: z.object({
      plantName: z.string().describe('The common name of the identified plant.'),
      diagnosis: z.string().describe('The diagnosis of the plant disease.'),
      remedies: z.string().describe('Suggested remedies for the plant disease in the specified language.'),
  })},
  model: 'googleai/gemini-2.5-pro-vision',
  prompt: `You are an expert botanist specializing in diagnosing plant illnesses for farmers.
    Analyze the provided image of the plant.
    Identify the plant, diagnose any diseases or pests, and suggest clear, actionable remedies.
    Provide the response in the following language: {{{language}}}.

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
    const { output: diagnosisOutput } = await diagnosisPrompt(input);
    
    if (!diagnosisOutput) {
      throw new Error('Could not diagnose crop disease.');
    }

    let audioOutput = '';
    try {
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

      if (media?.url) {
        const audioBuffer = Buffer.from(
          media.url.substring(media.url.indexOf(',') + 1),
          'base64'
        );
        audioOutput = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
      }
    } catch (e) {
      console.error('TTS generation failed, likely due to quota. Returning text only.', e);
    }
    
    return {
      ...diagnosisOutput,
      audioOutput,
    };
  }
);
