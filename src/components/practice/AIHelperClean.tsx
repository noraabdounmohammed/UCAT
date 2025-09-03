import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { generateAIResponseStream, QuestionContext } from '../../services/openai';
import { ChatInput } from '../ui/ChatInput';
import { processVideoTags } from '../../utils/videoEmbedder';
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
}

export function AIHelper({ question, correctAnswer, selectedAnswer, explanation, onMessageSent }: AIHelperProps) {
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
        // For replies, just send the user's question without including the previous message content
        // This prevents the AI from echoing back previous responses
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
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 py-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🐱</div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              How can I help?
            </h4>
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <button
                onClick={() => handleSendMessage("Explain this question step by step")}
                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                📚 Explain this question step by step
              </button>
              <button
                onClick={() => handleSendMessage("What's the correct answer and why?")}
                className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                ✅ What's the correct answer and why?
              </button>
              <button
                onClick={() => handleSendMessage("Help me understand the key concepts")}
                className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-sm hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                💡 Help me understand the key concepts
              </button>
              <button
                onClick={() => handleSendMessage("What are common mistakes for this type of question?")}
                className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg text-sm hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
              >
                ⚠️ Common mistakes to avoid
              </button>
            </div>
          </div>
        )}

        <div className="px-4 sm:px-6 md:px-8">
          <div className="apple-question-content space-y-4">
            {messages.map((message, index) => (
              <div key={message.id || index} className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${message.role === 'user' ? 'max-w-[85%]' : 'w-full'}`}>
                  {/* WhatsApp-style reply context */}
                  {message.replyTo && (
                    <div className={`mb-2 px-3 py-2 rounded-lg border-l-4 text-sm ${
                      message.role === 'user' 
                        ? 'bg-blue-50 dark:bg-white/10 border-blue-400 dark:border-white/30' 
                        : 'bg-gray-50 dark:bg-gray-800 border-blue-500'
                    }`}>
                      <div className={`text-xs font-medium mb-1 ${
                        message.role === 'user' 
                          ? 'text-blue-700 dark:text-white/80' 
                          : message.replyTo.role === 'assistant' 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-green-600 dark:text-green-400'
                      }`}>
                        {message.replyTo.role === 'assistant' ? 'AI Assistant' : 'You'}
                      </div>
                      <div className={`text-sm leading-relaxed ${
                        message.role === 'user' 
                          ? 'text-blue-800 dark:text-white/90' 
                          : 'text-gray-600 dark:text-gray-300'
                      }`}>
                        {message.replyTo.content.replace(/✓/g, '').replace(/✅/g, '').trim() || 'Message content'}
                      </div>
                    </div>
                  )}
                  {/* WhatsApp-style message bubble */}
                  <div 
                    className={`group relative px-4 py-3 rounded-2xl shadow-sm ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white rounded-br-md hover:bg-blue-600' 
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
                    }`}
                  >
                    {message.role === 'assistant' && message.content === '' && isStreaming ? (
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    ) : (
                      <div className="ai-chat-message">
                        <ReactMarkdown 
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            p: ({ children }) => <p className={`mb-2 last:mb-0 leading-relaxed ${message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{children}</p>,
                            h1: ({ children }) => <h1 className={`font-bold mb-2 ${message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{children}</h1>,
                            h2: ({ children }) => <h2 className={`font-semibold mb-2 mt-3 first:mt-0 ${message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{children}</h2>,
                            h3: ({ children }) => <h3 className={`font-medium mb-2 mt-2 first:mt-0 ${message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className={`leading-relaxed ${message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{children}</li>,
                            strong: ({ children }) => <strong className={`font-semibold ${message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{children}</strong>,
                            em: ({ children }) => <em className={`italic ${message.role === 'user' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>{children}</em>,
                            code: ({ children }) => <code className={`px-1 py-0.5 rounded text-xs font-mono ${message.role === 'user' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>{children}</code>,
                            blockquote: ({ children }) => <blockquote className={`border-l-2 pl-3 py-1 italic my-2 ${message.role === 'user' ? 'border-white/50 text-white/90' : 'border-blue-400 dark:border-blue-500 text-gray-700 dark:text-gray-300'}`}>{children}</blockquote>
                          }}
                        >
                          {processVideoTags(message.content)}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  
                  {/* Reply and Copy buttons */}
                  {message.role === 'assistant' && message.content && !isStreaming && (
                    <div className="flex justify-start mt-1 gap-2">
                      <button
                        onClick={() => {
                          setReplyingTo(message);
                          // Auto-focus the textarea after setting reply mode
                          setTimeout(() => {
                            const textarea = document.querySelector('textarea[aria-label="Chat message"]') as HTMLTextAreaElement;
                            if (textarea) {
                              textarea.focus();
                            }
                          }, 100);
                        }}
                        className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
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
                                button.classList.add('text-green-600', 'dark:text-green-400');
                                button.classList.remove('text-gray-500', 'dark:text-gray-400');
                              } else {
                                button.textContent = '✗ Failed';
                                button.classList.add('text-red-600', 'dark:text-red-400');
                                button.classList.remove('text-gray-500', 'dark:text-gray-400');
                              }
                              
                              setTimeout(() => {
                                button.textContent = originalText;
                                button.classList.remove('text-green-600', 'dark:text-green-400', 'text-red-600', 'dark:text-red-400');
                                button.classList.add('text-gray-500', 'dark:text-gray-400');
                              }, 1500);
                            }
                          } catch (err) {
                            document.body.removeChild(textArea);
                            console.error('Copy failed:', err);
                            if (button) {
                              button.textContent = '✗ Failed';
                              button.classList.add('text-red-600', 'dark:text-red-400');
                              button.classList.remove('text-gray-500', 'dark:text-gray-400');
                              setTimeout(() => {
                                button.textContent = originalText;
                                button.classList.remove('text-red-600', 'dark:text-red-400');
                                button.classList.add('text-gray-500', 'dark:text-gray-400');
                              }, 1500);
                            }
                          }
                        }}
                        className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title="Copy message text"
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
          placeholder={replyingTo ? `Reply to ${replyingTo.role === 'assistant' ? 'AI Assistant' : 'your message'}...` : "Ask about this question..."}
          maxRows={4}
          onStop={handleStopGeneration}
          isStreaming={isStreaming}
          replyPreview={replyingTo ? (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${
                      replyingTo.role === 'assistant' ? 'bg-blue-500' : 'bg-green-500'
                    }`}></div>
                    <span className={`text-xs font-medium ${
                      replyingTo.role === 'assistant' 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {replyingTo.role === 'assistant' ? 'AI Assistant' : 'You'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                    {replyingTo.content.length > 120 
                      ? replyingTo.content.substring(0, 120) + '...' 
                      : replyingTo.content
                    }
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                  title="Cancel reply"
                >
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
