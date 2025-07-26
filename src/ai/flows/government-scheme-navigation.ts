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
import { searchGovernmentSchemes } from '@/services/scheme-search-service';

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

const getSchemeInfoTool = ai.defineTool(
    {
      name: 'getSchemeInfo',
      description: 'Searches official government websites and agricultural portals to get information about a specific scheme. This tool provides details on eligibility, benefits, and how to apply.',
      inputSchema: z.object({
        query: z.string().describe('The user\'s question about a government scheme.'),
      }),
      outputSchema: z.string().describe('A summary of the information found about the scheme, including application steps.'),
    },
    async (input) => {
        return searchGovernmentSchemes(input.query);
    }
);

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

const schemesPrompt = ai.definePrompt({
  name: 'navigateGovernmentSchemesPrompt',
  input: {schema: NavigateGovernmentSchemesInputSchema},
  output: {schema: z.object({
    answer: z.string().describe('The answer to the query about government schemes.'),
  })},
  tools: [getSchemeInfoTool],
  prompt: `You are an expert assistant for farmers. Your task is to provide a direct, helpful, and comprehensive answer to questions about government schemes.

- Your primary goal is to use the 'getSchemeInfo' tool to find relevant information for the user's query.
- Based *only* on the information returned by the tool, synthesize a clear answer.
- The answer MUST include details about the scheme's benefits, eligibility criteria, and a step-by-step guide on how to apply. Do not make up information.
- Provide the entire response in the user-specified language.
- Do not talk about your process or the tools you are using. Just provide the final, synthesized answer.

Question: {{{query}}}
Language: {{{language}}}`,
});

const navigateGovernmentSchemesFlow = ai.defineFlow(
  {
    name: 'navigateGovernmentSchemesFlow',
    inputSchema: NavigateGovernmentSchemesInputSchema,
    outputSchema: NavigateGovernmentSchemesOutputSchema,
  },
  async input => {
    const {output: schemesOutput} = await schemesPrompt(input);
    if(!schemesOutput) {
      throw new Error('Could not get scheme information.');
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
