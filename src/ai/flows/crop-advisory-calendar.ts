'use server';

/**
 * @fileOverview Provides a personalized crop advisory calendar.
 *
 * - getCropAdvisoryCalendar - A function that returns a week-by-week crop advisory calendar.
 * - CropAdvisoryCalendarInput - The input type for the function.
 * - CropAdvisoryCalendarOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CropAdvisoryCalendarInputSchema = z.object({
  crop: z.string().describe('The name of the crop (e.g., "Tomato", "Wheat").'),
  location: z.string().describe('The geographical location (e.g., "Kolar, Karnataka").'),
  sowingDate: z.string().describe('The date the crop was sown, in YYYY-MM-DD format.'),
  language: z.string().describe('The language for the advisory calendar.'),
});
export type CropAdvisoryCalendarInput = z.infer<typeof CropAdvisoryCalendarInputSchema>;

const CalendarEventSchema = z.object({
    week: z.string().describe("The week number or range (e.g., 'Week 1', 'Weeks 5-6')."),
    title: z.string().describe("A concise title for the week's activities."),
    description: z.string().describe("A detailed description of the tasks and advice for the week."),
    category: z.enum(["Preparation", "Fertilizer", "Irrigation", "Pest Control", "Harvesting", "General"]).describe("The primary category of the advice.")
});

const CropAdvisoryCalendarOutputSchema = z.object({
    schedule: z.array(CalendarEventSchema).describe("The week-by-week advisory schedule.")
});
export type CropAdvisoryCalendarOutput = z.infer<typeof CropAdvisoryCalendarOutputSchema>;


export async function getCropAdvisoryCalendar(
  input: CropAdvisoryCalendarInput
): Promise<CropAdvisoryCalendarOutput> {
  return cropAdvisoryCalendarFlow(input);
}


const cropAdvisoryPrompt = ai.definePrompt({
  name: 'cropAdvisoryPrompt',
  input: { schema: CropAdvisoryCalendarInputSchema },
  output: { schema: CropAdvisoryCalendarOutputSchema },
  model: 'googleai/gemini-2.5-pro',
  prompt: `You are an expert agricultural scientist providing a detailed, week-by-week crop advisory calendar for a farmer.

    **Farmer's Inputs:**
    - Crop: {{{crop}}}
    - Location: {{{location}}}
    - Sowing Date: {{{sowingDate}}}
    - Language for Response: {{{language}}}

    **Your Task:**
    Generate a comprehensive, week-by-week schedule from land preparation/sowing to harvesting. For each week, provide a clear title, a detailed description of activities, and categorize the main task. The advice must be practical and actionable for a farmer. Cover key aspects like:
    1.  **Fertilizer Management:** Specify the type of fertilizer (e.g., NPK, Urea, DAP), the dosage (e.g., kg/acre), and the application method.
    2.  **Irrigation:** Provide guidance on the frequency and amount of watering, considering the crop's growth stage.
    3.  **Pest and Disease Control:** Mention common pests and diseases to watch for at each stage and suggest specific, commercially available chemical or organic control methods.
    4.  **General Care:** Include other important activities like weeding, pruning, or thinning.

    Provide the entire response in the specified language: {{{language}}}.
    Structure the output according to the provided JSON schema.
    `,
});


const cropAdvisoryCalendarFlow = ai.defineFlow(
  {
    name: 'cropAdvisoryCalendarFlow',
    inputSchema: CropAdvisoryCalendarInputSchema,
    outputSchema: CropAdvisoryCalendarOutputSchema,
  },
  async input => {
    const { output } = await cropAdvisoryPrompt(input);
    if (!output) {
      throw new Error('Could not generate crop advisory calendar.');
    }
    return output;
  }
);
