export interface InworldConfig {
  apiKey: string;
  apiSecret: string;
}

export interface VoiceMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string;
}

export class InworldService {
  private isConnected = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private authToken: string = '';
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeaking = false;
  private speechRecognition: any = null;
  private isListening = false;
  
  // Callbacks
  private onMessageCallback?: (message: VoiceMessage) => void;
  private onAudioCallback?: (audioBlob: Blob) => void;
  private onConnectionChangeCallback?: (connected: boolean) => void;
  private onErrorCallback?: (error: string) => void;
  private onTranscriptCallback?: (transcript: string, isFinal: boolean) => void;
  private onListeningChangeCallback?: (isListening: boolean) => void;

  constructor() {
    // Initialize speech recognition if available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'en-US';
      
      this.speechRecognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        const isFinal = result.isFinal;
        console.log('🎤 Speech recognized:', transcript, 'Final:', isFinal);
        this.onTranscriptCallback?.(transcript, isFinal);
      };
      
      this.speechRecognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        this.isListening = false;
        this.onListeningChangeCallback?.(false);
      };
      
      this.speechRecognition.onerror = (event: any) => {
        console.error('🎤 Speech recognition error:', event.error);
        this.isListening = false;
        this.onListeningChangeCallback?.(false);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          this.onErrorCallback?.(`Speech recognition error: ${event.error}`);
        }
      };
    }
  }
  
  /**
   * Sanitize text for TTS - remove markdown formatting
   */
  private sanitizeForTTS(text: string): string {
    return text
      // Remove bold/italic markers
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold** -> bold
      .replace(/\*([^*]+)\*/g, '$1')       // *italic* -> italic
      .replace(/__([^_]+)__/g, '$1')       // __bold__ -> bold
      .replace(/_([^_]+)_/g, '$1')         // _italic_ -> italic
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')         // # Header -> Header
      // Remove bullet points and list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')     // - item -> item
      .replace(/^[\s]*\d+\.\s+/gm, '')     // 1. item -> item
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')      // Remove code blocks entirely
      .replace(/`([^`]+)`/g, '$1')         // `code` -> code
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) -> text
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, '')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  
  /**
   * Stop any currently playing audio
   */
  stopSpeaking(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isSpeaking = false;
  }
  
  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Initialize Inworld TTS service
   */
  async initialize(config: InworldConfig, _curriculumContext?: string): Promise<void> {
    try {
      // Create auth token from API key and secret
      this.authToken = btoa(`${config.apiKey}:${config.apiSecret}`);
      
      // Test the connection with a simple request
      const testResponse = await fetch('https://api.inworld.ai/tts/v1/voice:stream', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Connection test',
          voice_id: 'Alex',
          audio_config: {
            audio_encoding: 'MP3',
            speaking_rate: 1
          },
          temperature: 1.1,
          model_id: 'inworld-tts-1.5-max'
        }),
      });

      if (!testResponse.ok) {
        throw new Error(`Failed to connect to Inworld TTS: ${testResponse.status}`);
      }

      this.isConnected = true;
      this.onConnectionChangeCallback?.(true);
      console.log('✅ Inworld TTS connected successfully');
    } catch (error) {
      console.error('Failed to initialize Inworld TTS:', error);
      this.onErrorCallback?.(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Convert text to speech using Inworld TTS API
   */
  private async textToSpeech(text: string): Promise<Blob> {
    const response = await fetch('https://api.inworld.ai/tts/v1/voice:stream', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice_id: 'Olivia',
        audio_config: {
          audio_encoding: 'MP3',
          speaking_rate: 1
        },
        temperature: 1.1,
        model_id: 'inworld-tts-1.5-max'
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.status}`);
    }

    // Inworld streams NDJSON (newline-delimited JSON)
    const responseText = await response.text();
    console.log('📦 TTS Response (first 200 chars):', responseText.substring(0, 200));
    
    // Split by newlines and parse each JSON chunk
    const lines = responseText.trim().split('\n');
    let audioBase64 = '';
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const chunk = JSON.parse(line);
        // Check for audioContent in result object
        if (chunk.result?.audioContent) {
          audioBase64 += chunk.result.audioContent;
        } else if (chunk.audioContent) {
          audioBase64 += chunk.audioContent;
        } else if (chunk.audio_content) {
          audioBase64 += chunk.audio_content;
        }
      } catch (e) {
        console.warn('Failed to parse JSON chunk:', line.substring(0, 100));
      }
    }
    
    if (!audioBase64) {
      throw new Error('No audio content in response');
    }
    
    console.log('🎵 Total base64 audio length:', audioBase64.length);
    
    // Decode base64 to binary
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return new Blob([bytes], { type: 'audio/mpeg' });
  }

  /**
   * Speak text using TTS
   */
  async speakText(text: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to Inworld TTS');
    }

    try {
      // Sanitize text to remove markdown formatting
      const cleanText = this.sanitizeForTTS(text);
      console.log('🔊 Sanitized text for TTS:', cleanText.substring(0, 100) + '...');
      
      const audioBlob = await this.textToSpeech(cleanText);
      await this.playAudioBlob(audioBlob);
      this.onAudioCallback?.(audioBlob);
    } catch (error) {
      console.error('Failed to speak text:', error);
      throw error;
    }
  }
  
  /**
   * Start listening for speech input
   */
  startListening(): void {
    if (!this.speechRecognition) {
      this.onErrorCallback?.('Speech recognition not supported in this browser');
      return;
    }
    
    if (this.isListening) {
      console.log('🎤 Already listening');
      return;
    }
    
    // Stop any playing audio first
    this.stopSpeaking();
    
    try {
      this.speechRecognition.start();
      this.isListening = true;
      this.onListeningChangeCallback?.(true);
      console.log('🎤 Started listening...');
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.onErrorCallback?.('Failed to start speech recognition');
    }
  }
  
  /**
   * Stop listening for speech input
   */
  stopListening(): void {
    if (this.speechRecognition && this.isListening) {
      this.speechRecognition.stop();
      this.isListening = false;
      this.onListeningChangeCallback?.(false);
      console.log('🎤 Stopped listening');
    }
  }
  
  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }
  
  /**
   * Set transcript callback
   */
  onTranscript(callback: (transcript: string, isFinal: boolean) => void): void {
    this.onTranscriptCallback = callback;
  }
  
  /**
   * Set listening change callback
   */
  onListeningChange(callback: (isListening: boolean) => void): void {
    this.onListeningChangeCallback = callback;
  }

  /**
   * Play audio blob using HTML5 Audio
   */
  private async playAudioBlob(audioBlob: Blob): Promise<void> {
    try {
      console.log('🔊 Playing audio blob, size:', audioBlob.size, 'type:', audioBlob.type);
      
      // Stop any currently playing audio first
      this.stopSpeaking();
      
      // Create object URL from blob
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio element
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;
      this.isSpeaking = true;
      
      // Add event listeners for debugging
      audio.onloadeddata = () => console.log('✅ Audio loaded successfully');
      audio.onplay = () => console.log('▶️ Audio playback started');
      audio.onerror = (e) => console.error('❌ Audio playback error:', e);
      audio.onended = () => {
        console.log('✅ Audio playback completed');
        URL.revokeObjectURL(audioUrl); // Clean up
        this.currentAudio = null;
        this.isSpeaking = false;
      };
      
      await audio.play();
      console.log('🎵 Audio play() called');
    } catch (error) {
      this.isSpeaking = false;
      this.currentAudio = null;
      console.error('Failed to play audio:', error);
      throw error;
    }
  }

  /**
   * Send text message (for compatibility - just triggers callback)
   */
  async sendTextMessage(text: string): Promise<void> {
    // In TTS-only mode, we just notify that user sent a message
    // The actual AI response comes from your existing DeepSeek integration
    const userMessage: VoiceMessage = {
      text,
      isUser: true,
      timestamp: new Date()
    };
    this.onMessageCallback?.(userMessage);
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.sendAudioMessage(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      console.log('🎤 Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.onErrorCallback?.('Failed to access microphone. Please check permissions.');
      throw error;
    }
  }

  /**
   * Stop recording audio
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      console.log('🎤 Recording stopped');
    }
  }

  /**
   * Send audio message (transcribe using Web Speech API)
   */
  private async sendAudioMessage(_audioBlob: Blob): Promise<void> {
    // For now, we'll use browser's speech recognition
    // The transcribed text will be sent through sendTextMessage
    console.log('Audio recorded, transcription would happen here');
  }


  /**
   * Update curriculum context (no-op for TTS-only mode)
   */
  async updateContext(curriculumName: string, conceptTitles: string[]): Promise<void> {
    // Context is handled by your existing DeepSeek integration
    console.log('Context updated:', curriculumName, conceptTitles);
  }

  /**
   * Set callbacks
   */
  onMessage(callback: (message: VoiceMessage) => void): void {
    this.onMessageCallback = callback;
  }

  onAudio(callback: (audioBlob: Blob) => void): void {
    this.onAudioCallback = callback;
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.onConnectionChangeCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Disconnect from Inworld TTS
   */
  disconnect(): void {
    this.stopSpeaking(); // Stop any playing audio
    this.isConnected = false;
    this.authToken = '';
    this.onConnectionChangeCallback?.(false);
  }

  /**
   * Check if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
