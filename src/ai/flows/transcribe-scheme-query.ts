'use server';

/**
 * @fileOverview Transcribes a user's spoken query about government schemes.
 *
 * - transcribeSchemeQuery - A function that handles the speech-to-text process.
 * - TranscribeSchemeQueryInput - The input type for the function.
 * - TranscribeSchemeQueryOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeSchemeQueryInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "Audio data as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  language: z.string().describe('The language of the spoken query.'),
});
export type TranscribeSchemeQueryInput = z.infer<typeof TranscribeSchemeQueryInputSchema>;

const TranscribeSchemeQueryOutputSchema = z.object({
  transcribedText: z.string().describe('The transcribed text from the user\'s audio input.'),
});
export type TranscribeSchemeQueryOutput = z.infer<typeof TranscribeSchemeQueryOutputSchema>;

export async function transcribeSchemeQuery(input: TranscribeSchemeQueryInput): Promise<TranscribeSchemeQueryOutput> {
  return transcribeSchemeQueryFlow(input);
}

const transcribeSchemeQueryFlow = ai.defineFlow(
  {
    name: 'transcribeSchemeQueryFlow',
    inputSchema: TranscribeSchemeQueryInputSchema,
    outputSchema: TranscribeSchemeQueryOutputSchema,
  },
  async (input) => {
    // Speech-to-Text
    const sttResult = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: [
        { text: `Transcribe the following audio. The user is asking a question about government schemes. The primary language is ${input.language}, but transcribe other languages if spoken.` },
        { media: { url: input.audioDataUri } },
      ],
    });
    const transcribedText = sttResult.text;

    if (!transcribedText) {
      throw new Error('Transcription failed. The audio might be silent or unclear.');
    }

    return {
      transcribedText,
    };
  }
);
