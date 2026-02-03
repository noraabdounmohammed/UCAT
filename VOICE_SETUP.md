# Voice AI Integration Setup Guide

This guide will help you add **voice responses** to your AI assistant using Inworld AI's Text-to-Speech.

## Features

- 🔊 **AI voice responses** - Hear explanations spoken back to you
- 💬 **Hybrid mode** - Switch seamlessly between voice and text
- 🎯 **Works with existing AI** - Uses your DeepSeek integration for intelligence
- 📱 **Simple setup** - Just 2 credentials needed!

## What You Get

Your existing AI assistant will:
- ✅ Continue using DeepSeek for smart responses
- ✅ **NEW:** Speak responses out loud using Inworld's natural voice
- ✅ Show both text and play audio simultaneously
- ✅ Let users toggle voice on/off

## Quick Setup (2 Steps!)

### Step 1: Get Inworld Credentials

1. Go to [Inworld Studio](https://studio.inworld.ai)
2. Click **"Create Character"**
3. Configure your medical tutor character:

   **Character Name:** Medical Education Assistant
   
   **Personality Traits:**
   - Expert medical educator
   - Patient and supportive
   - Clear and concise explanations
   - Encourages critical thinking
   
   **Knowledge Base:**
   - Medical education
   - UKMLA exam preparation
   - Clinical reasoning
   - Evidence-based medicine
   
   **Voice Settings:**
   - Choose a clear, professional voice
   - Recommended: "Alloy" or "Nova" for clarity
   
   **Instructions/Prompt:**
   ```
   You are an expert medical education tutor helping students prepare for the UKMLA exam.
   
   Your role:
   - Explain medical concepts clearly and accurately
   - Provide clinical examples when helpful
   - Break down complex topics into understandable parts
   - Encourage active learning and critical thinking
   - Be supportive and patient
   
   Communication style:
   - Use clear, professional language
   - Avoid unnecessary jargon unless explaining it
   - Give structured explanations (e.g., definition, mechanism, clinical relevance)
   - Provide mnemonics when appropriate
   
   When answering questions:
   1. Address the specific question directly
   2. Provide context and clinical relevance
   3. Offer examples if helpful
   4. Check understanding by asking follow-up questions
   ```

4. Click **"Create"** and note your **Character ID**

## Step 2: Create Scene

1. In Inworld Studio, go to **"Scenes"**
2. Click **"Create Scene"**
3. Add your medical tutor character to the scene
4. Configure scene settings:
   - **Name:** Medical Study Session
   - **Description:** Interactive medical education with voice support
5. Note your **Scene ID**

## Step 3: Get API Credentials

1. In Inworld Studio, go to **"Settings"** → **"API Keys"**
2. Click **"Generate New Key"**
3. Copy the following credentials:
   - **Workspace ID** (found in URL: `studio.inworld.ai/workspaces/[WORKSPACE_ID]`)
   - **API Key**
   - **API Secret**

⚠️ **Security Note:** Keep your API Secret secure. Never commit it to version control.

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env` if you haven't already:
   ```bash
   cp .env.example .env
   ```

2. Add your Inworld credentials to `.env`:
   ```env
   VITE_INWORLD_WORKSPACE_ID=your-workspace-id-here
   VITE_INWORLD_SCENE_ID=your-scene-id-here
   VITE_INWORLD_API_KEY=your-api-key-here
   VITE_INWORLD_API_SECRET=your-api-secret-here
   ```

3. Replace the placeholder values with your actual credentials

## Step 5: Test the Integration

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open your app and start a practice session

3. Open the AI assistant (chat icon)

4. Click the **"Voice"** toggle button in the header

5. You should see:
   - "Connecting..." status
   - Then "Connected" in green
   - A blue "Hold to Talk" button

6. Test voice input:
   - Click and hold the "Hold to Talk" button
   - Speak your question (e.g., "Explain heart failure")
   - Release the button
   - The AI should respond with voice and text

## Usage

### Voice Mode Controls

- **Voice/Text Toggle** - Switch between voice and text mode
- **Hold to Talk** - Press and hold to record your voice
- **Mute Button** - Mute AI voice responses (still shows text)
- **Type Below** - You can still type even in voice mode

### Best Practices

1. **Speak clearly** - Natural pace, clear pronunciation
2. **One question at a time** - Better for AI understanding
3. **Use quiet environment** - Reduces background noise
4. **Check microphone** - Ensure browser has permission

### Troubleshooting

**"Inworld credentials not configured" error:**
- Check that all 4 environment variables are set in `.env`
- Restart your dev server after adding credentials

**"Failed to access microphone" error:**
- Grant microphone permission in browser settings
- Check that no other app is using the microphone

**"Disconnected from voice service" error:**
- Check your internet connection
- Verify API credentials are correct
- Check Inworld Studio for service status

**No voice response (only text):**
- Check that mute button is not active
- Verify browser audio is not muted
- Try refreshing the page

## Cost Considerations

Inworld AI pricing (as of 2024):
- **Free Tier:** 5,000 interactions/month
- **Pro Tier:** $20/month for 50,000 interactions
- **Enterprise:** Custom pricing

Each voice interaction (question + response) counts as 1 interaction.

For development/testing, the free tier should be sufficient.

## Advanced Configuration

### Custom Voice Settings

Edit `src/services/inworldService.ts` to customize:

```typescript
this.client = new InworldClient()
  .setConfiguration({
    capabilities: { 
      audio: true,
      emotions: true,        // Enable emotional responses
      narratedActions: true  // Enable action descriptions
    },
  })
```

### Adjust Context

The AI receives curriculum context automatically. To customize what context is sent:

Edit in `AIHelperClean.tsx`:
```typescript
const context = curriculumName && conceptTitles 
  ? `Curriculum: ${curriculumName}, Concepts: ${conceptTitles.join(', ')}`
  : undefined;
```

## Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use environment variables** - Don't hardcode credentials
3. **Rotate API keys** - Periodically regenerate in Inworld Studio
4. **Production deployment** - Use secure secret management (e.g., Netlify environment variables)

## Support

- **Inworld Documentation:** [https://docs.inworld.ai](https://docs.inworld.ai)
- **Inworld Discord:** [https://discord.gg/inworld](https://discord.gg/inworld)
- **GitHub Issues:** Report bugs in your repository

## Next Steps

Once voice is working:

1. **Customize character personality** - Adjust in Inworld Studio
2. **Add more context** - Include specific concept details
3. **Implement voice commands** - Add shortcuts like "Next question"
4. **Analytics** - Track voice usage vs text usage
5. **Feedback system** - Let users rate voice responses

---

**Congratulations!** 🎉 Your AI assistant now supports real-time voice conversations!
