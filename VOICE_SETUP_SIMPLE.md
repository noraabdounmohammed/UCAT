# Simple Voice Setup Guide

## What This Does

Adds **voice responses** to your AI assistant! The AI will speak its answers out loud using Inworld's natural text-to-speech.

## Super Quick Setup

### 1. Get Your Credentials

You already found the **"Try API"** section in Inworld Studio! That's exactly what you need.

From that code example you shared, extract:
- **API Key**: The part before the colon in the Base64 string
- **API Secret**: The part after the colon

From your example:
```javascript
'Authorization': 'Basic Mjc0MG9hMVpxT3B4OFNKZ2J5YlB1VjhQSUtuWjlVTFA6YW9BTG9JMjhHMWtjTjhENlZkSUpkQWt1czRTVHZ1VUhyYTROdFQxSjJNZ2lGMGNkNzhkeHZCaWc2bHBsV0o2Yg=='
```

The Base64 string decodes to: `[API_KEY]:[API_SECRET]`

**OR** just look in the "Try API" section - they should show you the credentials directly!

### 2. Add to Your `.env` File

Open your `.env` file and add these two lines:

```env
VITE_INWORLD_API_KEY=2740oa1ZqOpx8SJgbybPuV8PIKnZ9ULP
VITE_INWORLD_API_SECRET=aoALoI28G1kcN8D6VdIJdAkus4STvuUHra4NtT1J2MgIF0cd78dxvBig6lplWJ6b
```

*(Replace with your actual credentials from Inworld Studio)*

### 3. Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 4. Test It!

1. Open your app
2. Start a practice session
3. Open the AI assistant (chat icon)
4. Click the **"Voice"** toggle button in the header
5. You should see "Connected" in green
6. Ask a question (by typing)
7. The AI will respond with **both text AND voice**! 🎉

## How It Works

- **You type** → DeepSeek generates smart response → **Inworld speaks it**
- **You type** → Response appears as text → **Audio plays automatically**
- **Toggle voice off** → Back to text-only mode

## Voice Controls

- **Voice/Text Toggle** - Top left of AI assistant
- **Mute Button** - Top right (mutes voice, keeps text)
- **Type normally** - Voice mode doesn't change how you input questions

## Troubleshooting

**"Inworld credentials not configured"**
- Make sure both `VITE_INWORLD_API_KEY` and `VITE_INWORLD_API_SECRET` are in your `.env` file
- Restart your dev server after adding them

**"Failed to connect"**
- Check that your credentials are correct
- Make sure you copied them exactly (no extra spaces)
- Verify your Inworld account is active

**No sound**
- Check your computer/browser volume
- Click the mute button to make sure it's not muted
- Try refreshing the page

## That's It!

No character creation, no scenes, no complex setup. Just 2 credentials and you're done! 🚀

---

**Cost:** Inworld TTS has a free tier with generous limits. Perfect for development and testing.
