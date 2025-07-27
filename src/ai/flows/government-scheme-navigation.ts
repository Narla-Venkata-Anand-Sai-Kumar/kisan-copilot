
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

const friendlySchemePrompt = ai.definePrompt({
    name: 'friendlySchemeResponse',
    input: { schema: z.object({
        answer: z.string(),
        language: z.string(),
    })},
    output: { schema: z.object({
        answer: z.string().describe('The answer to the query about government schemes, rephrased to be easily understandable.'),
    })},
    model: 'googleai/gemini-2.5-pro',
    prompt: `You are an expert government scheme advisor for farmers. Your task is to take a technical description of a government scheme and make it very simple and easy to understand for a farmer.

    Explain the key benefits and how to apply in simple steps. Respond in the following language: {{{language}}}.

    Original Information: {{{answer}}}
    `
});

const navigateGovernmentSchemesFlow = ai.defineFlow(
  {
    name: 'navigateGovernmentSchemesFlow',
    inputSchema: NavigateGovernmentSchemesInputSchema,
    outputSchema: NavigateGovernmentSchemesOutputSchema,
  },
  async input => {
    console.log('Calling external Cloud Run agent for scheme navigation...');
    
    const agentUrl = new URL('https://agriculture-ai-agents-534880792865.us-central1.run.app/info-query');
    agentUrl.searchParams.append('query', input.query); 
    
    const response = await fetch(agentUrl.toString(), {
        method: 'GET',
        headers: {},
    });

    if (!response.ok) {
        throw new Error(`Failed to get response from Cloud Run agent: ${response.statusText}`);
    }
    
    const agentResponseText = await response.text();

    const { output: friendlyOutput } = await friendlySchemePrompt({
        answer: agentResponseText,
        language: input.language
    });
    
    if (!friendlyOutput || !friendlyOutput.answer) {
      throw new Error('Could not get friendly scheme information from Gemini.');
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
        prompt: friendlyOutput.answer,
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
      ...friendlyOutput,
      audioOutput,
    };
  }
);
