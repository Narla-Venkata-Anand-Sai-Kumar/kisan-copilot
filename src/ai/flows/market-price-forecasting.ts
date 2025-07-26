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
    // In a real production environment, you would call your deployed Vertex AI agent here.
    console.log('Calling external Vertex AI agent for market price forecasting...');

    // Replace this URL with the actual endpoint of your deployed Vertex AI agent.
    const YOUR_VERTEX_AI_AGENT_URL = 'https://us-central1-aiplatform.googleapis.com/v1/projects/your-gcp-project/locations/us-central1/endpoints/your-agent-endpoint:predict';
    
    // This is a simulated response structure. Your actual agent will define this.
    const simulatedApiResponse = {
        forecast: `The current market price for ${input.crop} in ${input.location} is strong, but expected to dip in the next 2 weeks due to increased supply.`,
        suggestion: 'It is advisable to sell 70% of your produce now to capitalize on the current high prices and hold the rest for a potential price recovery in a month.'
    };

    // In a real implementation, you would use fetch to make the API call:
    /*
    const response = await fetch(YOUR_VERTEX_AI_AGENT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer YOUR_AUTH_TOKEN` // Add your authentication token
        },
        body: JSON.stringify(input)
    });
    if (!response.ok) {
        throw new Error(`Failed to get response from Vertex AI agent: ${response.statusText}`);
    }
    const forecastOutput = await response.json();
    */
   
    const forecastOutput = simulatedApiResponse;

    if (!forecastOutput) {
      throw new Error('Could not get price forecast.');
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
