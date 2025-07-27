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

const marketPriceForecastingFlow = ai.defineFlow(
  {
    name: 'marketPriceForecastingFlow',
    inputSchema: MarketPriceForecastingInputSchema,
    outputSchema: MarketPriceForecastingOutputSchema,
  },
  async input => {
    console.log('Calling external Cloud Run agent for market price forecasting...');
    
    // Construct the URL with query parameters
    const agentUrl = new URL('https://agriculture-ai-agents-534880792865.us-central1.run.app/market-price');
    agentUrl.searchParams.append('crop', input.crop);
    agentUrl.searchParams.append('state', input.location); // Assuming 'location' maps to 'state'
    agentUrl.searchParams.append('language', input.language);
    
    // The Cloud Run agent is called via a GET request.
    // If your service is not public, you will need to handle authentication.
    // The recommended way is to use an ID token from the service account running this app.
    const response = await fetch(agentUrl.toString(), {
        method: 'GET',
        headers: {
            // 'Authorization': `Bearer YOUR_ID_TOKEN` // Add your auth token if required
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get response from Cloud Run agent: ${response.statusText}`);
    }
    
    // This assumes your agent returns JSON with 'forecast' and 'suggestion' fields.
    // Adjust this based on your agent's actual response structure.
    const forecastOutput = await response.json();
   
    if (!forecastOutput || !forecastOutput.forecast || !forecastOutput.suggestion) {
      throw new Error('Could not get price forecast from the external agent.');
    }
    
    let audioOutput = '';
    try {
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
      ...forecastOutput,
      audioOutput,
    };
  }
);
