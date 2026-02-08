/**
 * OpenAI Realtime API Service for AI Tutor
 * Provides real-time voice conversation with access to concepts and progress
 */

export interface ConceptProgress {
  concept_id: string;
  title: string;
  mastery_level: 'unseen' | 'introduced' | 'developing' | 'competent' | 'mastered';
  times_practiced: number;
  last_practiced?: Date;
  custom_filters?: string[];
}

export interface TutorContext {
  curriculumName: string;
  concepts: ConceptProgress[];
  totalConcepts: number;
  masteredCount: number;
  developingCount: number;
  unseenCount: number;
}

export interface RealtimeTutorCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onSpeechStarted: () => void;
  onSpeechEnded: () => void;
  onTranscript: (text: string, isFinal: boolean, isUser: boolean) => void;
  onError: (error: string) => void;
  onAudioLevel: (level: number) => void;
}

export class RealtimeTutorService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private isConnected = false;
  private isSpeaking = false;
  private callbacks: RealtimeTutorCallbacks | null = null;
  private tutorContext: TutorContext | null = null;
  private apiKey: string = '';

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
    
    // Priority 1: Unseen concepts (never covered)
    const unseenConcepts = concepts
      .filter(c => c.mastery_level === 'unseen')
      .slice(0, 15)
      .map(c => c.title);
    
    // Priority 2: Weak concepts (introduced or developing)
    const weakConcepts = concepts
      .filter(c => c.mastery_level === 'introduced' || c.mastery_level === 'developing')
      .slice(0, 10)
      .map(c => c.title);
    
    // All concept titles for reference
    const allConceptTitles = concepts.slice(0, 50).map(c => c.title);
    
    // Get first unseen concept for redirect examples
    const currentConcept = unseenConcepts[0] || weakConcepts[0] || 'the next topic';

    return `You are an elite exam-preparation tutor for ${curriculumName}.

Your ultimate goal is not merely to move through concepts, but to help the student
master the entire curriculum as quickly, deeply, and enjoyably as possible.

You teach like the best human tutors:
– you build momentum
– you connect ideas into coherent mental models
– you sequence topics intelligently
– you constantly test understanding
– and you make learning feel smooth, motivating, and inevitable.

━━━━━━━━━━━━━━━━━━━━━━
📚 CURRICULUM BOUNDARIES
━━━━━━━━━━━━━━━━━━━━━━

You may ONLY teach concepts from this curriculum:

${allConceptTitles.join(', ')}

You must never drift into content outside this list.

━━━━━━━━━━━━━━━━━━━━━━
📊 STUDENT STATE
━━━━━━━━━━━━━━━━━━━━━━

Progress:
- Total concepts: ${totalConcepts}
- Mastered: ${masteredCount} (${Math.round(masteredCount/totalConcepts*100)}%)
- Developing: ${developingCount}
- Not yet covered: ${unseenCount}

Never-covered (high priority):
${unseenConcepts.length > 0 ? unseenConcepts.join(', ') : 'All concepts have been introduced!'}

Weak / needs reinforcement:
${weakConcepts.length > 0 ? weakConcepts.join(', ') : 'No weak areas - great progress!'}

━━━━━━━━━━━━━━━━━━━━━━
🧠 TEACHING STRATEGY
━━━━━━━━━━━━━━━━━━━━━━

Teach in **strategic learning arcs**, not random jumps.

1. Start with the highest-yield unseen concept.
2. When helpful, briefly activate or link to prerequisite ideas from the curriculum.
3. Group related concepts into mini-modules rather than isolated facts.
4. Spiral learning:
   – introduce
   – apply in a clinical scenario
   – test with a quick question
   – reinforce
5. Revisit weak concepts naturally when they appear in cases.
6. Keep the student feeling oriented: explain *why* this concept matters for the exam.

━━━━━━━━━━━━━━━━━━━━━━
🎯 EXAM FOCUS
━━━━━━━━━━━━━━━━━━━━━━

Always frame teaching around:
– how this appears in questions
– common traps
– what examiners love
– red flags vs reassurance
– decision rules and algorithms

Use short clinical vignettes.

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

"Good question — now let's get back to ${currentConcept}…"

If they want to chat:
"Let's stay focused — we still have ${unseenCount} new concepts to master."

━━━━━━━━━━━━━━━━━━━━━━
🎤 USER INTRO MESSAGE
━━━━━━━━━━━━━━━━━━━━━━

Your first message to the student must briefly explain:

• that you are an adaptive exam tutor
• that you stick strictly to their curriculum
• that you teach in topic clusters and complete them
• that you optimize for speed-to-mastery
• that they can control pacing or depth anytime

Limit to 3–5 sentences.

Then:

– mention their progress
– propose the highest-yield topic to study next
– ask whether they want that topic or another curriculum topic.

━━━━━━━━━━━━━━━━━━━━━━
▶ SESSION START
━━━━━━━━━━━━━━━━━━━━━━

Execute the above.`;
  }

  /**
   * Connect to OpenAI Realtime API
   */
  async connect(apiKey: string, callbacks: RealtimeTutorCallbacks): Promise<void> {
    this.apiKey = apiKey;
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

      // Connect to OpenAI Realtime API via WebSocket
      const wsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
      
      this.ws = new WebSocket(wsUrl, [
        'realtime',
        `openai-insecure-api-key.${apiKey}`,
        'openai-beta.realtime-v1'
      ]);

      this.ws.onopen = () => {
        console.log('🎤 Realtime API connected');
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
        console.log('🎤 Realtime API disconnected');
        this.isConnected = false;
        this.callbacks?.onDisconnected();
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      this.callbacks?.onError(error instanceof Error ? error.message : 'Failed to connect');
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
        voice: 'echo', // warm, conversational voice
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'gpt-4o-transcribe' // Better accuracy than whisper-1
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.6, // Higher threshold = less false triggers
          prefix_padding_ms: 200, // Reduced for faster response
          silence_duration_ms: 400 // Shorter silence = faster turn-taking
        },
        temperature: 0.7, // Slightly lower for more consistent responses
        max_response_output_tokens: 1024 // Allow longer responses
      }
    };

    this.ws.send(JSON.stringify(sessionConfig));
    
    // Start audio streaming
    this.startAudioCapture();
    
    // Trigger AI to start the conversation with a greeting
    setTimeout(() => {
      this.triggerGreeting();
    }, 500);
  }

  /**
   * Trigger the AI to start the conversation
   */
  private triggerGreeting(): void {
    if (!this.ws || !this.isConnected) return;
    
    // Send a response.create to make the AI greet first
    this.ws.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    }));
  }

  /**
   * Update session context (when concepts/progress changes)
   */
  private updateSessionContext(): void {
    if (!this.ws) return;

    const updateConfig = {
      type: 'session.update',
      session: {
        instructions: this.buildSystemPrompt()
      }
    };

    this.ws.send(JSON.stringify(updateConfig));
  }

  /**
   * Start capturing and streaming audio from microphone
   */
  private startAudioCapture(): void {
    if (!this.mediaStream || !this.audioContext || !this.ws) return;

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!this.isConnected || !this.ws) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate audio level for visualization
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.callbacks?.onAudioLevel(rms);

      // Convert to PCM16
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
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
    // Log all messages for debugging
    console.log('🎤 Realtime message:', message.type, message);
    
    switch (message.type) {
      case 'session.created':
        console.log('🎤 Session created');
        break;

      case 'session.updated':
        console.log('🎤 Session updated');
        break;

      case 'input_audio_buffer.speech_started':
        this.isSpeaking = true;
        // Auto-interrupt AI when user starts speaking for natural conversation
        this.stopAudioPlayback();
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
        // AI response text (streaming) - for audio responses
        this.callbacks?.onTranscript(message.delta, false, false);
        break;

      case 'response.audio_transcript.done':
        // AI response complete
        this.callbacks?.onTranscript(message.transcript, true, false);
        break;

      case 'response.text.delta':
        // AI text response (streaming) - for text-only responses
        this.callbacks?.onTranscript(message.delta, false, false);
        break;

      case 'response.text.done':
        // AI text response complete
        this.callbacks?.onTranscript(message.text, true, false);
        break;

      case 'response.content_part.added':
        // Content part added - could be text or audio
        console.log('🎤 Content part added:', message.part);
        break;

      case 'response.output_item.added':
        // Output item added
        console.log('🎤 Output item added:', message.item);
        break;

      case 'response.done':
        // Response complete - just log, text already handled by audio_transcript.done
        console.log('🎤 Response done:', message.response?.status);
        
        // Check for failed response
        if (message.response?.status === 'failed') {
          const errorDetails = message.response.status_details?.error;
          console.error('🎤 Response failed:', errorDetails);
          this.callbacks?.onError(errorDetails?.message || 'Response failed');
        }
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
   * Play audio chunk from the API
   */
  private async playAudioChunk(base64Audio: string): Promise<void> {
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
  private async playNextChunk(): Promise<void> {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.audioQueue.shift()!;

    // Convert PCM16 to Float32
    const pcm16 = new Int16Array(audioData);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    // Create audio buffer and play
    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.onended = () => {
      this.currentSource = null;
      this.playNextChunk();
    };
    this.currentSource = source;
    source.start();
  }

  /**
   * Send a text message (for typing instead of speaking)
   */
  sendTextMessage(text: string): void {
    if (!this.ws || !this.isConnected) return;

    console.log('🎤 Sending text message:', text);
    
    const createItem = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    };
    console.log('🎤 Sending conversation.item.create:', createItem);
    this.ws.send(JSON.stringify(createItem));

    const createResponse = { 
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    };
    console.log('🎤 Sending response.create:', createResponse);
    this.ws.send(JSON.stringify(createResponse));
  }

  /**
   * Stop audio playback immediately (used when user starts speaking)
   */
  private stopAudioPlayback(): void {
    // Stop current audio playback immediately
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Source may already be stopped
      }
      this.currentSource = null;
    }
    
    // Clear the audio queue
    this.audioQueue = [];
    this.isPlaying = false;
  }

  /**
   * Interrupt the AI's current response
   */
  interrupt(): void {
    if (!this.ws || !this.isConnected) return;

    // Cancel the API response
    this.ws.send(JSON.stringify({ type: 'response.cancel' }));
    
    // Stop audio playback
    this.stopAudioPlayback();
  }

  /**
   * Disconnect from the API
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isConnected = false;
    this.audioQueue = [];
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Check if user is speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  // Utility functions
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const realtimeTutorService = new RealtimeTutorService();
