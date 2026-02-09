/**
 * Hybrid Tutor Service
 * Combines:
 * - Browser Speech Recognition (free) for voice input
 * - OpenAI Chat API (cheaper than Realtime) for conversation
 * - Inworld TTS (cheap) for voice output
 * 
 * This provides a cost-effective voice tutoring experience
 */

import { TutorContext, ConceptProgress } from './realtimeTutorService';

export interface HybridTutorCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onSpeechStarted: () => void;
  onSpeechEnded: () => void;
  onTranscript: (text: string, isFinal: boolean, isUser: boolean) => void;
  onError: (error: string) => void;
  onAudioLevel?: (level: number) => void;
}

export class HybridTutorService {
  private isConnected = false;
  private isSpeaking = false;
  private isListening = false;
  private tutorContext: TutorContext | null = null;
  private callbacks: HybridTutorCallbacks | null = null;
  private conversationHistory: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];
  
  // Speech Recognition
  private speechRecognition: any = null;
  
  // Audio playback
  private currentAudio: HTMLAudioElement | null = null;
  private inworldAuthToken: string = '';

  constructor() {
    // Initialize browser speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'en-US';
    }
  }

  setContext(context: TutorContext): void {
    this.tutorContext = context;
    
    // Update system prompt in conversation history
    const systemPrompt = this.buildSystemPrompt();
    const systemIndex = this.conversationHistory.findIndex(m => m.role === 'system');
    if (systemIndex >= 0) {
      this.conversationHistory[systemIndex].content = systemPrompt;
    }
  }

  private buildSystemPrompt(): string {
    if (!this.tutorContext) {
      return `You are an elite exam-preparation tutor. Help students master medical concepts through strategic teaching. Keep responses concise for voice conversation.`;
    }

    const { curriculumName, concepts, totalConcepts, masteredCount, developingCount, unseenCount } = this.tutorContext;
    
    // Build topic map from filter categories
    const topicMap = new Map<string, { concepts: string[], unseenCount: number, weakCount: number, masteredCount: number }>();
    const topicCategories = ['Conditions', 'Presentations'];
    
    concepts.forEach(c => {
      const categories = c.filter_categories || [];
      const topicFilters: string[] = [];
      
      categories.forEach(cat => {
        if (topicCategories.includes(cat.name) && cat.filters) {
          topicFilters.push(...cat.filters);
        }
      });
      
      const systemFilters = [curriculumName, 'Management', 'Investigations', 'Clinical features', 'Pathophysiology', 'Aetiology', 'Epidemiology', 'Prognosis', 'Systems', 'Other'];
      const filters = topicFilters.length > 0 ? topicFilters : (c.custom_filters || []).filter(f => !systemFilters.includes(f));
      
      filters.forEach(filter => {
        if (!topicMap.has(filter)) {
          topicMap.set(filter, { concepts: [], unseenCount: 0, weakCount: 0, masteredCount: 0 });
        }
        const topic = topicMap.get(filter)!;
        topic.concepts.push(c.title);
        if (c.mastery_level === 'unseen') topic.unseenCount++;
        else if (c.mastery_level === 'introduced' || c.mastery_level === 'developing') topic.weakCount++;
        else if (c.mastery_level === 'mastered' || c.mastery_level === 'competent') topic.masteredCount++;
      });
    });

    // Find highest priority topic
    let highestPriorityTopic = '';
    let highestScore = -1;
    topicMap.forEach((data, topic) => {
      const score = data.unseenCount * 3 + data.weakCount * 2;
      if (score > highestScore) {
        highestScore = score;
        highestPriorityTopic = topic;
      }
    });

    const topicSummary = Array.from(topicMap.entries())
      .map(([topic, data]) => `• ${topic}: ${data.unseenCount} unseen, ${data.weakCount} weak, ${data.masteredCount} mastered`)
      .slice(0, 5)
      .join('\n');

    return `You are an elite exam-preparation tutor for ${curriculumName}.

STUDENT PROGRESS:
• Total concepts: ${totalConcepts}
• Mastered: ${masteredCount}
• Developing: ${developingCount}  
• Unseen: ${unseenCount}

TOPICS TO COVER:
${topicSummary}

HIGHEST PRIORITY: ${highestPriorityTopic}

TEACHING APPROACH:
1. Focus on ONE topic at a time until mastered
2. Use Socratic questioning - ask, don't lecture
3. Keep responses SHORT (2-3 sentences) for voice conversation
4. After teaching a concept, quiz the student
5. Move to next topic only when current is understood

Start by greeting the student, mentioning their progress, and suggesting to work on "${highestPriorityTopic}".`;
  }

  async connect(callbacks: HybridTutorCallbacks): Promise<void> {
    this.callbacks = callbacks;

    try {
      // Get Inworld credentials for TTS
      const sessionResponse = await fetch('/.netlify/functions/inworld-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        this.inworldAuthToken = sessionData.credentials;
        console.log('🔊 Inworld TTS ready');
      } else {
        console.warn('Inworld TTS not available, will use browser TTS');
      }

      // Setup speech recognition handlers
      if (this.speechRecognition) {
        this.speechRecognition.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          const isFinal = result.isFinal;
          
          this.callbacks?.onTranscript(transcript, isFinal, true);
          
          if (isFinal) {
            this.processUserInput(transcript);
          }
        };

        this.speechRecognition.onend = () => {
          this.isListening = false;
          // Auto-restart if still connected
          if (this.isConnected && !this.isSpeaking) {
            setTimeout(() => this.startListening(), 100);
          }
        };

        this.speechRecognition.onerror = (event: any) => {
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.error('Speech recognition error:', event.error);
          }
        };
      }

      // Initialize conversation with system prompt
      this.conversationHistory = [
        { role: 'system', content: this.buildSystemPrompt() }
      ];

      this.isConnected = true;
      this.callbacks?.onConnected();

      // Start with AI greeting
      await this.generateAndSpeak("Hello! I'm your AI tutor. Let me check your progress and we'll get started.");
      
      // Start listening
      this.startListening();

    } catch (error) {
      console.error('Failed to connect:', error);
      this.callbacks?.onError(`Failed to connect: ${error}`);
      throw error;
    }
  }

  private startListening(): void {
    if (!this.speechRecognition || this.isListening || this.isSpeaking) return;
    
    try {
      this.speechRecognition.start();
      this.isListening = true;
      this.callbacks?.onSpeechStarted();
    } catch (e) {
      // Already started
    }
  }

  private stopListening(): void {
    if (!this.speechRecognition || !this.isListening) return;
    
    try {
      this.speechRecognition.stop();
      this.isListening = false;
      this.callbacks?.onSpeechEnded();
    } catch (e) {
      // Already stopped
    }
  }

  private async processUserInput(text: string): Promise<void> {
    if (!text.trim()) return;

    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: text });

    // Stop listening while generating response
    this.stopListening();

    try {
      // Call OpenAI Chat API via our function
      const response = await fetch('/.netlify/functions/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          messages: this.conversationHistory,
          model: 'gpt-4o-mini', // Cheaper model
          max_tokens: 200, // Keep responses short for voice
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse = data.content || data.message || '';

      // Add to history
      this.conversationHistory.push({ role: 'assistant', content: aiResponse });

      // Speak the response
      await this.generateAndSpeak(aiResponse);

    } catch (error) {
      console.error('Failed to process input:', error);
      this.callbacks?.onError('Failed to get response');
    }

    // Resume listening
    this.startListening();
  }

  private async generateAndSpeak(text: string): Promise<void> {
    this.isSpeaking = true;
    
    // Send transcript to UI
    this.callbacks?.onTranscript(text, true, false);

    try {
      if (this.inworldAuthToken) {
        // Use Inworld TTS
        await this.speakWithInworld(text);
      } else {
        // Fallback to browser TTS
        await this.speakWithBrowser(text);
      }
    } catch (error) {
      console.error('TTS error:', error);
      // Fallback to browser TTS
      await this.speakWithBrowser(text);
    }

    this.isSpeaking = false;
  }

  private async speakWithInworld(text: string): Promise<void> {
    const cleanText = this.sanitizeForTTS(text);
    
    const response = await fetch('https://api.inworld.ai/tts/v1/voice:stream', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.inworldAuthToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: cleanText,
        voiceId: 'Ashley',
        modelId: 'inworld-tts-1.5-max',
        audio_config: {
          audio_encoding: 'MP3',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.status}`);
    }

    // Parse NDJSON response
    const responseText = await response.text();
    const lines = responseText.trim().split('\n');
    let audioBase64 = '';
    
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line);
        if (chunk.result?.audioContent) {
          audioBase64 += chunk.result.audioContent;
        } else if (chunk.audioContent) {
          audioBase64 += chunk.audioContent;
        }
      } catch (e) {
        // Skip invalid lines
      }
    }

    if (!audioBase64) {
      throw new Error('No audio in response');
    }

    // Play audio
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
    await this.playAudio(audioBlob);
  }

  private speakWithBrowser(text: string): Promise<void> {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(this.sanitizeForTTS(text));
      utterance.rate = 1.1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      speechSynthesis.speak(utterance);
    });
  }

  private playAudio(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      this.currentAudio = new Audio(url);
      
      this.currentAudio.onended = () => {
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        resolve();
      };
      
      this.currentAudio.onerror = () => {
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        reject(new Error('Audio playback failed'));
      };
      
      this.currentAudio.play().catch(reject);
    });
  }

  private sanitizeForTTS(text: string): string {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  sendTextMessage(text: string): void {
    this.processUserInput(text);
  }

  interrupt(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    speechSynthesis.cancel();
    this.isSpeaking = false;
  }

  disconnect(): void {
    this.stopListening();
    this.interrupt();
    this.isConnected = false;
    this.callbacks?.onDisconnected();
  }
}

export type { TutorContext, ConceptProgress };
