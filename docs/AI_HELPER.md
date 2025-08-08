# AI Study Assistant Feature

The MedICU application now includes an AI Study Assistant feature that allows students to ask follow-up questions about practice problems. This document explains how to set up and use this feature.

## Overview

The AI Study Assistant is integrated into the practice session interface and appears after a student answers a question. It provides:

- A collapsible chat interface styled with Apple's Human Interface Guidelines
- The ability to ask follow-up questions about the current question
- AI-powered responses that provide additional context and explanations
- A seamless experience integrated with the existing practice flow

## Setup Instructions

### 1. OpenAI API Key

The AI Study Assistant uses OpenAI's API to generate responses. To enable this feature with real AI responses:

1. Sign up for an OpenAI API key at [https://platform.openai.com/signup](https://platform.openai.com/signup)
2. Once you have your API key, open the `.env` file in the root of the project
3. Replace `your-openai-api-key-goes-here` with your actual OpenAI API key:

```
VITE_OPENAI_API_KEY=your-actual-api-key-here
```

4. Restart the application

**Note:** If you don't add an API key, the assistant will fall back to using pre-defined responses based on keywords in the user's questions.

### 2. Customizing the AI Model

By default, the AI Study Assistant uses the `gpt-3.5-turbo` model. If you want to use a different model:

1. Open `src/services/openai.ts`
2. Find the `generateAIResponse` function
3. Change the model parameter in the OpenAI API call:

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4", // Change to your preferred model
  // other parameters...
});
```

## How It Works

1. When a student answers a question, the AI Study Assistant becomes available
2. The student can click on the assistant to expand the chat interface
3. The student can type questions related to the current problem
4. The assistant generates responses based on:
   - The question content
   - The correct answer
   - The explanation provided
   - The student's selected answer

## Security Considerations

- The OpenAI API key is stored in the client-side environment variables
- For production use, consider implementing a backend proxy for API calls to avoid exposing your API key
- Monitor your OpenAI API usage to manage costs

## Future Enhancements

Potential future improvements to the AI Study Assistant include:

1. Adding memory of previous conversations within a practice session
2. Implementing a backend proxy for API calls
3. Adding support for image and diagram explanations
4. Integrating with the student's performance data to provide personalized guidance
5. Adding voice input/output options
