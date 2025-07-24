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
  async input => {
    // STT using Vertex AI (assuming direct audio processing not possible in Genkit, so passing text)
    // In real implementation, the audio from audioDataUri needs to be sent to Vertex AI STT to get the transcribedText.
    // const transcribedText = await stt(input.audioDataUri); // Example of STT call (not implemented here)

    // Placeholder for transcribed text.  In a real implementation, this would come from STT.
    const transcribedText =  "tomato price today in Kannada";

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: 'Algenib'},
          },
        },
      },
      prompt: transcribedText,
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
    };
  }
);
