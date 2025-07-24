'use server';

/**
 * @fileOverview Voice-First AI for farmer interaction in Kannada.
 *
 * - voiceFirstInteraction - A function that handles voice input, STT, LLM processing, and TTS output.
 * - VoiceFirstInteractionInput - The input type for the voiceFirstInteraction function.
 * - VoiceFirstInteractionOutput - The return type for the voiceFirstInteraction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';
import { navigateGovernmentSchemes } from './government-scheme-navigation';

const VoiceFirstInteractionInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      'Audio data as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type VoiceFirstInteractionInput = z.infer<typeof VoiceFirstInteractionInputSchema>;

const VoiceFirstInteractionOutputSchema = z.object({
  audioOutput: z.string().describe('Audio output in WAV format as a data URI.'),
  transcribedText: z.string().describe('The transcribed text from the user\'s audio input.'),
  responseText: z.string().describe('The text response from the AI assistant.'),
});
export type VoiceFirstInteractionOutput = z.infer<typeof VoiceFirstInteractionOutputSchema>;

export async function voiceFirstInteraction(input: VoiceFirstInteractionInput): Promise<VoiceFirstInteractionOutput> {
  return voiceFirstInteractionFlow(input);
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

const voiceFirstInteractionFlow = ai.defineFlow(
  {
    name: 'voiceFirstInteractionFlow',
    inputSchema: VoiceFirstInteractionInputSchema,
    outputSchema: VoiceFirstInteractionOutputSchema,
  },
  async (input) => {
    // Speech-to-Text
    const sttResult = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: [
        { text: "Transcribe the following audio in Kannada. If it's another language, transcribe it in that language." },
        { media: { url: input.audioDataUri } },
      ],
    });
    const transcribedText = sttResult.text;

    if (!transcribedText) {
      throw new Error('Could not transcribe audio.');
    }

    // Get response from scheme navigator
    const response = await navigateGovernmentSchemes({
      query: transcribedText,
      language: 'Kannada',
    });
    const responseText = response.answer;

    // Text-to-Speech
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

    if (!media) {
      throw new Error('no media returned');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    return {
      audioOutput: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
      transcribedText,
      responseText,
    };
  }
);
