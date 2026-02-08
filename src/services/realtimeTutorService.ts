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
      return `You are a friendly and knowledgeable medical tutor. Help students learn and understand medical concepts through conversation.`;
    }

    const { curriculumName, concepts, totalConcepts, masteredCount, developingCount, unseenCount } = this.tutorContext;
    
    // Get weak areas (developing or unseen concepts)
    const weakConcepts = concepts
      .filter(c => c.mastery_level === 'unseen' || c.mastery_level === 'introduced' || c.mastery_level === 'developing')
      .slice(0, 10)
      .map(c => c.title);
    
    // Get strong areas (mastered concepts)
    const strongConcepts = concepts
      .filter(c => c.mastery_level === 'mastered' || c.mastery_level === 'competent')
      .slice(0, 5)
      .map(c => c.title);

    return `You are a friendly, encouraging, and knowledgeable medical tutor helping a student study for ${curriculumName}.

## Student's Progress Overview:
- Total concepts: ${totalConcepts}
- Mastered: ${masteredCount} (${Math.round(masteredCount/totalConcepts*100)}%)
- Developing: ${developingCount}
- Not yet seen: ${unseenCount}

## Areas Needing Work:
${weakConcepts.length > 0 ? weakConcepts.map(c => `- ${c}`).join('\n') : '- Great job! No weak areas identified.'}

## Strong Areas:
${strongConcepts.length > 0 ? strongConcepts.map(c => `- ${c}`).join('\n') : '- Keep practicing to build mastery!'}

## Your Role:
1. Be conversational and supportive - this is a voice conversation
2. Keep responses concise (2-3 sentences max) for natural dialogue
3. Ask follow-up questions to test understanding
4. Focus on their weak areas but celebrate their strengths
5. Use clinical scenarios and real-world examples
6. If they seem stuck, provide hints rather than full answers
7. Adapt your teaching style based on their responses

Start by greeting them warmly and asking what they'd like to focus on today.`;
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
        voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        temperature: 0.8,
        max_response_output_tokens: 500
      }
    };

    this.ws.send(JSON.stringify(sessionConfig));
    
    // Start audio streaming
    this.startAudioCapture();
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
        // Response complete - extract content if present
        console.log('🎤 Response done:', message.response);
        
        // Check for failed response
        if (message.response?.status === 'failed') {
          const errorDetails = message.response.status_details?.error;
          console.error('🎤 Response failed:', errorDetails);
          this.callbacks?.onError(errorDetails?.message || 'Response failed');
          break;
        }
        
        if (message.response?.output) {
          for (const item of message.response.output) {
            if (item.content) {
              for (const content of item.content) {
                if (content.type === 'text' && content.text) {
                  console.log('🎤 Extracted text from response.done:', content.text);
                  this.callbacks?.onTranscript(content.text, true, false);
                }
                if (content.type === 'audio' && content.transcript) {
                  console.log('🎤 Extracted transcript from response.done:', content.transcript);
                  this.callbacks?.onTranscript(content.transcript, true, false);
                }
              }
            }
          }
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
    source.onended = () => this.playNextChunk();
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
   * Interrupt the AI's current response
   */
  interrupt(): void {
    if (!this.ws || !this.isConnected) return;

    this.ws.send(JSON.stringify({ type: 'response.cancel' }));
    this.audioQueue = [];
    this.isPlaying = false;
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
