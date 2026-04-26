import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { generateAIResponseStream, QuestionContext } from '../../services/openai';
import { ChatInput } from '../ui/ChatInput';
import { processVideoTags } from '../../utils/videoEmbedder';
import { Lightbulb, Stethoscope, List, AlertTriangle, BookOpen, MessageSquare } from 'lucide-react';
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


  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

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

      await generateAIResponseStream(
        fullPrompt, 
        context,
        (token: string) => {
          if (!abortControllerRef.current?.signal.aborted) {
            streamedContent += token;
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
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 md:px-6 py-3 border-b ${
        lightMode ? 'border-black/[0.06]' : 'border-white/[0.08]'
      }`}>
        <MessageSquare className={`h-4 w-4 ${lightMode ? 'text-stone-500' : 'text-white/50'}`} />
        <span className={`text-sm font-medium ${lightMode ? 'text-stone-600' : 'text-white/60'}`}>AI Helper</span>
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
        <ChatInput
          onSend={handleSendMessage}
          disabled={false}
          placeholder={
            replyingTo
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
