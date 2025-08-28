import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateAIResponseStream, QuestionContext } from '../../services/openai';
import { ChatInput } from '../ui/ChatInput';
import '../../styles/markdown-styles.css';
import './apple-fixed-input.css';

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
  integrated?: boolean;
}

export function AIHelper({ question, correctAnswer, selectedAnswer, explanation }: AIHelperProps) {
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

    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setIsStreaming(true);

    // Create placeholder message for streaming
    const placeholderMessage: ChatMessage = { role: 'assistant', content: '' };
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
      
      await generateAIResponseStream(
        text, 
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
        }
      );
      
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
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
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [question, correctAnswer, selectedAnswer, explanation]);

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
              <div key={index} className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${message.role === 'user' ? 'max-w-[85%]' : 'w-full'}`}>
                  {/* Message bubble */}
                  <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-br-md' 
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
                  }`}>
                    {message.role === 'assistant' && message.content === '' && isStreaming ? (
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    ) : (
                      <div className="ai-chat-message">
                        <ReactMarkdown 
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
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
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
          placeholder="Ask about this question..."
          maxRows={4}
          onStop={handleStopGeneration}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
