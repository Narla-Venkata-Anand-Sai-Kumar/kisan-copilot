
'use server';

/**
 * @fileOverview Provides market price forecasts by calling a dedicated Vertex AI agent.
 *
 * - marketPriceForecasting - A function that returns market price forecasts and selling suggestions.
 * - MarketPriceForecastingInput - The input type for the marketPriceForecasting function.
 * - MarketPriceForecastingOutput - The return type for the marketPriceForecasting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const MarketPriceForecastingInputSchema = z.object({
  crop: z.string().describe('The crop for which to forecast the market price.'),
  location: z.string().describe('The location for which to forecast the market price.'),
  language: z.string().describe('The language for the forecast and suggestion.'),
});

export type MarketPriceForecastingInput = z.infer<typeof MarketPriceForecastingInputSchema>;

const MarketPriceForecastingOutputSchema = z.object({
  forecast: z.string().describe('The market price forecast for the specified crop and location in the specified language.'),
  suggestion: z.string().describe('A selling suggestion based on the market price forecast in the specified language.'),
  audioOutput: z.string().describe('Audio output in WAV format as a data URI.'),
});

export type MarketPriceForecastingOutput = z.infer<typeof MarketPriceForecastingOutputSchema>;

export async function marketPriceForecasting(input: MarketPriceForecastingInput): Promise<MarketPriceForecastingOutput> {
  return marketPriceForecastingFlow(input);
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
    name: 'friendlyPriceResponse',
    input: { schema: z.object({
        forecast: z.string(),
        suggestion: z.string(),
        language: z.string(),
    })},
    output: { schema: z.object({
        forecast: z.string().describe('The market price forecast for the specified crop and location in the specified language, rephrased to be easily understandable.'),
        suggestion: z.string().describe('A selling suggestion based on the market price forecast in the specified language, rephrased to be easily understandable.'),
    })},
    model: 'googleai/gemini-2.5-pro',
    prompt: `You are an expert agricultural advisor. Your task is to take a raw market price forecast and selling suggestion and make it more understandable and friendly for a farmer.

    Respond in the following language: {{{language}}}.

    Original Forecast: {{{forecast}}}
    Original Suggestion: {{{suggestion}}}
    
    Rephrase the forecast and suggestion to be clear, encouraging, and easy to act upon.
    `
});


const marketPriceForecastingFlow = ai.defineFlow(
  {
    name: 'marketPriceForecastingFlow',
    inputSchema: MarketPriceForecastingInputSchema,
    outputSchema: MarketPriceForecastingOutputSchema,
  },
  async input => {
    console.log('Calling external Cloud Run agent for market price forecasting...');
    
    const agentUrl = new URL('https://agriculture-ai-agents-534880792865.us-central1.run.app/market-price');
    agentUrl.searchParams.append('crop', input.crop);
    agentUrl.searchParams.append('state', input.location); 
    
    const response = await fetch(agentUrl.toString(), {
        method: 'GET',
        headers: {
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get response from Cloud Run agent: ${response.statusText}`);
    }
    
    const responseText = await response.text();
    
    let forecast = '';
    let suggestion = '';

    const suggestionKeywords = ['suggestion:', 'recommendation:', 'advice:'];
    let splitIndex = -1;

    for (const keyword of suggestionKeywords) {
        splitIndex = responseText.toLowerCase().indexOf(keyword);
        if (splitIndex !== -1) {
            forecast = responseText.substring(0, splitIndex).replace('Forecast:', '').trim();
            suggestion = responseText.substring(splitIndex).trim();
            break;
        }
    }
    
    if (splitIndex === -1) {
        forecast = responseText;
        suggestion = 'No specific suggestion provided.';
    }

    const { output: friendlyOutput } = await friendlyResponsePrompt({
        forecast,
        suggestion,
        language: input.language
    });

    if (!friendlyOutput || !friendlyOutput.forecast || !friendlyOutput.suggestion) {
      throw new Error('Could not get price forecast from the external agent.');
    }
    
    let audioOutput = '';
    try {
      const ttsText = `Forecast: ${friendlyOutput.forecast}. Suggestion: ${friendlyOutput.suggestion}`;

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
        prompt: ttsText,
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
