# GreenPulse: Your AI Copilot for Farming

GreenPulse is a modern, AI-powered web application designed to be a comprehensive digital assistant for farmers. Built with Next.js, Google's Gemini, and Genkit, it provides farmers with actionable insights to improve their productivity, profitability, and sustainability. The interface is multilingual and supports voice commands to ensure it is accessible and easy to use for farmers from various backgrounds.

## ✨ Features

GreenPulse offers a suite of tools tailored to the everyday needs of a farmer:

*   **Crop Disease Diagnosis**: Upload a photo of a plant leaf, and the AI will diagnose diseases, suggest remedies, and recommend specific, commercially available insecticides or fungicides.
*   **Personalized Crop Advisory**: Get a week-by-week calendar of activities for your specific crop and location, from sowing to harvest. Includes advice on fertilizer application, irrigation schedules, and pest control.
*   **Market Price Forecasting**: Enter a crop and location to receive an AI-powered forecast of future market prices and a recommendation on whether to sell or hold your produce.
*   **Government Scheme Navigator**: Ask questions about government schemes (like PM-KISAN) in plain language—either by typing or by voice—and get clear, easy-to-understand answers.
*   **Voice-First Agent**: A fully interactive voice agent that can answer general farming queries. Simply speak your question in your chosen language and get a spoken response from the AI.
*   **Multi-Language Support**: The entire user interface and all AI responses can be switched between English, Kannada, Hindi, Tamil, and Telugu.

## 🚀 Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later recommended)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    or
    ```bash
    yarn install
    ```

3.  **Set up environment variables:**
    Create a file named `.env` in the root of your project and add your Google Gemini API key:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
    You can obtain an API key from the [Google AI Studio](https://aistudio.google.com/app/apikey).

4.  **Run the development server:**
    The application requires two processes to run concurrently: the Next.js frontend and the Genkit AI backend.

    *   **In your first terminal**, run the Next.js app:
        ```bash
        npm run dev
        ```
        This will start the frontend on `http://localhost:9002`.

    *   **In a second terminal**, run the Genkit AI flows:
        ```bash
        npm run genkit:dev
        ```
        This starts the Genkit development server, which your Next.js app will call for AI functionality.

    Once both servers are running, you can open `http://localhost:9002` in your browser to see the application.

## Usage Guide

1.  **Select Your Language**: Use the dropdown menu at the top right to select your preferred language. The entire application will translate instantly.
2.  **Navigate Features**: Use the main tabs at the top of the page to switch between the different features:
    *   **Crop Diagnosis**: Upload an image and click "Diagnose".
    *   **Crop Advisory**: Fill in your crop, location, and sowing date, then click "Get Advisory".
    *   **Price Forecasting**: Enter a crop and location, then click "Get Forecast".
    *   **Scheme Help**: Type your question about a government scheme or use the "Ask with Voice" button to speak your query.
    *   **Voice Agent**: Click the "Start Listening" button and speak any general farming question.

## 💻 Technology Stack

*   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
*   **AI**: [Google Gemini](https://deepmind.google/technologies/gemini/)
*   **AI Framework**: [Genkit](https://firebase.google.com/docs/genkit)
*   **UI**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
*   **Component Library**: [shadcn/ui](https://ui.shadcn.com/)
*   **Deployment**: Ready for [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
