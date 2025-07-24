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
      description: 'This tool performs detailed research and web scraping of official government and agricultural market websites to get the current market price for a given crop and location. It should be the first step in any market analysis.',
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
    forecast: z.string().describe('A detailed market price forecast based on the provided data. It should analyze trends and provide a forward-looking statement.'),
    suggestion: z.string().describe('A clear, actionable selling suggestion for the farmer based on the forecast and current price.'),
  })},
  tools: [getMarketPriceTool],
  prompt: `You are an expert agricultural market analyst agent. Your task is to provide a detailed market price forecast and an actionable selling suggestion to farmers.

Follow these steps:
1. Use the 'getMarketPrice' tool to scrape official government sources and get the most accurate, real-time price per quintal for the given crop and location.
2. State the retrieved price clearly in your forecast. For example: "Based on data from official sources, the current price for [crop] in [location] is [price] per quintal."
3. Analyze this price. Based on simulated historical data and market trends, generate a forward-looking forecast.
4. Provide a concrete selling suggestion. Should the farmer sell now, hold, or sell in portions? Justify your suggestion.
5. Provide the entire response in the user-specified language.

Language: {{{language}}}
Crop: {{{crop}}}
Location: {{{location}}}

Begin your analysis now.`,
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
