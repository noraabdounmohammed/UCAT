import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { generateAIResponseStream, QuestionContext } from '../../services/openai';
import { ChatInput } from '../ui/ChatInput';
import { processVideoTags } from '../../utils/videoEmbedder';
import { Lightbulb, Stethoscope, List, AlertTriangle, BookOpen, Mic, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { InworldService, VoiceMessage } from '../../services/inworldService';
import '../../styles/markdown-styles.css';
import './apple-fixed-input.css';
import './whatsapp-reply-styles.css';

// Interface matching the question structure from ApplePracticeSession
interface QuestionData {
  id: string;
  individual_question?: string;
  content?: string;
  question?: string;
  question_stem?: string;
  options: Array<{ text: string; id: string } | string>;
  correct_answer?: string;
  correctAnswer?: string | number;
  worked_solution?: string;
  explanation?: string;
  [key: string]: unknown;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  replyTo?: {
    messageId: string;
    content: string;
    role: 'user' | 'assistant';
  };
  questionData?: QuestionData;
  feedbackData?: {
    isCorrect: boolean;
    selectedAnswer: string;
    correctAnswer: string;
    explanation: string;
  };
}

interface AIHelperProps {
  question: QuestionData;
  correctAnswer: string;
  selectedAnswer: string | null;
  explanation: string;
  integrated?: boolean;
  onMessageSent?: () => void;
  lightMode?: boolean;
  curriculumName?: string;
  conceptTitles?: string[];
}

export function AIHelper({ question, correctAnswer, selectedAnswer, explanation, onMessageSent, lightMode = false, curriculumName, conceptTitles }: AIHelperProps) {
  const questionId = question.id || `q-${Date.now()}`;
  
  const getCurrentSessionId = (): string | null => {
    try {
      const keys = Object.keys(localStorage);
      // Look for the session ID pattern used by ApplePracticeSession (practice-answers-session-*)
      const sessionKey = keys.find(key => key.startsWith('practice-answers-session-'));
      return sessionKey ? sessionKey.replace('practice-answers-', '') : null;
    } catch {
      return null;
    }
  };

  const sessionId = getCurrentSessionId();
  const storageKey = sessionId ? `ai_chat_${sessionId}_${questionId}` : `ai_chat_${questionId}`;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Voice mode states - persist in localStorage
  const [voiceMode, setVoiceModeState] = useState(() => {
    const stored = localStorage.getItem('ai-helper-voice-mode');
    const initialValue = stored === 'true';
    console.log('🎤 Initial voice mode from localStorage:', initialValue, 'stored value:', stored);
    return initialValue;
  });
  
  // Wrapper to persist voice mode changes
  const setVoiceMode = (value: boolean) => {
    console.log('🎤 Setting voice mode to:', value);
    setVoiceModeState(value);
    localStorage.setItem('ai-helper-voice-mode', String(value));
  };
  
  // Debug: Log voiceMode whenever it changes
  useEffect(() => {
    console.log('🎤 Voice mode state changed to:', voiceMode);
  }, [voiceMode]);

  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const inworldServiceRef = useRef<InworldService | null>(null);

  // Load messages from localStorage when storageKey changes (new question)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedMessages = JSON.parse(saved);
        setMessages(parsedMessages);
      } else {
        // Clear messages for new question
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
      setMessages([]);
    }
  }, [storageKey]);


  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving chat messages:', error);
      }
    } else {
      // Remove empty chat histories to keep localStorage clean
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.error('Error removing empty chat:', error);
      }
    }
  }, [messages, storageKey]);

  // Auto-scroll to bottom when new messages arrive (only during active chat)
  useEffect(() => {
    // Only auto-scroll if user is actively chatting (has sent messages)
    if (messages.length > 0 && messages[messages.length - 1]?.role === 'user') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Initialize Inworld voice service when voice mode is enabled
  useEffect(() => {
    if (voiceMode && !inworldServiceRef.current) {
      initializeVoiceService();
    }
    
    return () => {
      // Cleanup on unmount
      if (inworldServiceRef.current) {
        inworldServiceRef.current.disconnect();
        inworldServiceRef.current = null;
      }
    };
  }, [voiceMode]);

  // Initialize voice service
  const initializeVoiceService = async () => {
    console.log('🎤 Initializing voice service...');
    setIsConnecting(true);
    setVoiceError(null);

    try {
      // Get Inworld credentials from environment variables
      const apiKey = import.meta.env.VITE_INWORLD_API_KEY;
      const apiSecret = import.meta.env.VITE_INWORLD_API_SECRET;

      console.log('🔑 Credentials check:', { 
        hasApiKey: !!apiKey, 
        hasApiSecret: !!apiSecret 
      });

      if (!apiKey || !apiSecret) {
        throw new Error('Inworld credentials not configured. Please add VITE_INWORLD_API_KEY and VITE_INWORLD_API_SECRET to your .env file.');
      }

      const service = new InworldService();
      console.log('✅ InworldService instance created');
      
      // Set up callbacks
      service.onMessage((voiceMessage: VoiceMessage) => {
        const chatMessage: ChatMessage = {
          role: voiceMessage.isUser ? 'user' : 'assistant',
          content: voiceMessage.text,
          id: `msg-${voiceMessage.timestamp.getTime()}-${Math.random().toString(36).substr(2, 9)}`
        };
        setMessages(prev => [...prev, chatMessage]);
      });

      service.onConnectionChange((connected) => {
        setIsConnecting(!connected);
        if (!connected) {
          setVoiceError('Disconnected from voice service');
        }
      });

      service.onError((error) => {
        setVoiceError(error);
        console.error('Voice service error:', error);
      });
      
      // Set up speech recognition callbacks
      service.onTranscript((transcript, isFinal) => {
        setCurrentTranscript(transcript);
        if (isFinal && transcript.trim()) {
          // Auto-send the message when speech is finalized
          handleSendMessage(transcript.trim());
          setCurrentTranscript('');
        }
      });
      
      service.onListeningChange((listening) => {
        setIsListening(listening);
      });

      // Initialize TTS service
      await service.initialize({
        apiKey,
        apiSecret
      });

      inworldServiceRef.current = service;
      setIsConnecting(false);
    } catch (error) {
      console.error('Failed to initialize voice service:', error);
      setVoiceError(error instanceof Error ? error.message : 'Failed to initialize voice service');
      setIsConnecting(false);
      setVoiceMode(false); // Disable voice mode on error
    }
  };

  // Toggle voice mode
  const handleToggleVoiceMode = () => {
    if (voiceMode && inworldServiceRef.current) {
      inworldServiceRef.current.disconnect();
      inworldServiceRef.current = null;
    }
    setVoiceMode(!voiceMode);
    setVoiceError(null);
  };

  // Start/stop listening for speech
  const handleMicToggle = () => {
    if (!inworldServiceRef.current) return;

    if (isListening) {
      inworldServiceRef.current.stopListening();
    } else {
      inworldServiceRef.current.startListening();
    }
  };
  
  // Auto-start listening after AI finishes speaking (for real-time convo)
  const handleSpeakingComplete = () => {
    const isVoiceModeActive = localStorage.getItem('ai-helper-voice-mode') === 'true';
    if (isVoiceModeActive && inworldServiceRef.current && !isMuted) {
      // Small delay before starting to listen again
      setTimeout(() => {
        if (inworldServiceRef.current && !inworldServiceRef.current.getIsSpeaking()) {
          inworldServiceRef.current.startListening();
        }
      }, 500);
    }
  };

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Stop any currently playing audio when sending a new message
    if (inworldServiceRef.current) {
      inworldServiceRef.current.stopSpeaking();
    }

    // Voice mode note: We still use the normal DeepSeek flow below
    // The TTS will speak the response after it's generated

    // Standard text mode
    const userMessage: ChatMessage = { 
      role: 'user', 
      content: text,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      replyTo: replyingTo ? {
        messageId: replyingTo.id,
        content: replyingTo.content.length > 100 ? replyingTo.content.substring(0, 100) + '...' : replyingTo.content,
        role: replyingTo.role
      } : undefined
    };
    setMessages(prev => [...prev, userMessage]);
    setReplyingTo(null);
    setIsTyping(true);
    setIsStreaming(true);
    
    // Call the callback to scroll to bottom
    onMessageSent?.();

    // Create placeholder message for streaming
    const placeholderMessage: ChatMessage = { 
      role: 'assistant', 
      content: '',
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setMessages(prev => [...prev, placeholderMessage]);

    try {
      abortControllerRef.current = new AbortController();
      
      const context: QuestionContext = {
        question: question.individual_question || question.question || question.question_stem || '',
        options: (question.options || []).map(opt => typeof opt === 'string' ? opt : opt.text),
        correctAnswer,
        selectedAnswer,
        explanation
      };

      let streamedContent = '';
      
      // Build the full prompt including reply context if replying
      let fullPrompt = text;
      if (replyingTo) {
        fullPrompt = `${text}

[Note: This is a follow-up question to a previous response]`;
      }

      // Start TTS as soon as we have enough content (first ~100 chars)
      let ttsStarted = false;
      const startTTSEarly = async (content: string) => {
        const isVoiceModeActive = localStorage.getItem('ai-helper-voice-mode') === 'true';
        if (ttsStarted || !isVoiceModeActive || !inworldServiceRef.current || isMuted) return;
        
        ttsStarted = true;
        try {
          console.log('🔊 Starting TTS early with:', content.substring(0, 50) + '...');
          await inworldServiceRef.current.speakText(content);
          handleSpeakingComplete();
        } catch (e) {
          console.error('TTS error:', e);
        }
      };

      await generateAIResponseStream(
        fullPrompt, 
        context,
        (token: string) => {
          if (!abortControllerRef.current?.signal.aborted) {
            streamedContent += token;
            
            // Start TTS early once we have enough content (~200 chars)
            if (!ttsStarted && streamedContent.length > 200) {
              startTTSEarly(streamedContent);
            }
            
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.content = streamedContent;
              }
              return newMessages;
            });
          }
        },
        () => {
          // onStart callback - streaming has begun
          setIsTyping(false);
        },
        abortControllerRef.current.signal
      );

      // If TTS hasn't started yet (short response), start it now
      const isVoiceModeActive = localStorage.getItem('ai-helper-voice-mode') === 'true';
      if (isVoiceModeActive && inworldServiceRef.current && !isMuted && streamedContent && !ttsStarted) {
        startTTSEarly(streamedContent);
      }
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message === 'Request aborted') {
          // Request was aborted by user, remove the placeholder message
          setMessages(prev => prev.slice(0, -1));
        } else {
          console.error('Error generating response:', error);
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = 'I apologize, but I encountered an error while processing your question. Please try again.';
            }
            return newMessages;
          });
        }
      }
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [question, correctAnswer, selectedAnswer, explanation, onMessageSent, replyingTo]);

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsTyping(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);



  return (
    <div className={`flex flex-col h-full ${lightMode ? 'bg-stone-50' : 'bg-[#1a1a1a]'}`}>
      {/* Voice Mode Header */}
      <div className={`flex items-center justify-between px-4 md:px-6 py-3 border-b ${
        lightMode ? 'border-black/[0.06]' : 'border-white/[0.08]'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleVoiceMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all active:scale-95 ${
              voiceMode
                ? lightMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                : lightMode
                  ? 'bg-black/[0.04] text-stone-600 hover:bg-black/[0.08]'
                  : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.08]'
            }`}
            title={voiceMode ? 'Switch to text mode' : 'Switch to voice mode'}
          >
            {voiceMode ? (
              <>
                <Mic className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">Voice</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">Text</span>
              </>
            )}
          </button>
          
          {voiceMode && (
            <div className="flex items-center gap-2">
              {isConnecting && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span className={`text-xs ${lightMode ? 'text-stone-500' : 'text-white/50'}`}>
                    Connecting...
                  </span>
                </div>
              )}
              {voiceError && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs text-red-500 max-w-[100px] truncate">
                    {voiceError}
                  </span>
                </div>
              )}
              {!isConnecting && !voiceError && inworldServiceRef.current && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className={`text-xs hidden sm:inline ${lightMode ? 'text-green-600' : 'text-green-400'}`}>
                    Connected
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {voiceMode && inworldServiceRef.current && (
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-xl transition-all active:scale-95 ${
              isMuted
                ? 'bg-red-500/10 text-red-500'
                : lightMode
                  ? 'hover:bg-black/[0.04] text-stone-600'
                  : 'hover:bg-white/[0.05] text-white/60'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 py-4 md:py-8 px-4 md:px-6">
        {messages.length === 0 && (
          <div className="text-center py-8 md:py-12 px-4 md:px-6">
            <div className={`h-[1px] w-12 mx-auto mb-6 md:mb-8 ${lightMode ? 'bg-black/10' : 'bg-white/10'}`}></div>
            <h4 className={`text-lg md:text-xl font-light mb-2 ${lightMode ? 'text-stone-900' : 'text-white/90'}`} style={{ fontFamily: "'Manrope', sans-serif" }}>
              How can I help?
            </h4>
            <p className={`text-xs md:text-sm mb-6 md:mb-8 font-light ${lightMode ? 'text-stone-500' : 'text-white/50'}`} style={{ fontFamily: "'Manrope', sans-serif" }}>
              Choose a prompt or ask your own question
            </p>
            <div className="flex flex-col gap-2 md:gap-3 max-w-md mx-auto">
              <button
                onClick={() => handleSendMessage("Teach me this from scratch")}
                className={`group px-4 md:px-5 py-3 md:py-4 rounded-2xl text-xs md:text-sm transition-all text-left font-light flex items-center gap-2 md:gap-3 ${
                  lightMode 
                    ? 'bg-black/[0.03] border border-black/[0.08] text-stone-700 hover:bg-black/[0.06] hover:border-black/[0.12] hover:text-stone-900'
                    : 'bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white/90'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                <BookOpen className={`h-4 w-4 transition-colors ${lightMode ? 'text-stone-500 group-hover:text-stone-700' : 'text-white/50 group-hover:text-white/70'}`} />
                <span>Teach me this from scratch</span>
              </button>
              <button
                onClick={() => handleSendMessage("Explain this step by step")}
                className={`group px-4 md:px-5 py-3 md:py-4 rounded-2xl text-xs md:text-sm transition-all text-left font-light flex items-center gap-2 md:gap-3 ${
                  lightMode 
                    ? 'bg-black/[0.03] border border-black/[0.08] text-stone-700 hover:bg-black/[0.06] hover:border-black/[0.12] hover:text-stone-900'
                    : 'bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white/90'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                <List className={`h-4 w-4 transition-colors ${lightMode ? 'text-stone-500 group-hover:text-stone-700' : 'text-white/50 group-hover:text-white/70'}`} />
                <span>Explain step by step</span>
              </button>
              <button
                onClick={() => handleSendMessage("Give me a clinical example of this")}
                className={`group px-4 md:px-5 py-3 md:py-4 rounded-2xl text-xs md:text-sm transition-all text-left font-light flex items-center gap-2 md:gap-3 ${
                  lightMode 
                    ? 'bg-black/[0.03] border border-black/[0.08] text-stone-700 hover:bg-black/[0.06] hover:border-black/[0.12] hover:text-stone-900'
                    : 'bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white/90'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                <Stethoscope className={`h-4 w-4 transition-colors ${lightMode ? 'text-stone-500 group-hover:text-stone-700' : 'text-white/50 group-hover:text-white/70'}`} />
                <span>Give me a clinical example</span>
              </button>
              <button
                onClick={() => handleSendMessage("Explain like I'm 10")}
                className={`group px-4 md:px-5 py-3 md:py-4 rounded-2xl text-xs md:text-sm transition-all text-left font-light flex items-center gap-2 md:gap-3 ${
                  lightMode 
                    ? 'bg-black/[0.03] border border-black/[0.08] text-stone-700 hover:bg-black/[0.06] hover:border-black/[0.12] hover:text-stone-900'
                    : 'bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white/90'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                <Lightbulb className={`h-4 w-4 transition-colors ${lightMode ? 'text-stone-500 group-hover:text-stone-700' : 'text-white/50 group-hover:text-white/70'}`} />
                <span>Explain like I'm 10</span>
              </button>
              <button
                onClick={() => handleSendMessage("What are common mistakes to avoid?")}
                className={`group px-4 md:px-5 py-3 md:py-4 rounded-2xl text-xs md:text-sm transition-all text-left font-light flex items-center gap-2 md:gap-3 ${
                  lightMode 
                    ? 'bg-black/[0.03] border border-black/[0.08] text-stone-700 hover:bg-black/[0.06] hover:border-black/[0.12] hover:text-stone-900'
                    : 'bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white/90'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                <AlertTriangle className={`h-4 w-4 transition-colors ${lightMode ? 'text-stone-500 group-hover:text-stone-700' : 'text-white/50 group-hover:text-white/70'}`} />
                <span>Common mistakes to avoid</span>
              </button>
            </div>
          </div>
        )}

        <div className="px-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={message.id || index} className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${message.role === 'user' ? 'max-w-[85%]' : 'max-w-[95%]'}`}>
                  {/* Reply context */}
                  {message.replyTo && (
                    <div
                      className={`mb-3 px-4 py-3 rounded-xl border-l-2 text-sm ${
                        message.role === 'user'
                          ? lightMode
                            ? 'bg-white border-stone-200'
                            : 'bg-white/[0.05] border-white/20'
                          : lightMode
                            ? 'bg-stone-50 border-stone-200'
                            : 'bg-white/[0.02] border-white/10'
                      }`}
                      style={{ fontFamily: "'Manrope', sans-serif" }}
                    >
                      <div
                        className={`text-xs font-light mb-1.5 uppercase tracking-wider ${
                          lightMode ? 'text-stone-500' : 'text-white/60'
                        }`}
                      >
                        {message.replyTo.role === 'assistant' ? 'AI Assistant' : 'You'}
                      </div>
                      <div
                        className={`text-sm leading-relaxed font-light ${
                          lightMode ? 'text-stone-700' : 'text-white/70'
                        }`}
                      >
                        {message.replyTo.content.replace(/✓/g, '').replace(/✅/g, '').trim() || 'Message content'}
                      </div>
                    </div>
                  )}
                  {/* Message bubble */}
                  <div 
                    className={`group relative px-5 py-4 rounded-2xl ${
                      message.role === 'user'
                        ? lightMode
                          ? 'bg-white border border-black/[0.06] text-stone-900'
                          : 'bg-white/[0.08] border border-white/[0.12] text-white'
                        : lightMode
                          ? 'bg-white border border-black/[0.04] text-stone-900'
                          : 'bg-white/[0.03] border border-white/[0.08] text-white'
                    }`}
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    {message.role === 'assistant' && message.content === '' && isStreaming ? (
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    ) : (
                      <div className="text-[13px] sm:text-[15px]">
                        <ReactMarkdown 
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            p: ({ children }) => (
                              <p
                                className={`mb-2 last:mb-0 leading-[1.4] ${
                                  lightMode ? 'text-stone-800' : 'text-white'
                                }`}
                              >
                                {children}
                              </p>
                            ),
                            h1: ({ children }) => (
                              <h1
                                className={`font-bold mb-2 ${lightMode ? 'text-stone-900' : 'text-white'}`}
                              >
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2
                                className={`font-semibold mb-2 mt-3 first:mt-0 ${
                                  lightMode ? 'text-stone-900' : 'text-white'
                                }`}
                              >
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3
                                className={`font-medium mb-2 mt-2 first:mt-0 ${
                                  lightMode ? 'text-stone-900' : 'text-white'
                                }`}
                              >
                                {children}
                              </h3>
                            ),
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => (
                              <li
                                className={`leading-[1.4] ${
                                  lightMode ? 'text-stone-800' : 'text-white'
                                }`}
                              >
                                {children}
                              </li>
                            ),
                            strong: ({ children }) => (
                              <strong
                                className={`font-semibold ${
                                  lightMode ? 'text-stone-900' : 'text-white'
                                }`}
                              >
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => (
                              <em
                                className={`italic ${
                                  lightMode ? 'text-stone-700' : 'text-white/90'
                                }`}
                              >
                                {children}
                              </em>
                            ),
                            code: ({ children }) => (
                              <code
                                className={`px-1 py-0.5 rounded text-xs font-mono ${
                                  lightMode
                                    ? 'bg-stone-100 text-stone-900'
                                    : 'bg-white/20 text-white'
                                }`}
                              >
                                {children}
                              </code>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote
                                className={`border-l-2 pl-3 py-1 italic my-2 ${
                                  lightMode
                                    ? 'border-stone-300 text-stone-700'
                                    : 'border-white/30 text-white/80'
                                }`}
                              >
                                {children}
                              </blockquote>
                            )
                          }}
                        >
                          {processVideoTags(message.content)}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  
                  {/* Reply and Copy buttons */}
                  {message.role === 'assistant' && message.content && !isStreaming && (
                    <div className="flex justify-start mt-3 gap-2">
                      <button
                        onClick={() => {
                          setReplyingTo(message);
                          setTimeout(() => {
                            const textarea = document.querySelector('textarea[aria-label="Chat message"]') as HTMLTextAreaElement;
                            if (textarea) {
                              textarea.focus();
                            }
                          }, 100);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-all font-light ${
                          lightMode
                            ? 'text-stone-500 hover:bg-black/[0.04] hover:text-stone-800'
                            : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                        }`}
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                        title="Reply to this message"
                      >
                        ↩ Reply
                      </button>
                      <button
                        onClick={() => {
                          const button = document.activeElement as HTMLButtonElement;
                          const originalText = button?.textContent;
                          
                          // Simple fallback method that works everywhere
                          const textArea = document.createElement('textarea');
                          textArea.value = message.content;
                          textArea.style.position = 'absolute';
                          textArea.style.left = '-9999px';
                          textArea.style.opacity = '0';
                          document.body.appendChild(textArea);
                          
                          try {
                            textArea.select();
                            textArea.setSelectionRange(0, 99999); // For mobile devices
                            
                            const successful = document.execCommand('copy');
                            document.body.removeChild(textArea);
                            
                            if (button) {
                              if (successful) {
                                button.textContent = '✓ Copied!';
                                button.classList.add('text-emerald-400');
                                button.classList.remove('text-white/60');
                              } else {
                                button.textContent = '✗ Failed';
                                button.classList.add('text-rose-400');
                                button.classList.remove('text-white/60');
                              }
                              
                              setTimeout(() => {
                                button.textContent = originalText;
                                button.classList.remove('text-emerald-400', 'text-rose-400');
                                button.classList.add('text-white/60');
                              }, 1500);
                            }
                          } catch (err) {
                            document.body.removeChild(textArea);
                            console.error('Copy failed:', err);
                            if (button) {
                              button.textContent = '✗ Failed';
                              button.classList.add('text-rose-400');
                              button.classList.remove('text-white/60');
                              setTimeout(() => {
                                button.textContent = originalText;
                                button.classList.remove('text-rose-400');
                                button.classList.add('text-white/60');
                              }, 1500);
                            }
                          }
                        }}
                        className="text-xs text-white/50 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] hover:text-white/80 transition-all font-light"
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                        title="Copy message"
                      >
                        ⧉ Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}


          </div>
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0">
        {voiceMode && inworldServiceRef.current && (
          <div className={`flex flex-col gap-3 px-4 py-4 border-t ${
            lightMode ? 'border-black/[0.06] bg-gradient-to-b from-stone-50 to-stone-100' : 'border-white/[0.08] bg-gradient-to-b from-[#1a1a1a] to-[#141414]'
          }`}>
            {/* Transcript display */}
            {currentTranscript && (
              <div className={`text-base px-4 py-3 rounded-xl ${
                lightMode ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-blue-900/30 text-blue-300 border border-blue-800/30'
              }`}>
                <span className="opacity-60">"</span>{currentTranscript}<span className="opacity-60">"</span>
              </div>
            )}
            
            {/* Large centered mic button for mobile */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleMicToggle}
                className={`flex items-center justify-center w-16 h-16 sm:w-14 sm:h-14 rounded-full transition-all transform active:scale-95 shadow-lg ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-red-500/30'
                    : lightMode
                      ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20 hover:shadow-blue-500/30'
                      : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20 hover:shadow-blue-500/30'
                }`}
                title={isListening ? 'Tap to stop' : 'Tap to speak'}
              >
                <Mic className={`${isListening ? 'h-7 w-7' : 'h-6 w-6'}`} />
              </button>
              
              <span className={`text-sm font-medium ${
                isListening 
                  ? (lightMode ? 'text-red-600' : 'text-red-400')
                  : (lightMode ? 'text-stone-600' : 'text-white/60')
              }`}>
                {isListening ? 'Listening... tap to stop' : 'Tap to speak'}
              </span>
              
              {/* Visual audio indicator when listening */}
              {isListening && (
                <div className="flex items-center gap-1">
                  <div className={`w-1 h-3 rounded-full animate-pulse ${lightMode ? 'bg-red-400' : 'bg-red-500'}`} style={{animationDelay: '0ms'}}></div>
                  <div className={`w-1 h-5 rounded-full animate-pulse ${lightMode ? 'bg-red-400' : 'bg-red-500'}`} style={{animationDelay: '150ms'}}></div>
                  <div className={`w-1 h-4 rounded-full animate-pulse ${lightMode ? 'bg-red-400' : 'bg-red-500'}`} style={{animationDelay: '300ms'}}></div>
                  <div className={`w-1 h-6 rounded-full animate-pulse ${lightMode ? 'bg-red-400' : 'bg-red-500'}`} style={{animationDelay: '450ms'}}></div>
                  <div className={`w-1 h-3 rounded-full animate-pulse ${lightMode ? 'bg-red-400' : 'bg-red-500'}`} style={{animationDelay: '600ms'}}></div>
                </div>
              )}
            </div>
            
            {/* Divider with "or" text */}
            <div className="flex items-center gap-3">
              <div className={`flex-1 h-px ${lightMode ? 'bg-stone-200' : 'bg-white/10'}`}></div>
              <span className={`text-xs ${lightMode ? 'text-stone-400' : 'text-white/30'}`}>or type below</span>
              <div className={`flex-1 h-px ${lightMode ? 'bg-stone-200' : 'bg-white/10'}`}></div>
            </div>
          </div>
        )}
        <ChatInput
          onSend={handleSendMessage}
          disabled={false}
          placeholder={
            voiceMode 
              ? "Type or use voice button above..." 
              : replyingTo 
                ? `Reply to ${replyingTo.role === 'assistant' ? 'AI Assistant' : 'your message'}...` 
                : "Ask about this question..."
          }
          maxRows={4}
          onStop={handleStopGeneration}
          isStreaming={isStreaming}
          contained={true}
          lightMode={lightMode}
          replyPreview={replyingTo ? (
            <div
              className={`p-3 rounded-t-lg border-b ${
                lightMode
                  ? 'bg-stone-50 border-stone-200'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        lightMode ? 'bg-stone-400' : 'bg-white/40'
                      }`}
                    ></div>
                    <span
                      className={`text-xs font-medium ${
                        lightMode ? 'text-stone-700' : 'text-white/70'
                      }`}
                    >
                      {replyingTo.role === 'assistant' ? 'AI Assistant' : 'You'}
                    </span>
                  </div>
                  <div
                    className={`text-sm line-clamp-2 leading-relaxed ${
                      lightMode ? 'text-stone-700' : 'text-white/80'
                    }`}
                  >
                    {replyingTo.content.length > 120 
                      ? replyingTo.content.substring(0, 120) + '...' 
                      : replyingTo.content
                    }
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className={`flex-shrink-0 p-1 rounded-full transition-colors group ${
                    lightMode ? 'hover:bg-black/[0.05]' : 'hover:bg-white/10'
                  }`}
                  title="Cancel reply"
                >
                  <svg
                    className={`w-4 h-4 ${
                      lightMode
                        ? 'text-stone-500 group-hover:text-stone-800'
                        : 'text-white/60 group-hover:text-white/90'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ) : undefined}
        />
      </div>
    </div>
  );
}
