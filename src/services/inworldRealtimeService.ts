/**
 * Inworld Realtime API Service for AI Tutor
 * Compatible with OpenAI Realtime API events but uses Inworld's cheaper infrastructure
 * Provides real-time voice conversation with access to concepts and progress
 */

export interface FilterCategory {
  name: string;
  color: string;
  filters: string[];
}

export interface ConceptProgress {
  concept_id: string;
  title: string;
  mastery_level: 'unseen' | 'introduced' | 'developing' | 'competent' | 'mastered';
  times_practiced: number;
  last_practiced?: Date;
  custom_filters?: string[];
  filter_categories?: FilterCategory[];
}

export interface TutorContext {
  curriculumName: string;
  concepts: ConceptProgress[];
  totalConcepts: number;
  masteredCount: number;
  developingCount: number;
  unseenCount: number;
}

export interface InworldRealtimeCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onSpeechStarted: () => void;
  onSpeechEnded: () => void;
  onTranscript: (text: string, isFinal: boolean, isUser: boolean) => void;
  onError: (error: string) => void;
  onAudioLevel: (level: number) => void;
}

export class InworldRealtimeService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private isConnected = false;
  private isSpeaking = false;
  private callbacks: InworldRealtimeCallbacks | null = null;
  private tutorContext: TutorContext | null = null;
  private apiKey: string = '';
  private apiSecret: string = '';

  constructor() {
    // Initialize audio context on first user interaction
  }

  /**
   * Set the tutor context with concepts and progress
   */
  setContext(context: TutorContext): void {
    this.tutorContext = context;
    
    // If already connected, update the session
    if (this.isConnected && this.ws) {
      this.updateSessionContext();
    }
  }

  /**
   * Build system prompt with concept and progress data
   */
  private buildSystemPrompt(): string {
    if (!this.tutorContext) {
      return `You are an elite exam-preparation tutor. Help students master medical concepts through strategic teaching. Keep them on track.`;
    }

    const { curriculumName, concepts, totalConcepts, masteredCount, developingCount, unseenCount } = this.tutorContext;
    
    // Extract topics from Conditions and Presentations filter categories only
    const topicMap = new Map<string, { concepts: string[], unseenCount: number, weakCount: number, masteredCount: number }>();
    
    const topicCategories = ['Conditions', 'Presentations'];
    
    const systemFilters = new Set([
      curriculumName,
      'Cardiology', 'Respiratory', 'Neurology', 'Gastroenterology', 'Nephrology', 'Endocrinology',
      'Management', 'Investigations', 'Clinical features', 'Pathophysiology', 'Aetiology', 'Epidemiology', 'Prognosis',
      'Diagnosis', 'Treatment', 'Prevention', 'Complications', 'Risk factors'
    ]);
    
    concepts.forEach(c => {
      const categories = c.filter_categories || [];
      const topicFilters: string[] = [];
      
      categories.forEach(cat => {
        if (topicCategories.includes(cat.name) && cat.filters) {
          topicFilters.push(...cat.filters);
        }
      });
      
      let filters: string[];
      if (topicFilters.length > 0) {
        filters = topicFilters;
      } else {
        filters = (c.custom_filters || []).filter(f => !systemFilters.has(f));
      }
      
      filters.forEach(filter => {
        if (systemFilters.has(filter)) return;
        
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
    
    const sortedTopics = Array.from(topicMap.entries())
      .sort((a, b) => {
        if (b[1].unseenCount !== a[1].unseenCount) return b[1].unseenCount - a[1].unseenCount;
        return b[1].weakCount - a[1].weakCount;
      });
    
    const topicSummaries = sortedTopics.slice(0, 15).map(([topic, data]) => {
      const total = data.concepts.length;
      const progress = data.masteredCount === total ? '✓ Complete' : 
                       data.unseenCount > 0 ? `${data.unseenCount} unseen` :
                       data.weakCount > 0 ? `${data.weakCount} weak` : 'In progress';
      return `• ${topic} (${total} concepts) — ${progress}`;
    }).join('\n');
    
    const priorityTopics = sortedTopics
      .filter(([_, data]) => data.unseenCount > 0 || data.weakCount > 0)
      .slice(0, 5)
      .map(([topic, data]) => {
        const conceptList = data.concepts.slice(0, 5).join(', ');
        const more = data.concepts.length > 5 ? ` (+${data.concepts.length - 5} more)` : '';
        return `**${topic}**: ${conceptList}${more}`;
      }).join('\n');
    
    const highestPriorityTopic = sortedTopics[0]?.[0] || 'the next topic';
    const highestPriorityTopicConcepts = sortedTopics[0]?.[1]?.concepts.slice(0, 5).join(', ') || '';

    return `You are an elite exam-preparation tutor for ${curriculumName}.

Your ultimate goal is to help the student master the entire curriculum as quickly, deeply, and enjoyably as possible.

You teach like the best human tutors:
– you build momentum
– you connect ideas into coherent mental models
– you sequence topics intelligently
– you constantly test understanding
– and you make learning feel smooth, motivating, and inevitable.

━━━━━━━━━━━━━━━━━━━━━━
📚 TOPICS & CURRICULUM
━━━━━━━━━━━━━━━━━━━━━━

TOPICS are the main teaching units (e.g., "Hypertension", "Heart Failure", "Chest Pain").
Each topic contains multiple CONCEPTS that you teach together as a cluster.

Available Topics (sorted by priority):
${topicSummaries}

━━━━━━━━━━━━━━━━━━━━━━
🎯 HIGH PRIORITY TOPICS
━━━━━━━━━━━━━━━━━━━━━━

These topics need attention (with their concepts):
${priorityTopics || 'All topics are well-covered!'}

━━━━━━━━━━━━━━━━━━━━━━
📊 STUDENT STATE
━━━━━━━━━━━━━━━━━━━━━━

Overall Progress:
- Total concepts: ${totalConcepts}
- Mastered: ${masteredCount} (${Math.round(masteredCount/totalConcepts*100)}%)
- Developing: ${developingCount}
- Not yet covered: ${unseenCount}

━━━━━━━━━━━━━━━━━━━━━━
🧠 TEACHING STRATEGY
━━━━━━━━━━━━━━━━━━━━━━

**CRITICAL: Teach by TOPIC, not by individual concept.**

1. Select a TOPIC and commit to completing it
2. Teach ALL concepts within that topic before moving to the next topic
3. Within a topic, sequence concepts logically (foundations → specifics → complications)
4. For each concept:
   – introduce briefly
   – apply in a clinical scenario
   – test with a quick question
   – reinforce if needed
5. When a topic is complete, summarize key points and move to the next priority topic
6. Keep the student oriented: "We're covering ${highestPriorityTopic}. This includes: ${highestPriorityTopicConcepts}..."

━━━━━━━━━━━━━━━━━━━━━━
🗣 STYLE
━━━━━━━━━━━━━━━━━━━━━━

This is a voice-style conversation:
– concise
– energetic
– confident
– encouraging
– 2–4 sentences per teaching chunk

You are warm but precise.
You sound like a brilliant registrar teaching on a ward round.

━━━━━━━━━━━━━━━━━━━━━━
🧪 CHECK UNDERSTANDING

After every teaching chunk, ask ONE sharp question that checks:
– recognition
– application
– or differentiation.

If they get it wrong:
– correct
– explain briefly
– and re-test.

━━━━━━━━━━━━━━━━━━━━━━
🚦 KEEPING ON TRACK

If the student goes off topic:
briefly answer in one sentence, then redirect:

"Good question — now let's get back to ${highestPriorityTopic}…"

If they want to chat:
"Let's stay focused — we still have ${unseenCount} concepts to master."

━━━━━━━━━━━━━━━━━━━━━━
🎤 USER INTRO MESSAGE
━━━━━━━━━━━━━━━━━━━━━━

Your first message to the student must briefly explain:

• that you are an adaptive exam tutor
• that you stick strictly to their curriculum
• that you teach topic-by-topic and complete each topic fully
• that you optimize for speed-to-mastery
• that they can control pacing or depth anytime

Limit to 3–5 sentences.

Then:

– mention their overall progress
– propose the highest-priority TOPIC: "${highestPriorityTopic}"
– briefly mention what concepts it covers
– ask whether they want that topic or another topic from the curriculum.

━━━━━━━━━━━━━━━━━━━━━━
▶ SESSION START
━━━━━━━━━━━━━━━━━━━━━━

Execute the above.`;
  }

  /**
   * Connect to Inworld Realtime API
   */
  async connect(apiKey: string, callbacks: InworldRealtimeCallbacks, apiSecret?: string): Promise<void> {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret || '';
    this.callbacks = callbacks;

    try {
      // Initialize audio context
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });

      // Get credentials from our server-side function
      console.log('🔑 Getting Inworld credentials...');
      const sessionResponse = await fetch('/.netlify/functions/inworld-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(errorData.error || 'Failed to get credentials');
      }

      const sessionData = await sessionResponse.json();
      console.log('🎫 Credentials received, connecting to WebSocket...');

      // Connect to Inworld Realtime API via WebSocket
      // Use subprotocol to pass auth (browsers support this)
      const wsUrl = sessionData.wsUrl;
      
      // Try connecting with auth in subprotocol
      this.ws = new WebSocket(wsUrl, [`realtime`, `openai-insecure-api-key.${sessionData.credentials}`]);

      this.ws.onopen = () => {
        console.log('🎤 Inworld Realtime API connected');
        this.isConnected = true;
        
        this.initializeSession();
        this.callbacks?.onConnected();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.callbacks?.onError('Connection error');
      };

      this.ws.onclose = () => {
        console.log('🎤 Inworld Realtime API disconnected');
        this.isConnected = false;
        this.callbacks?.onDisconnected();
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      this.callbacks?.onError(`Failed to connect: ${error}`);
      throw error;
    }
  }

  /**
   * Initialize the realtime session with tutor configuration
   */
  private initializeSession(): void {
    if (!this.ws) return;

    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: this.buildSystemPrompt(),
        voice: 'shimmer', // Inworld supports various voices
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.6,
          prefix_padding_ms: 200,
          silence_duration_ms: 400
        },
        max_response_output_tokens: 1024
      }
    };

    this.ws.send(JSON.stringify(sessionConfig));
    console.log('🎤 Session configured');

    // Start audio capture
    this.startAudioCapture();
  }

  /**
   * Trigger AI greeting after session is initialized
   */
  triggerGreeting(): void {
    if (!this.ws || !this.isConnected) return;

    // Send a response.create to trigger the AI to speak first
    this.ws.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    }));
    console.log('🎤 Triggered AI greeting');
  }

  /**
   * Update session context when concepts change
   */
  private updateSessionContext(): void {
    if (!this.ws) return;

    const sessionUpdate = {
      type: 'session.update',
      session: {
        instructions: this.buildSystemPrompt()
      }
    };

    this.ws.send(JSON.stringify(sessionUpdate));
    console.log('🎤 Session context updated');
  }

  /**
   * Start capturing audio from microphone
   */
  private startAudioCapture(): void {
    if (!this.mediaStream || !this.audioContext) return;

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate audio level for visualization
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.callbacks?.onAudioLevel(rms);

      // Convert to 16-bit PCM
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
      }

      // Send audio to API
      const base64Audio = this.arrayBufferToBase64(pcm16.buffer);
      this.ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Audio
      }));
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  /**
   * Handle incoming messages from the API
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'session.created':
        console.log('🎤 Session created');
        // Trigger greeting after session is ready
        setTimeout(() => this.triggerGreeting(), 500);
        break;

      case 'session.updated':
        console.log('🎤 Session updated');
        break;

      case 'input_audio_buffer.speech_started':
        this.isSpeaking = true;
        // Auto-interrupt: stop AI audio when user starts speaking
        this.stopAudioPlayback();
        this.interrupt();
        this.callbacks?.onSpeechStarted();
        break;

      case 'input_audio_buffer.speech_stopped':
        this.isSpeaking = false;
        this.callbacks?.onSpeechEnded();
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcribed
        this.callbacks?.onTranscript(message.transcript, true, true);
        break;

      case 'response.audio_transcript.delta':
        // AI response text (streaming)
        this.callbacks?.onTranscript(message.delta, false, false);
        break;

      case 'response.audio_transcript.done':
        // AI response complete - this is the final text
        this.callbacks?.onTranscript(message.transcript, true, false);
        break;

      case 'response.done':
        // Response complete - don't extract text here to avoid duplicates
        console.log('🎤 Response complete');
        break;

      case 'response.audio.delta':
        // AI audio response
        this.playAudioChunk(message.delta);
        break;

      case 'error':
        console.error('API error:', message.error);
        this.callbacks?.onError(message.error?.message || 'Unknown error');
        break;
    }
  }

  /**
   * Play audio chunk from base64
   */
  private playAudioChunk(base64Audio: string): void {
    if (!this.audioContext) return;

    const audioData = this.base64ToArrayBuffer(base64Audio);
    this.audioQueue.push(audioData);

    if (!this.isPlaying) {
      this.playNextChunk();
    }
  }

  /**
   * Play next audio chunk from queue
   */
  private playNextChunk(): void {
    if (this.audioQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      this.currentSource = null;
      return;
    }

    this.isPlaying = true;
    const audioData = this.audioQueue.shift()!;

    // Convert PCM16 to AudioBuffer
    const pcm16 = new Int16Array(audioData);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    // Track current source for interruption
    this.currentSource = source;
    
    source.onended = () => {
      if (this.currentSource === source) {
        this.currentSource = null;
      }
      this.playNextChunk();
    };
    
    source.start();
  }

  /**
   * Stop current audio playback immediately
   */
  private stopAudioPlayback(): void {
    // Stop current playing source
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Already stopped
      }
      this.currentSource = null;
    }
    
    // Clear the queue
    this.audioQueue = [];
    this.isPlaying = false;
  }

  /**
   * Send a text message (for typing instead of speaking)
   */
  sendTextMessage(text: string): void {
    if (!this.ws || !this.isConnected) return;

    // Add user message to conversation
    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    }));

    // Request a response with both text and audio
    this.ws.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    }));
  }

  /**
   * Interrupt the current response
   */
  interrupt(): void {
    if (!this.ws || !this.isConnected) return;

    // Stop audio playback immediately
    this.stopAudioPlayback();

    // Send cancel to API
    this.ws.send(JSON.stringify({
      type: 'response.cancel'
    }));
  }

  /**
   * Disconnect from the API
   */
  disconnect(): void {
    // Stop audio playback
    this.stopAudioPlayback();
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
  }

  /**
   * Helper: Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Helper: Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
