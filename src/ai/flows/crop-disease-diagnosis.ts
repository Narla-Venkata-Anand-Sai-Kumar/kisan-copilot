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

const diagnoseCropDiseaseFlow = ai.defineFlow(
  {
    name: 'diagnoseCropDiseaseFlow',
    inputSchema: DiagnoseCropDiseaseInputSchema,
    outputSchema: DiagnoseCropDiseaseOutputSchema,
  },
  async input => {
    // In a real production environment, you would call your deployed Vertex AI agent here.
    console.log('Calling external Vertex AI agent for crop diagnosis...');

    // Replace this URL with the actual endpoint of your deployed Vertex AI agent.
    const YOUR_VERTEX_AI_AGENT_URL = 'https://us-central1-aiplatform.googleapis.com/v1/projects/your-gcp-project/locations/us-central1/endpoints/your-agent-endpoint:predict';

    // This is a simulated response structure. Your actual agent will define this.
    const simulatedApiResponse = {
        plantName: 'Tomato Plant',
        diagnosis: 'Early Blight',
        remedies: 'Apply a fungicide containing mancozeb or chlorothalonil. Ensure proper spacing for air circulation and avoid overhead watering.'
    };

    // In a real implementation, you would use fetch to make the API call:
    /*
    const response = await fetch(YOUR_VERTEX_AI_AGENT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer YOUR_AUTH_TOKEN` // Add your authentication token
        },
        body: JSON.stringify(input)
    });
    if (!response.ok) {
        throw new Error(`Failed to get response from Vertex AI agent: ${response.statusText}`);
    }
    const diagnosisOutput = await response.json();
    */

    const diagnosisOutput = simulatedApiResponse;
    
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
