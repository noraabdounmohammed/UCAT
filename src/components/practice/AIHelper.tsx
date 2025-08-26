import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateFallbackResponse } from '../../services/openai';
import { Send, Mic, Square } from 'lucide-react';
import '../../styles/markdown-styles.css';
import './apple-fixed-input.css';

// Minimal typings for Web Speech API to avoid 'any'
interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
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

// Removed tidyAssistantMarkdown function as it was causing text duplication issues with streaming

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
  integrated?: boolean; // New prop to indicate if the helper is integrated in the explanation box
}

interface QuestionContext {
  question: string;
  options: string[];
  correctAnswer: string;
  selectedAnswer: string | null;
  explanation: string;
}

export function AIHelper({ question, correctAnswer, selectedAnswer, explanation }: AIHelperProps) {
  const [messages, setMessages] = useState<Array<ChatMessage>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // New state for typing indicator
  const [isStreaming, setIsStreaming] = useState(false); // Track if currently streaming
  const [hasInitialized, setHasInitialized] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // State for next question interactions
  const [nextQuestionAnswers, setNextQuestionAnswers] = useState<Record<string, string>>({});
  const [nextQuestionFeedback, setNextQuestionFeedback] = useState<Record<string, { correct: string; isAnswered: boolean }>>({});
  const [lastAnsweredQuestion, setLastAnsweredQuestion] = useState<{
    question: string;
    options: string[];
    selectedAnswer: string;
    correctAnswer: string;
    explanation: string;
    isCorrect: boolean;
  } | null>(null);
  // Voice mode state
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [autoSendOnPause] = useState(true);
  const [language] = useState<string>(() =>
    typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'
  );
  const [silenceMs] = useState(1000);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressAutoSendRef = useRef(false);
  // Mobile keyboard handling

  // We're using fixed input by default for all devices
  // Mobile detection has been removed as we're using the same UI for all devices

  // Initialize without welcome message
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
    }
  }, [hasInitialized]);


  // Effect to handle receiving next question data and display it in chat
  useEffect(() => {
    const handleNextQuestionReceived = (event: CustomEvent) => {
      console.log('AIHelper received next question event:', event.detail);
      const questionData = event.detail;
      if (questionData) {
        console.log('Processing next question data:', questionData);
        
        
        // Add a simple message indicating the next question is loaded
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'NEXT_QUESTION_COMPONENT',
          questionData: questionData
        }]);
        
        // Scroll to the new question in chat
        setTimeout(() => {
          // Find the last question element in the chat
          const questionElements = document.querySelectorAll('[data-question-id]');
          const lastQuestion = questionElements[questionElements.length - 1];
          
          if (lastQuestion) {
            lastQuestion.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          } else {
            // Fallback: scroll to bottom of chat container
            if (chatContainerRef.current) {
              const chatBottom = chatContainerRef.current.scrollHeight;
              window.scrollTo({
                top: chatBottom - window.innerHeight + 200,
                behavior: 'smooth'
              });
            }
          }
        }, 500);
      } else {
        console.log('No question data received or null data');
        // Add message indicating no more questions
        setMessages(prev => [...prev, { role: 'assistant', content: 'No more questions available in the current session.' }]);
      }
    };

    window.addEventListener('nextQuestionDataReceived', handleNextQuestionReceived as EventListener);

    return () => {
      window.removeEventListener('nextQuestionDataReceived', handleNextQuestionReceived as EventListener);
    };
  }, []);


  // Auto-scroll to bottom when new messages arrive (except for next questions)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isNextQuestion = lastMessage?.questionData;
    
    if (chatContainerRef.current && !isNextQuestion) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // No automatic scrolling effect for messages - we'll only scroll when explicitly sending a message

  // Feature detection for Web Speech API with mobile support
  const speechSupported = typeof window !== 'undefined' && (
    ('SpeechRecognition' in window) || 
    ('webkitSpeechRecognition' in window) ||
    // Additional check for mobile browsers
    (navigator.userAgent.includes('Mobile') && 'webkitSpeechRecognition' in window)
  );

  // Keep a stable ref to send handler to avoid useCallback dependency churn
  const sendMessageRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    // assign on mount; updated handler will be captured on next renders if needed
    sendMessageRef.current = () => handleSendMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Stop voice recognition (defined before startVoice to avoid use-before-declare)
  const stopVoice = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {
      // ignore stop errors
    }
    recognitionRef.current = null;
    setIsRecording(false);
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  // Start voice recognition
  const startVoice = useCallback(() => {
    if (!speechSupported || isRecording) return;
    
    // Enhanced constructor detection for mobile
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || 
                             (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported on this device');
      return;
    }
    const rec = new (SpeechRecognition as unknown as new () => ISpeechRecognition)();
    recognitionRef.current = rec;
    rec.continuous = true; // keep listening while holding
    rec.interimResults = true;
    rec.lang = language || 'en-US';
    setInterimTranscript('');
    setIsRecording(true);

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

    rec.onerror = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };
    rec.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      clearSilenceTimer();
    };

    try {
      rec.start();
    } catch (err) {
      setIsRecording(false);
      recognitionRef.current = null;
      console.error('Failed to start recognition:', err);
    }
  }, [speechSupported, isRecording, language, autoSendOnPause, silenceMs, interimTranscript, inputValue, stopVoice]);



  // Auto-scroll input to end when text changes (for long voice transcriptions)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.scrollLeft = inputRef.current.scrollWidth;
    }
  }, [inputValue]);

  // Input handler - removed debounce as it was causing text to change unexpectedly
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, []);


  // Function to handle sending a message
  const handleSendMessage = useCallback(async () => {
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
    
    // Check if user is asking for next question
    if (userMessage.toLowerCase().includes('next question') || userMessage.toLowerCase().includes('show me the next question')) {
      // Dispatch event to get next question data directly without intermediate message
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('requestNextQuestionData'));
      }, 500);
      
      setIsLoading(false);
      return;
    }
    
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
        // Real DeepSeek API with streaming
        console.log('Using DeepSeek API with streaming');

        try {
          setIsLoading(true);
          setIsTyping(true); // Show typing indicator immediately
          setIsStreaming(true); // Mark as streaming
          
          // Import OpenAI client
          const OpenAI = (await import('openai')).default;
          const client = new OpenAI({
            apiKey: import.meta.env.VITE_OPENAI_API_KEY,
            baseURL: 'https://api.deepseek.com',
            dangerouslyAllowBrowser: true
          });

          // Use the most recently answered question if available, otherwise fall back to initial question
          const contextToUse = lastAnsweredQuestion || questionContext;
          
          const systemPrompt = `You are a direct medical education assistant. Provide concise, educational responses without fluff or pleasantries. Get straight to the medical content.

Question: ${contextToUse.question}
Options: ${contextToUse.options.join(', ')}
${contextToUse.selectedAnswer ? `Selected Answer: ${contextToUse.selectedAnswer}` : ''}
${contextToUse.correctAnswer ? `Correct Answer: ${contextToUse.correctAnswer}` : ''}
${contextToUse.explanation ? `Explanation: ${contextToUse.explanation}` : ''}

Be direct and educational. No "Of course!" or "That's an excellent question" - just provide the medical information.`;

          // Create streaming completion
          const stream = await client.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            stream: true,
            max_tokens: 4000,
            temperature: 0.7
          });

          setIsTyping(false); // Hide typing indicator once streaming starts
          let accumulatedResponse = '';

          // Process streaming response
          for await (const chunk of stream) {
            if (abortControllerRef.current?.signal.aborted) {
              break;
            }

            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              accumulatedResponse += content;
              
              // Update the last assistant message with accumulated content
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                  lastMessage.content = accumulatedResponse;
                } else {
                  newMessages.push({ role: 'assistant', content: accumulatedResponse });
                }
                return newMessages;
              });
            }
          }
          
          setIsStreaming(false); // Mark streaming as complete
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.error('Error sending message:', error);
            
            setIsTyping(false);
            setIsStreaming(false);
            // Update the last message with an error
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.content = 'Sorry, I encountered an error. Please try again.';
              } else {
                newMessages.push({ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' });
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
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [inputValue, question, correctAnswer, selectedAnswer, explanation, lastAnsweredQuestion]);

  // Function to stop the current streaming response
  const handleStopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsTyping(false);
      setIsStreaming(false);
    }
  };

  // Handle key down events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Display value combines input and interim transcript
  const displayValue = inputValue + (interimTranscript && inputValue !== interimTranscript ? interimTranscript : '');

  return (
    <>
      <div className="space-y-4 pb-20">
        {/* Quick Actions - only show when no messages */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button 
              onClick={() => setInputValue("Explain this question in detail")}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors"
            >
              📖 Explain question
            </button>
            <button 
              onClick={() => setInputValue("Why is my answer wrong?")}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 transition-colors"
            >
              ❓ Why wrong?
            </button>
            <button 
              onClick={() => setInputValue("Give me a similar practice question")}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200 transition-colors"
            >
              🔄 Similar question
            </button>
            <button 
              onClick={() => setInputValue("Show me the next question from the database")}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors"
            >
              ➡️ Next question
            </button>
          </div>
        )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="space-y-4 mb-4">
          {messages
            .filter(message => message.content.trim())
            .map((message, index) => (
            <div key={index}>
              {message.content === 'FEEDBACK_COMPONENT' && message.feedbackData ? (
                // Render feedback as styled component matching main question feedback
                <div className={`apple-feedback rounded-2xl p-6 mb-6 ${
                  message.feedbackData.isCorrect 
                    ? 'bg-[rgba(52,199,89,0.08)] border border-[#34C759]' 
                    : 'bg-[rgba(255,59,48,0.08)] border border-[#FF3B30]'
                }`}>
                  <div className="flex items-center gap-3 font-semibold text-[18px]">
                    {message.feedbackData.isCorrect ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-[#34C759]">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22,4 12,14.01 9,11.01"></polyline>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-[#FF3B30]">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="m15 9-6 6"></path>
                        <path d="m9 9 6 6"></path>
                      </svg>
                    )}
                    <span className="text-[#1D1D1F]">
                      {message.feedbackData.isCorrect ? 'Correct Answer' : 'Incorrect Answer'}
                    </span>
                  </div>
                </div>
              ) : message.content === 'NEXT_QUESTION_COMPONENT' && message.questionData ? (
                // Render next question as a proper question card
                <div 
                  className="apple-question-card opacity-100 apple-fade-in" 
                  data-question-id={message.questionData.id}
                  style={{
                  transition: 'opacity 0.15s ease-in-out',
                  willChange: 'opacity'
                }}>
                  <div className="apple-question-content">
                    <div style={{
                      backgroundColor: 'rgb(255, 255, 255)',
                      borderRadius: '20px',
                      padding: '32px',
                      marginBottom: '28px',
                      boxShadow: 'rgba(0, 0, 0, 0.06) 0px 4px 16px',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        width: '100%',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 400,
                          color: 'rgb(44, 44, 46)',
                          margin: '0px 0px 20px',
                          lineHeight: 1.7,
                          width: '100%',
                          textAlign: 'left',
                          hyphens: 'auto',
                          letterSpacing: '-0.01em'
                        }}>
                          {message.questionData.question || message.questionData.question_stem || message.questionData.individual_question || ''}
                        </div>
                      </div>
                    </div>
                    <div className="apple-answer-options apple-slide-up" style={{
                      width: '100%',
                      alignItems: 'flex-start',
                      marginLeft: '0px'
                    }}>
                      {message.questionData?.options.map((option, optionIndex) => {
                        const optionText = typeof option === 'string' ? option : option.text;
                        const optionLetter = String.fromCharCode(65 + optionIndex);
                        const questionId = message.questionData?.id || '';
                        const isSelected = nextQuestionAnswers[questionId] === optionLetter;
                        const feedback = nextQuestionFeedback[questionId];
                        const isAnswered = feedback?.isAnswered || false;
                        const correctAnswer = feedback?.correct || message.questionData?.correct_answer || message.questionData?.correctAnswer;
                        
                        // Determine styling based on answer state
                        let buttonClass = 'apple-answer-option rounded-xl border p-4 mb-1.5 flex items-center transition-all ';
                        if (isAnswered) {
                          if (optionLetter === correctAnswer) {
                            buttonClass += 'correct border-[#34C759] bg-[rgba(52,199,89,0.05)]';
                          } else if (isSelected) {
                            buttonClass += 'incorrect border-[#FF3B30] bg-[rgba(255,59,48,0.05)]';
                          } else {
                            buttonClass += 'border-[#E5E5EA] bg-white';
                          }
                        } else if (isSelected) {
                          buttonClass += 'border-[#007AFF] bg-[rgba(0,122,255,0.05)]';
                        } else {
                          buttonClass += 'border-[#E5E5EA] bg-white hover:border-[#8E8E93] hover:bg-[#F5F5F7]';
                        }
                        
                        return (
                          <button
                            key={optionIndex}
                            disabled={isAnswered}
                            onClick={() => {
                              if (isAnswered) return;
                              
                              const correctAns = message.questionData?.correct_answer || message.questionData?.correctAnswer;
                              const isCorrect = optionLetter === correctAns;
                              
                              setNextQuestionAnswers(prev => ({
                                ...prev,
                                [questionId]: optionLetter
                              }));
                              
                              setNextQuestionFeedback(prev => ({
                                ...prev,
                                [questionId]: { correct: correctAns as string, isAnswered: true }
                              }));
                              
                              // Update last answered question context
                              setLastAnsweredQuestion({
                                question: message.questionData?.question || message.questionData?.question_stem || message.questionData?.individual_question || '',
                                options: (message.questionData?.options || []).map(opt => typeof opt === 'string' ? opt : opt.text),
                                selectedAnswer: optionLetter,
                                correctAnswer: correctAns as string,
                                explanation: message.questionData?.explanation || message.questionData?.worked_solution || '',
                                isCorrect
                              });
                              
                              // Show explanation or feedback after selection
                              setTimeout(() => {
                                const explanation = message.questionData?.explanation || message.questionData?.worked_solution || '';
                                
                                setMessages(prevMessages => [...prevMessages, {
                                  role: 'assistant',
                                  content: 'FEEDBACK_COMPONENT',
                                  feedbackData: {
                                    isCorrect,
                                    selectedAnswer: optionLetter,
                                    correctAnswer: String(correctAns || ''),
                                    explanation
                                  }
                                }]);
                                
                                // Automatically add explanation as a separate chat message after feedback
                                if (explanation) {
                                  setTimeout(() => {
                                    setMessages(prevMessages => [...prevMessages, {
                                      role: 'assistant',
                                      content: `## Explanation\n\n${explanation}`
                                    }]);
                                  }, 500);
                                }
                              }, 300);
                            }}
                            className={buttonClass}
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#F5F5F7] mr-3 font-medium text-[14px] text-[#1D1D1F]">
                              {optionLetter}
                            </div>
                            <div className="flex-1 text-[18px] text-[#1D1D1F] font-normal leading-relaxed">
                              {optionText}
                            </div>
                            {isAnswered && optionLetter === correctAnswer && (
                              <div className="ml-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-[#34C759]">
                                  <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                                  <path d="m9 11 3 3L22 4"></path>
                                </svg>
                              </div>
                            )}
                            {isAnswered && isSelected && optionLetter !== correctAnswer && (
                              <div className="ml-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-[#FF3B30]">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <path d="m15 9-6 6"></path>
                                  <path d="m9 9 6 6"></path>
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-2xl ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white ml-auto px-4 py-3 max-w-[85%]' 
                      : 'w-full p-6 rounded-2xl bg-white text-gray-900 shadow-sm border border-gray-100'
                  }`}>
                    <ReactMarkdown 
                      components={{
                        p: ({ children }) => <p className={`mb-4 last:mb-0 leading-relaxed ${message.role === 'user' ? 'text-white' : 'text-gray-700'}`}>{children}</p>,
                        h1: ({ children }) => <h1 className={`text-2xl font-bold mb-4 border-b pb-2 ${message.role === 'user' ? 'text-white border-white/30' : 'text-gray-900 border-gray-200'}`}>{children}</h1>,
                        h2: ({ children }) => <h2 className={`text-xl font-semibold mb-3 mt-6 first:mt-0 ${message.role === 'user' ? 'text-white' : 'text-gray-800'}`}>{children}</h2>,
                        h3: ({ children }) => <h3 className={`text-lg font-medium mb-3 mt-5 first:mt-0 ${message.role === 'user' ? 'text-white' : 'text-gray-700'}`}>{children}</h3>,
                        ul: ({ children }) => <ul className="list-none pl-0 mb-4 space-y-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                        li: ({ children }) => <li className={`leading-relaxed flex items-start ${message.role === 'user' ? 'text-white' : 'text-gray-700'}`}><span className={`inline-block w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0 ${message.role === 'user' ? 'bg-white' : 'bg-blue-500'}`}></span><span className="flex-1">{children}</span></li>,
                        strong: ({ children }) => <strong className={`font-semibold px-1 rounded ${message.role === 'user' ? 'text-white bg-white/20' : 'text-gray-900 bg-yellow-50'}`}>{children}</strong>,
                        em: ({ children }) => <em className={`italic font-medium ${message.role === 'user' ? 'text-white' : 'text-blue-600'}`}>{children}</em>,
                        code: ({ children }) => <code className={`px-2 py-1 rounded text-sm font-mono border ${message.role === 'user' ? 'bg-white/20 text-white border-white/30' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>{children}</code>,
                        blockquote: ({ children }) => <blockquote className={`border-l-4 pl-4 py-2 rounded-r italic my-4 ${message.role === 'user' ? 'border-white/50 bg-white/10 text-white' : 'border-blue-400 bg-blue-50 text-gray-700'}`}>{children}</blockquote>
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                🤖
              </div>
              <div className="w-full p-8 rounded-2xl bg-white text-gray-900 shadow-sm border border-gray-100">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      </div>
      
      {/* Sticky Input Area - Always show when feedback is active */}
      {(
        <div className="fixed bottom-0 left-0 right-0 z-50" style={{ 
          background: '#F5F5F7',
          borderTop: '0.5px solid rgba(0, 0, 0, 0.06)'
        }}>
          <div className="max-w-4xl mx-auto p-2">
            <div className="border border-gray-200 rounded-xl p-2" style={{ background: '#F5F5F7' }}>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={displayValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a follow-up question..."
                  className="w-full px-3 py-2 bg-transparent text-gray-900 placeholder-gray-500 resize-none overflow-hidden focus:outline-none"
                  rows={1}
                  disabled={isLoading}
                  style={{
                    minHeight: '16px',
                    maxHeight: '80px',
                    lineHeight: '16px'
                  }}
                />
                
                <div className="flex gap-1">
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={isRecording ? stopVoice : startVoice}
                      className={`p-2 rounded-lg transition-colors ${
                        isRecording 
                          ? 'bg-red-500 text-white' 
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                      disabled={isLoading}
                    >
                      {isRecording ? <Square size={18} /> : <Mic size={18} />}
                    </button>
                  )}
                  
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={handleStopResponse}
                      className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                      title="Stop response"
                    >
                      <Square size={18} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      className={`p-2 rounded-lg transition-colors ${
                        isLoading || (!inputValue.trim() && !interimTranscript.trim())
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                      disabled={isLoading || (!inputValue.trim() && !interimTranscript.trim())}
                    >
                      <Send size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );  
}
