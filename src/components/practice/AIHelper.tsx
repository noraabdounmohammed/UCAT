import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Mic } from 'lucide-react';
import { cn as cnUtil } from '../../lib/utils';
import ReactMarkdown from 'react-markdown';
import { generateFallbackResponse } from '../../services/openai';
import '../../styles/markdown-styles.css';
import './apple-fixed-input.css';

// Minimal typings for Web Speech API to avoid 'any'
interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface SpeechRecognitionConstructor {
  new(): ISpeechRecognition;
}
interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

// Utility function to conditionally join classNames
const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Removed tidyAssistantMarkdown function as it was causing text duplication issues with streaming

// Interface matching the question structure from ApplePracticeSession
interface QuestionData {
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

interface AIHelperProps {
  question: QuestionData;
  selectedAnswer: string | null;
  correctAnswer: string;
  explanation: string;
  integrated?: boolean; // New prop to indicate if the helper is integrated in the explanation box
}

interface QuestionContext {
  question: string;
  options: string[];
  correctAnswer: string;
  selectedAnswer: string | null;
  explanation: string;
}

export function AIHelper({ question, selectedAnswer, correctAnswer, explanation, integrated = false }: AIHelperProps) {
  const [isExpanded] = useState(true); // Always expanded in simplified version
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // New state for typing indicator
  const [hasInitialized, setHasInitialized] = useState(false);
  const useFixedInput = true; // Enable fixed input by default (changed from state to constant)
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Voice mode state
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [ttsEnabled] = useState(false);
  const [autoSendOnPause] = useState(true);
  const [language] = useState<string>(() =>
    typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'
  );
  const [silenceMs] = useState(1000);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenTextRef = useRef<string>('');
  // Long-press (push-to-talk)
  const longPressTimerRef = useRef<number | null>(null);
  const [isHoldRecording, setIsHoldRecording] = useState(false);
  const longPressMs = 300;
  const suppressAutoSendRef = useRef(false);
  // Track hold state in a ref to avoid stale closures in recognition callbacks
  const isHoldRecordingRef = useRef(false);
  useEffect(() => { isHoldRecordingRef.current = isHoldRecording; }, [isHoldRecording]);
  // Aria-live status
  const [ariaStatus, setAriaStatus] = useState('');

  // We're using fixed input by default for all devices
  // Mobile detection has been removed as we're using the same UI for all devices

  // Initialize without welcome message
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  // No automatic scrolling effect for messages - we'll only scroll when explicitly sending a message

  // Feature detection for Web Speech API
  const speechSupported = typeof window !== 'undefined' && (
    ('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window)
  );

  // Keep a stable ref to send handler to avoid useCallback dependency churn
  const sendMessageRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    // assign on mount; updated handler will be captured on next renders if needed
    sendMessageRef.current = () => handleSendMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: cancel any ongoing TTS
  const cancelTTS = useCallback(() => {
    if (typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {
        // ignore cancel errors
      }
    }
  }, []);

  // Speak assistant replies when finished loading
  useEffect(() => {
    if (!ttsEnabled || isLoading) return;
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return;
    const text = last.content?.trim() || '';
    if (!text || text === lastSpokenTextRef.current) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = language || 'en-US';
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
        lastSpokenTextRef.current = text;
      } catch {
        // ignore speech errors
      }
    }
  }, [isLoading, messages, ttsEnabled, language]);

  // Stop voice recognition (defined before startVoice to avoid use-before-declare)
  const stopVoice = useCallback(() => {
    try { recognitionRef.current?.stop?.(); } catch {
      // ignore stop errors
    }
    recognitionRef.current = null;
    setIsRecording(false);
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  // Start voice recognition
  const startVoice = useCallback(() => {
    if (!speechSupported || isRecording) return;
    // Barge-in: stop TTS
    cancelTTS();
    const ctor = ((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      || (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition) as unknown as SpeechRecognitionConstructor | undefined;
    if (!ctor) {
      setAriaStatus('Speech recognition not supported in this browser');
      return;
    }
    const rec = new ctor();
    recognitionRef.current = rec;
    rec.continuous = true; // keep listening while holding
    rec.interimResults = true;
    rec.lang = language || 'en-US';
    setInterimTranscript('');
    setIsRecording(true);
    setAriaStatus('Recording started');

    const clearSilenceTimer = () => { if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; } };
    const armSilenceTimer = () => {
      clearSilenceTimer();
      if (!autoSendOnPause) return;
      silenceTimerRef.current = setTimeout(() => {
        // On silence, stop and auto-send current text if any
        if (!suppressAutoSendRef.current) {
          stopVoice();
          const text = (interimTranscript || inputValue).trim();
          if (text) {
            setInputValue(text);
            if (sendMessageRef.current) {
              sendMessageRef.current();
            }
          }
        }
      }, silenceMs);
    };

    rec.onresult = (e: ISpeechRecognitionEvent) => {
      let interim = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0]?.transcript || '';
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      if (interim) {
        setInterimTranscript(interim);
        setInputValue(interim);
        armSilenceTimer();
      }
      if (finalText) {
        setInterimTranscript('');
        setInputValue(finalText.trim());
        if (autoSendOnPause && !suppressAutoSendRef.current) {
          clearSilenceTimer();
          stopVoice();
          if (sendMessageRef.current) {
            sendMessageRef.current();
          }
        }
      }
    };

    rec.onerror = (e: unknown) => {
      setIsRecording(false);
      recognitionRef.current = null;
      // Surface error for debugging
      const msg = String(e ?? 'unknown error');
      setAriaStatus(`Speech error: ${msg}`);
      if (isHoldRecordingRef.current) {
        // Avoid tight loop; restart shortly
        setTimeout(() => {
          try { startVoice(); } catch { /* ignore */ }
        }, 150);
      }
    };
    rec.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      // If the user is still holding, restart recognition to keep capturing
      if (isHoldRecordingRef.current) {
        // Avoid tight loop; restart shortly
        setTimeout(() => {
          try { startVoice(); } catch { /* ignore */ }
        }, 150);
      }
    };

    try {
      rec.start();
    } catch (err) {
      setIsRecording(false);
      recognitionRef.current = null;
      setAriaStatus(`Failed to start recognition: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [speechSupported, isRecording, language, autoSendOnPause, silenceMs, interimTranscript, inputValue, cancelTTS, stopVoice]);

  // Long-press handlers
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleMicPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!speechSupported) return;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore pointer capture errors
    }
    clearLongPressTimer();
    // Immediately start recognition to meet browser gesture requirements
    suppressAutoSendRef.current = true; // don't auto-send while holding
    if (!isRecording) startVoice();
    setAriaStatus('Listening…');
    // Only show/mark as a valid hold after threshold
    longPressTimerRef.current = window.setTimeout(() => {
      setIsHoldRecording(true);
      setAriaStatus('Hold to talk active');
    }, longPressMs);
  }, [speechSupported, clearLongPressTimer, isRecording, startVoice]);

  const handleMicPointerUp = useCallback(() => {
    const wasHold = isHoldRecording;
    clearLongPressTimer();
    if (wasHold) {
      setIsHoldRecording(false);
      suppressAutoSendRef.current = false;
      if (isRecording) {
        stopVoice();
        setAriaStatus('Recording stopped');
      }
      const text = (interimTranscript || inputValue).trim();
      if (text && sendMessageRef.current) {
        sendMessageRef.current();
      }
    } else {
      // Not a valid hold: stop and discard any interim text
      suppressAutoSendRef.current = false;
      if (isRecording) {
        stopVoice();
        setAriaStatus('Recording canceled');
      }
      // Clear interim text that may have been inserted during the short press
      setInterimTranscript('');
      // Do not modify inputValue; user may have typed something
    }
  }, [isHoldRecording, clearLongPressTimer, isRecording, stopVoice, interimTranscript, inputValue]);

  const handleMicPointerCancel = useCallback(() => {
    clearLongPressTimer();
    if (isHoldRecording) {
      setIsHoldRecording(false);
      suppressAutoSendRef.current = false;
      if (isRecording) {
        stopVoice();
        setAriaStatus('Recording stopped');
      }
    }
  }, [clearLongPressTimer, isHoldRecording, isRecording, stopVoice]);

  // Auto-scroll input to end when text changes (for long voice transcriptions)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.scrollLeft = inputRef.current.scrollWidth;
    }
  }, [inputValue]);

  // Input handler - removed debounce as it was causing text to change unexpectedly
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  // Function to handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Add user message to chat
    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputValue('');
    setIsLoading(true);
    
    // Add an empty assistant message that will be filled as tokens arrive
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    
    // Scroll the entire page to the bottom when sending a message
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);

    try {
      // Extract options from the question
      const options = question.options.map((option) => {
        if (typeof option === 'string') {
          return option;
        } else {
          return option.text;
        }
      });
      
      // Get the question text from the appropriate field
      const questionText = question.question || question.question_stem || question.individual_question || '';
      
      // Create context for the AI
      const questionContext: QuestionContext = {
        question: questionText,
        options: options,
        correctAnswer: correctAnswer,
        selectedAnswer: selectedAnswer,
        explanation: explanation
      };

      // Check if we have an API key
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      console.log('API Key check:', { 
        hasKey: !!apiKey, 
        isDefault: apiKey === 'your-openai-api-key-goes-here',
        keyLength: apiKey ? apiKey.length : 0 
      });
      

      if (apiKey && apiKey !== 'your-openai-api-key-goes-here') {
        // Real DeepSeek API with typing simulation (to avoid streaming corruption)
        console.log('Using DeepSeek API (typing simulation)');

        try {
          setIsTyping(true); // Show typing indicator
          
          // Get complete response first, then show it immediately
          const { generateAIResponse } = await import('../../services/openai');
          const fullResponse = await generateAIResponse(userMessage, questionContext);
          
          setIsTyping(false); // Hide typing indicator
          
          // Add the complete response immediately (no typing simulation to avoid issues)
          setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.error('Error generating AI response:', error);
            
            // Update the last message with an error
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage.role === 'assistant') {
                lastMessage.content = 'Sorry, I encountered an error. Please try again.';
              }
              return newMessages;
            });
          }
        }
      } else {
        // Fallback implementation (non-streaming)
        console.log('Using fallback response generator');
        let response = generateFallbackResponse(userMessage, questionContext);
        response = "[USING FALLBACK] " + response;
        // Update the last assistant message instead of adding a new one
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = response;
          } else {
            newMessages.push({ role: 'assistant', content: response });
          }
          return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Show messages directly without container */}
      {messages.length > 0 && (
        <div ref={chatContainerRef} className="space-y-3">
          {messages
            .filter(message => message.content.trim()) // Filter out empty messages
            .map((message, index) => (
            <div 
              key={index} 
              className={cn(
                "p-4 rounded-xl max-w-[85%]",
                message.role === "user" 
                  ? "bg-[#007AFF] text-white ml-auto" 
                  : "bg-[#F2F2F7] text-[#1D1D1F]"
              )}
              style={{
                fontSize: '17px',
                lineHeight: '1.7',
                letterSpacing: '-0.01em',
                fontWeight: '400'
              }}
            >
              <div className="markdown-content">
                <ReactMarkdown
                  components={{
                    p: ({children}) => <p style={{ margin: '0 0 12px 0', fontSize: '17px', lineHeight: '1.7', letterSpacing: '-0.01em' }}>{children}</p>,
                    strong: ({children}) => <strong style={{ fontWeight: '600', color: message.role === 'user' ? 'white' : '#1D1D1F' }}>{children}</strong>,
                    em: ({children}) => <em style={{ fontStyle: 'italic', color: message.role === 'user' ? 'rgba(255,255,255,0.9)' : '#3A3A3C' }}>{children}</em>,
                    ul: ({children}) => <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '17px', lineHeight: '1.7' }}>{children}</ul>,
                    ol: ({children}) => <ol style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '17px', lineHeight: '1.7' }}>{children}</ol>,
                    li: ({children}) => <li style={{ margin: '4px 0', fontSize: '17px', lineHeight: '1.7' }}>{children}</li>,
                    code: ({children}) => <code style={{ 
                      backgroundColor: message.role === 'user' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      fontSize: '16px',
                      fontFamily: 'SF Mono, Monaco, monospace'
                    }}>{children}</code>,
                    h1: ({children}) => <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '16px 0 8px 0', lineHeight: '1.4' }}>{children}</h1>,
                    h2: ({children}) => <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '14px 0 6px 0', lineHeight: '1.4' }}>{children}</h2>,
                    h3: ({children}) => <h3 style={{ fontSize: '17px', fontWeight: '600', margin: '12px 0 4px 0', lineHeight: '1.4' }}>{children}</h3>
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="p-3 rounded-xl max-w-[85%] bg-[#F2F2F7] text-[#1D1D1F]">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-[#86868B] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-[#86868B] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-[#86868B] animate-bounce" style={{ animationDelay: '600ms' }}></div>
              </div>
            </div>
          )}
        </div>
      )}
      

      
      {/* Input area for interaction */}
      <div className="mt-4">
        <div className="chat-input-pill">
          <div className="pill-icon-left" aria-hidden>
            <MessageSquare className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask a follow-up question..."
            className="pill-input"
            disabled={isLoading}
          />
          <button
            type="button"
            className={cn(
              'pill-icon',
              isRecording && 'recording',
              isHoldRecording && 'holding',
              (isRecording || isHoldRecording) && 'animate-pulse'
            )}
            aria-label={isHoldRecording ? 'Recording - Release to send' : 'Voice'}
            aria-pressed={isRecording}
            title={speechSupported ? (isRecording ? 'Recording… Release to send' : 'Hold to talk') : 'Voice not supported'}
            onPointerDown={handleMicPointerDown}
            onPointerUp={handleMicPointerUp}
            onPointerLeave={handleMicPointerCancel}
            onPointerCancel={handleMicPointerCancel}
            disabled={!speechSupported}
            style={{
              backgroundColor: isHoldRecording ? '#ff4444' : undefined,
              color: isHoldRecording ? 'white' : undefined
            }}
          >
            <Mic className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="pill-send"
            aria-label="Send"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );  
}
