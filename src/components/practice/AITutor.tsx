import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  Volume2, 
  VolumeX,
  MessageSquare,
  X,
  Send,
  Loader2
} from 'lucide-react';
import { RealtimeTutorService, TutorContext, ConceptProgress } from '../../services/realtimeTutorService';
import { HybridTutorService } from '../../services/hybridTutorService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AITutorProps {
  isOpen: boolean;
  onClose: () => void;
  concepts: ConceptProgress[];
  curriculumName: string;
  lightMode?: boolean;
  provider?: 'openai' | 'inworld'; // Allow switching providers
}

export const AITutor: React.FC<AITutorProps> = ({
  isOpen,
  onClose,
  concepts,
  curriculumName,
  provider = 'openai' // Default to OpenAI, can switch to 'inworld'
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  
  // Use either OpenAI Realtime or Hybrid (Inworld TTS + Browser STT) service
  const tutorServiceRef = useRef<RealtimeTutorService | HybridTutorService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate progress stats
  const totalConcepts = concepts.length;
  const masteredCount = concepts.filter(c => c.mastery_level === 'mastered' || c.mastery_level === 'competent').length;
  const developingCount = concepts.filter(c => c.mastery_level === 'developing' || c.mastery_level === 'introduced').length;
  const unseenCount = concepts.filter(c => c.mastery_level === 'unseen').length;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript, aiTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tutorServiceRef.current) {
        tutorServiceRef.current.disconnect();
      }
    };
  }, []);

  // Update context when concepts change
  useEffect(() => {
    if (tutorServiceRef.current && isConnected) {
      const context: TutorContext = {
        curriculumName,
        concepts: concepts.map(c => ({
          concept_id: c.concept_id,
          title: c.title,
          mastery_level: c.mastery_level,
          times_practiced: c.times_practiced,
          custom_filters: c.custom_filters,
          filter_categories: (c as any).filter_categories
        })),
        totalConcepts,
        masteredCount,
        developingCount,
        unseenCount
      };
      tutorServiceRef.current.setContext(context);
    }
  }, [concepts, curriculumName, isConnected, totalConcepts, masteredCount, developingCount, unseenCount]);

  const handleConnect = useCallback(async () => {
    // Check which provider to use - prefer Inworld/Hybrid if configured, fallback to OpenAI
    const inworldApiKey = import.meta.env.VITE_INWORLD_API_KEY;
    const inworldApiSecret = import.meta.env.VITE_INWORLD_API_SECRET;
    const openaiApiKey = import.meta.env.VITE_OPENAI_REALTIME_API_KEY;
    
    // Use hybrid (Inworld TTS + Browser STT) if Inworld credentials exist
    const useHybrid = provider === 'inworld' || (inworldApiKey && inworldApiSecret);
    
    if (!useHybrid && !openaiApiKey) {
      setError('OpenAI Realtime API key not configured. Add VITE_OPENAI_REALTIME_API_KEY to your .env file.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Create the appropriate service
      // Hybrid uses Inworld TTS + Browser STT + OpenAI Chat (cheaper than Realtime)
      const service = useHybrid 
        ? new HybridTutorService() 
        : new RealtimeTutorService();
      
      // Set context before connecting
      const context: TutorContext = {
        curriculumName,
        concepts: concepts.map(c => ({
          concept_id: c.concept_id,
          title: c.title,
          mastery_level: c.mastery_level,
          times_practiced: c.times_practiced,
          custom_filters: c.custom_filters,
          filter_categories: (c as any).filter_categories
        })),
        totalConcepts,
        masteredCount,
        developingCount,
        unseenCount
      };
      service.setContext(context);

      // Define callbacks
      const callbacks = {
        onConnected: () => {
          setIsConnected(true);
          setIsConnecting(false);
        },
        onDisconnected: () => {
          setIsConnected(false);
          setIsConnecting(false);
        },
        onSpeechStarted: () => {
          setIsSpeaking(true);
        },
        onSpeechEnded: () => {
          setIsSpeaking(false);
        },
        onTranscript: (text: string, isFinal: boolean, isUser: boolean) => {
          if (isUser) {
            if (isFinal) {
              setMessages(prev => [...prev, {
                id: `msg-${Date.now()}`,
                role: 'user' as const,
                content: text,
                timestamp: new Date()
              }]);
              setCurrentTranscript('');
            } else {
              setCurrentTranscript(text);
            }
          } else {
            if (isFinal) {
              setMessages(prev => [...prev, {
                id: `msg-${Date.now()}`,
                role: 'assistant' as const,
                content: text,
                timestamp: new Date()
              }]);
              setAiTranscript('');
            } else {
              setAiTranscript(prev => prev + text);
            }
          }
        },
        onError: (err: string) => {
          setError(err);
          setIsConnecting(false);
        },
        onAudioLevel: (level: number) => {
          setAudioLevel(level);
        }
      };

      // Connect with appropriate method
      if (useHybrid) {
        await (service as HybridTutorService).connect(callbacks);
      } else {
        await (service as RealtimeTutorService).connect(openaiApiKey!, callbacks);
      }

      tutorServiceRef.current = service;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnecting(false);
    }
  }, [concepts, curriculumName, totalConcepts, masteredCount, developingCount, unseenCount, provider]);

  const handleDisconnect = useCallback(() => {
    if (tutorServiceRef.current) {
      tutorServiceRef.current.disconnect();
      tutorServiceRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
  }, []);

  const handleSendText = useCallback(() => {
    if (!textInput.trim() || !tutorServiceRef.current) return;
    
    tutorServiceRef.current.sendTextMessage(textInput.trim());
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textInput.trim(),
      timestamp: new Date()
    }]);
    setTextInput('');
  }, [textInput]);

  const handleInterrupt = useCallback(() => {
    if (tutorServiceRef.current) {
      tutorServiceRef.current.interrupt();
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with subtle texture */}
      <div 
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal - Full screen on mobile, centered modal on desktop */}
      <div className="relative w-full h-full md:max-w-xl md:h-[85vh] md:mx-4 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-[#FAFAF9]">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" /%3E%3C/filter%3E%3Crect width=\"100\" height=\"100\" filter=\"url(%23noise)\" /%3E%3C/svg%3E")' }}></div>
        
        {/* Header - Minimal */}
        <div className="relative px-4 pt-4 pb-2">
          <div className="flex items-center justify-end gap-3">
            {isConnected && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs text-emerald-600 font-medium" style={{ fontFamily: "'Manrope', sans-serif" }}>Live</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress Stats - Responsive layout */}
        <div className="px-4 md:px-6 pb-4">
          <div className="flex items-center justify-between md:justify-start md:gap-6 text-xs" style={{ fontFamily: "'Manrope', sans-serif" }}>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-stone-500"><span className="hidden sm:inline">Mastered </span><span className="text-stone-700 font-medium">{masteredCount}</span></span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <span className="text-stone-500"><span className="hidden sm:inline">Developing </span><span className="text-stone-700 font-medium">{developingCount}</span></span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-stone-300"></div>
              <span className="text-stone-500"><span className="hidden sm:inline">Unseen </span><span className="text-stone-700 font-medium">{unseenCount}</span></span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 md:mx-6 h-[1px] bg-stone-200"></div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-3 md:space-y-4">
          {!isConnected && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mb-6">
                <Mic className="h-8 w-8 text-stone-400" />
              </div>
              <h3 className="text-lg font-medium text-stone-900 mb-2" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                Start a Conversation
              </h3>
              <p className="text-sm text-stone-500 max-w-xs leading-relaxed" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Your AI tutor knows your progress and will help you focus on concepts that need work.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-800'
              }`}>
                <p className="text-sm leading-relaxed" style={{ fontFamily: "'Manrope', sans-serif" }}>{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Live transcripts */}
          {currentTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-stone-100 border border-stone-200">
                <p className="text-sm text-stone-600 italic" style={{ fontFamily: "'Manrope', sans-serif" }}>{currentTranscript}...</p>
              </div>
            </div>
          )}

          {aiTranscript && (
            <div className="flex justify-start">
              <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-stone-50 border border-stone-100">
                <p className="text-sm text-stone-700" style={{ fontFamily: "'Manrope', sans-serif" }}>{aiTranscript}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
            <p className="text-sm text-red-600" style={{ fontFamily: "'Manrope', sans-serif" }}>{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="px-4 md:px-6 py-4 md:py-6 border-t border-stone-200 bg-white/80 backdrop-blur-sm safe-area-inset-bottom">
          {/* Text input (optional) */}
          {showTextInput && isConnected && (
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-5">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                placeholder="Type a message..."
                className="flex-1 px-3 md:px-4 py-3 rounded-xl text-sm bg-stone-100 text-stone-900 placeholder-stone-400 border-0 focus:ring-2 focus:ring-stone-300 transition-all"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              />
              <button
                onClick={handleSendText}
                disabled={!textInput.trim()}
                className="p-3 rounded-xl bg-stone-900 text-white hover:bg-stone-800 active:scale-95 disabled:opacity-40 transition-all"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 md:gap-4">
            {/* Mute button */}
            {isConnected && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 md:p-3.5 rounded-2xl transition-all active:scale-95 ${
                  isMuted
                    ? 'bg-red-50 text-red-500 border border-red-100'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            )}

            {/* Main call button */}
            <button
              onClick={isConnected ? handleDisconnect : handleConnect}
              disabled={isConnecting}
              className={`relative p-6 md:p-7 rounded-full transition-all transform active:scale-95 ${
                isConnected
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-xl'
                  : isConnecting
                    ? 'bg-stone-400 text-white'
                    : 'bg-stone-900 hover:bg-stone-800 text-white shadow-xl'
              }`}
            >
              {isConnecting ? (
                <Loader2 className="h-6 w-6 md:h-7 md:w-7 animate-spin" />
              ) : isConnected ? (
                <PhoneOff className="h-6 w-6 md:h-7 md:w-7" />
              ) : (
                <Mic className="h-6 w-6 md:h-7 md:w-7" />
              )}
              
              {/* Audio level indicator */}
              {isConnected && isSpeaking && (
                <div 
                  className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping opacity-50"
                  style={{ transform: `scale(${1 + audioLevel * 2})` }}
                />
              )}
            </button>

            {/* Text mode toggle */}
            {isConnected && (
              <button
                onClick={() => setShowTextInput(!showTextInput)}
                className={`p-3 md:p-3.5 rounded-2xl transition-all active:scale-95 ${
                  showTextInput
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            )}

            {/* Interrupt button */}
            {isConnected && aiTranscript && (
              <button
                onClick={handleInterrupt}
                className="p-3 md:p-3.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 active:scale-95 transition-all"
                title="Interrupt"
              >
                <MicOff className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Status text */}
          <p className="text-center text-xs text-stone-400 mt-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
            {isConnecting
              ? 'Connecting...'
              : isConnected
                ? isSpeaking
                  ? 'Listening...'
                  : 'Tap to end conversation'
                : 'Tap to start talking'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AITutor;
