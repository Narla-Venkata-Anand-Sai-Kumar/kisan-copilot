'use server';

/**
 * @fileOverview Voice-First AI for farmer interaction in a specified language.
 *
 * - voiceFirstInteraction - A function that handles voice input, STT, agent processing, and TTS output.
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
  language: z.string().describe('The language for the interaction.'),
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

const friendlyResponsePrompt = ai.definePrompt({
    name: 'friendlyVoiceResponse',
    input: { schema: z.object({
        answer: z.string(),
        language: z.string(),
    })},
    output: { schema: z.object({
        answer: z.string().describe('The answer to the query, rephrased to be easily understandable for a farmer.'),
    })},
    model: 'googleai/gemini-2.5-pro',
    prompt: `You are a helpful AI assistant for farmers. Your task is to take a potentially technical or brief answer and make it simple, friendly, and easy to understand.

    Respond in the following language: {{{language}}}.

    Original Answer: {{{answer}}}
    `
});

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
        { text: `Transcribe the following audio. The primary language is ${input.language}, but transcribe other languages if spoken.` },
        { media: { url: input.audioDataUri } },
      ],
    });
    const transcribedText = sttResult.text;

    if (!transcribedText) {
      // Return a user-friendly message if transcription fails
      const responseText = "Sorry, I couldn't understand the audio. Please try again.";
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
          prompt: responseText,
        });

        if (media?.url) {
          const audioBuffer = Buffer.from(
            media.url.substring(media.url.indexOf(',') + 1),
            'base64'
          );
          audioOutput = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
        }
      } catch(e) {
        console.error('TTS generation for error failed, likely due to quota. Returning text only.', e);
      }

      return {
        audioOutput,
        transcribedText: '',
        responseText,
      };
    }
    
    // Call the external agent
    console.log('Calling external Cloud Run agent for info query...');
    
    const agentUrl = new URL('https://agriculture-ai-agents-534880792865.us-central1.run.app/info-query');
    agentUrl.searchParams.append('query', transcribedText); 
    
    const response = await fetch(agentUrl.toString(), {
        method: 'GET',
        headers: {},
    });

    if (!response.ok) {
        throw new Error(`Failed to get response from Cloud Run agent: ${response.statusText}`);
    }
    
    const agentResponseText = await response.text();

    // Make the response friendly
    const { output: friendlyOutput } = await friendlyResponsePrompt({
        answer: agentResponseText,
        language: input.language
    });

    const responseText = friendlyOutput?.answer || "Sorry, I couldn't process the response.";

    let audioOutput = '';
    try {
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

      if (media?.url) {
        const audioBuffer = Buffer.from(
          media.url.substring(media.url.indexOf(',') + 1),
          'base64'
        );
        audioOutput = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
      }
    } catch(e) {
      console.error('TTS generation failed, likely due to quota. Returning text only.', e);
    }
    
    return {
      audioOutput,
      transcribedText,
      responseText,
    };
  }
);
