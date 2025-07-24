// src/ai/flows/market-price-forecasting.ts
'use server';

/**
 * @fileOverview Provides real-time market price forecasts and selling suggestions in Kannada.
 *
 * - marketPriceForecasting - A function that returns market price forecasts and selling suggestions.
 * - MarketPriceForecastingInput - The input type for the marketPriceForecasting function.
 * - MarketPriceForecastingOutput - The return type for the marketPriceForecasting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MarketPriceForecastingInputSchema = z.object({
  crop: z.string().describe('The crop for which to forecast the market price.'),
  location: z.string().describe('The location for which to forecast the market price.'),
});

export type MarketPriceForecastingInput = z.infer<typeof MarketPriceForecastingInputSchema>;

const MarketPriceForecastingOutputSchema = z.object({
  forecast: z.string().describe('The market price forecast for the specified crop and location in Kannada.'),
  suggestion: z.string().describe('A selling suggestion based on the market price forecast in Kannada.'),
});

export type MarketPriceForecastingOutput = z.infer<typeof MarketPriceForecastingOutputSchema>;

export async function marketPriceForecasting(input: MarketPriceForecastingInput): Promise<MarketPriceForecastingOutput> {
  return marketPriceForecastingFlow(input);
}

const marketPriceForecastingPrompt = ai.definePrompt({
  name: 'marketPriceForecastingPrompt',
  input: {schema: MarketPriceForecastingInputSchema},
  output: {schema: MarketPriceForecastingOutputSchema},
  prompt: `You are an AI assistant providing market price forecasts and selling suggestions to farmers.

  Provide the forecast and suggestion in Kannada.

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
    const {output} = await marketPriceForecastingPrompt(input);
    return output!;
  }
);
