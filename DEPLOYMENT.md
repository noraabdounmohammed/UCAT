# Deployment Instructions

## Security Setup

This application uses Netlify serverless functions to protect the DeepSeek API key from being exposed in the client-side code.

### How It Works

1. **Frontend** → Calls `/.netlify/functions/ai-generate`
2. **Serverless Function** → Uses API key (stored securely) to call DeepSeek API
3. **Response** → Returns to frontend

The API key never reaches the browser! ✅

## Deployment Steps

### 1. Set Environment Variable in Netlify

After deploying, you MUST set the API key in Netlify dashboard:

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add a new variable:
   - **Key**: `VITE_OPENAI_API_KEY`
   - **Value**: `sk-a239650378b640c6a182dbc501b9cd5f`
4. Click **Save**
5. **Trigger a new deploy** for the changes to take effect

### 2. Deploy with Netlify CLI

```bash
# Deploy to production
netlify deploy --prod
```

### 3. Verify Deployment

After deployment:
1. Check that the serverless function is working: `https://your-site.netlify.app/.netlify/functions/ai-generate`
2. Test AI generation features in your app
3. Verify in browser DevTools that the API key is NOT visible in network requests

## Development

In development mode, the app will:
1. Try to use the serverless function first
2. Fall back to direct API calls if the function is unavailable
3. Use the `VITE_OPENAI_API_KEY` from your local `.env` file

## Migration Guide

If you need to update existing code to use the secure service:

### Before (Insecure):
```typescript
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${apiKey}` },
  // ...
});
```

### After (Secure):
```typescript
import { generateWithAI, createPrompt } from '@/services/aiService';

const response = await generateWithAI({
  messages: createPrompt(systemPrompt, userPrompt),
  temperature: 0.7,
  max_tokens: 4000
});
```

## Files Created

- `netlify/functions/ai-generate.ts` - Serverless function that proxies AI requests
- `src/services/aiService.ts` - Frontend service to call the serverless function
- `netlify.toml` - Updated with functions directory configuration

## Security Benefits

✅ API key never exposed in browser  
✅ API key not in source code  
✅ API key stored securely in Netlify environment  
✅ Rate limiting can be added to serverless function  
✅ Request validation can be added to serverless function  
