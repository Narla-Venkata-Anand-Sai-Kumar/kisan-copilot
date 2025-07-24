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
  prompt: `You are an expert agent specializing in Indian government schemes for farmers. Your task is to provide a detailed and helpful response to user questions.

Follow these steps:
1.  Use the 'getSchemeInfo' tool to search for the most relevant information regarding the user's query.
2.  Synthesize the information returned by the tool into a clear and comprehensive answer.
3.  Your answer MUST include details about the scheme's benefits, eligibility criteria, and a step-by-step guide on how to apply.
4.  If the user asks a general question, provide a general answer, but if they ask how to apply, focus on the application steps.
5.  Provide the entire response in the user-specified language.

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

    if (!media?.url) {
      throw new Error('no media returned');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    return {
      ...schemesOutput,
      audioOutput: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
    };
  }
);
