'use server';

/**
 * @fileOverview Government Scheme Navigation AI Agent.
 *
 * - navigateGovernmentSchemes - A function that handles the government scheme navigation process.
 * - NavigateGovernmentSchemesInput - The input type for the navigateGovernmentSchemes function.
 * - NavigateGovernmentSchemesOutput - The return type for the navigateGovernmentSchemes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NavigateGovernmentSchemesInputSchema = z.object({
  query: z.string().describe('The query about government schemes.'),
  language: z.string().describe('The language to respond in.'),
});
export type NavigateGovernmentSchemesInput = z.infer<
  typeof NavigateGovernmentSchemesInputSchema
>;

const NavigateGovernmentSchemesOutputSchema = z.object({
  answer: z.string().describe('The answer to the query about government schemes.'),
});
export type NavigateGovernmentSchemesOutput = z.infer<
  typeof NavigateGovernmentSchemesOutputSchema
>;

export async function navigateGovernmentSchemes(
  input: NavigateGovernmentSchemesInput
): Promise<NavigateGovernmentSchemesOutput> {
  return navigateGovernmentSchemesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'navigateGovernmentSchemesPrompt',
  input: {schema: NavigateGovernmentSchemesInputSchema},
  output: {schema: NavigateGovernmentSchemesOutputSchema},
  prompt: `You are an expert in Indian government schemes for farmers. Answer the following question about government schemes in the given language. Use the available information to provide an accurate and helpful response.

Question: {{{query}}}
Language: {{{language}}}`,
});

const navigateGovernmentSchemesFlow = ai.defineFlow(
  {
    name: 'navigateGovernmentSchemesFlow',
    inputSchema: NavigateGovernmentSchemesInputSchema,
    outputSchema: NavigateGovernmentSchemesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
