'use server';

/**
 * @fileOverview Provides real-time market price forecasts and selling suggestions in the specified language.
 *
 * - marketPriceForecasting - A function that returns market price forecasts and selling suggestions.
 * - MarketPriceForecastingInput - The input type for the marketPriceForecasting function.
 * - MarketPriceForecastingOutput - The return type for the marketPriceForecasting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';
import { getMarketData } from '@/services/market-data-service';

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

const getMarketPriceTool = ai.defineTool(
    {
      name: 'getMarketPrice',
      description: 'Gets the current market price for a given crop and location.',
      inputSchema: z.object({
        crop: z.string(),
        location: z.string(),
      }),
      outputSchema: z.object({
        price: z.number(),
        unit: z.string(),
      }),
    },
    async (input) => {
        return getMarketData(input.crop, input.location);
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

const marketPriceForecastingPrompt = ai.definePrompt({
  name: 'marketPriceForecastingPrompt',
  input: {schema: MarketPriceForecastingInputSchema},
  output: {schema: z.object({
    forecast: z.string().describe('The market price forecast for the specified crop and location in the specified language.'),
    suggestion: z.string().describe('A selling suggestion based on the market price forecast in the specified language.'),
  })},
  tools: [getMarketPriceTool],
  prompt: `You are an AI assistant providing market price forecasts and selling suggestions to farmers. 
  Use the getMarketPrice tool to fetch the current price per quintal for the given crop and location.
  
  Provide the forecast and suggestion in the specified language.
  
  Language: {{{language}}}
  Crop: {{{crop}}}
  Location: {{{location}}}

  Forecast:
  Suggestion: `,
});

const marketPriceForecastingFlow = ai.defineFlow(
  {
    name: 'marketPriceForecastingFlow',
    inputSchema: MarketPriceForecastingInputSchema,
    outputSchema: MarketPriceForecastingOutputSchema,
  },
  async input => {
    const {output: forecastOutput} = await marketPriceForecastingPrompt(input);
    
    if (!forecastOutput) {
      throw new Error('Could not get price forecast.');
    }

    const responseText = `Forecast: ${forecastOutput.forecast}. Suggestion: ${forecastOutput.suggestion}`;

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

    if (!media?.url) {
      throw new Error('no media returned');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    return {
      ...forecastOutput,
      audioOutput: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
    };
  }
);
