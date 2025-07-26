'use server';

/**
 * @fileOverview Government Scheme Navigation AI Agent.
 *
 * - navigateGovernmentSchemes - A function that handles the government scheme navigation process.
 * - NavigateGovernmentSchemesInput - The input type for the navigateGovernmentSchemes function.
 * - NavigateGovernmentSchemesOutput - The return type for the navigateGovernmentSchemes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const NavigateGovernmentSchemesInputSchema = z.object({
  query: z.string().describe('The query about government schemes.'),
  language: z.string().describe('The language to respond in.'),
});
export type NavigateGovernmentSchemesInput = z.infer<
  typeof NavigateGovernmentSchemesInputSchema
>;

const NavigateGovernmentSchemesOutputSchema = z.object({
  answer: z.string().describe('The answer to the query about government schemes.'),
  audioOutput: z.string().describe('Audio output in WAV format as a data URI.'),
});
export type NavigateGovernmentSchemesOutput = z.infer<
  typeof NavigateGovernmentSchemesOutputSchema
>;

export async function navigateGovernmentSchemes(
  input: NavigateGovernmentSchemesInput
): Promise<NavigateGovernmentSchemesOutput> {
  return navigateGovernmentSchemesFlow(input);
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

const navigateGovernmentSchemesFlow = ai.defineFlow(
  {
    name: 'navigateGovernmentSchemesFlow',
    inputSchema: NavigateGovernmentSchemesInputSchema,
    outputSchema: NavigateGovernmentSchemesOutputSchema,
  },
  async input => {
    // In a real production environment, you would call your deployed Vertex AI agent here.
    // This example simulates that call.
    console.log('Calling external Vertex AI agent for scheme navigation...');

    // Replace this URL with the actual endpoint of your deployed Vertex AI agent.
    const YOUR_VERTEX_AI_AGENT_URL = 'https://us-central1-aiplatform.googleapis.com/v1/projects/your-gcp-project/locations/us-central1/endpoints/your-agent-endpoint:predict';

    // This is a simulated response structure. Your actual agent will define this.
    const simulatedApiResponse = {
        answer: `This is a detailed response from the external Vertex AI agent for the query: "${input.query}". The agent would perform advanced RAG and web scraping to provide the following information:\n\n**Benefits:** It provides income support of Rs. 6,000 per year in three equal installments to eligible farmer families.\n**Eligibility:** All landholding farmer families are eligible, subject to certain exclusion criteria.\n**How to Apply:**\n1. Go to the official PM-KISAN portal.\n2. Click on 'New Farmer Registration'.\n3. Enter Aadhaar, land, and bank details.`
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
    const schemesOutput = await response.json();
    */

    // Using the simulated response for this example:
    const schemesOutput = simulatedApiResponse;

    if (!schemesOutput || !schemesOutput.answer) {
      throw new Error('Could not get scheme information from the external agent.');
    }

    let audioOutput = '';
    try {
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
        prompt: schemesOutput.answer,
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
      ...schemesOutput,
      audioOutput,
    };
  }
);
