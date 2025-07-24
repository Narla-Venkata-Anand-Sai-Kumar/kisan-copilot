# **App Name**: Kisan Copilot

## Core Features:

- Crop Diagnosis: Multimodal Crop Diagnosis: Upload an image of a plant, send to Gemini Vision model on Vertex AI, get diagnosis and remedies.
- Price Forecasting: Market Price Forecasting: Tool uses Gemini via Vertex AI Agent Builder with real-time data from Agmarknet and eNAM APIs to provide price trends and selling suggestions.
- Scheme Navigation: Government Scheme Navigation: LLM uses scraped government schemes (PM-Kisan, NABARD, etc.), which are stored in Firestore Vector Store via LangChain + Firebase. Query with Gemini on Vertex, and respond in the user's native language.
- Voice Agent: Voice-First AI: Converts speech in Kannada to text using Vertex AI STT, then sends the transcribed text to the agent and converts the Gemini response back to speech using Vertex AI TTS.
- Offline Data: Display localized, offline-ready data via Firebase for reliability.

## Style Guidelines:

- Primary color: Harvest Gold (#E6B800) to represent the agricultural focus.
- Background color: Light beige (#F5F5DC) to provide a natural, earthy feel and ensure readability.
- Accent color: Forest Green (#228B22) as a natural contrast to the gold, representing plant life.
- Body and headline font: 'PT Sans' (sans-serif) for readability and a modern, accessible feel.
- Use simple, clear icons representing crops, markets, and government programs. Line icons with a touch of color will work best.
- Clean, grid-based layout, prioritizing key data points.