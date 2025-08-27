import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateFallbackResponse } from '../../services/openai';
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
  integrated?: boolean; // New prop to indicate if the helper is integrated in the explanation box
}

export function AIHelper({ question, correctAnswer, selectedAnswer, explanation }: AIHelperProps) {
  const [messages, setMessages] = useState<Array<ChatMessage>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // New state for typing indicator
  const [isStreaming, setIsStreaming] = useState(false); // Track if currently streaming
  const [hasInitialized, setHasInitialized] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
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











  return (
    <>
      <div className="space-y-4 pb-20">
        {/* Quick Actions - only show when no messages */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button 
              onClick={() => {
                const input = document.querySelector('textarea[aria-label="Chat message"]') as HTMLTextAreaElement;
                const sendButton = document.querySelector('button[aria-label="Send message"]') as HTMLButtonElement;
                if (input && sendButton) {
                  input.value = "Why is my answer wrong?";
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  setTimeout(() => sendButton.click(), 100);
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-800/40 dark:text-red-200 dark:border-red-600/50 rounded-lg border border-red-200 dark:border-red-600/30 transition-colors"
            >
              ❓ Why wrong?
            </button>
            <button 
              onClick={() => {
                const input = document.querySelector('textarea[aria-label="Chat message"]') as HTMLTextAreaElement;
                const sendButton = document.querySelector('button[aria-label="Send message"]') as HTMLButtonElement;
                if (input && sendButton) {
                  input.value = "Give me a similar practice question";
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  setTimeout(() => sendButton.click(), 100);
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-800/40 dark:text-green-200 dark:border-green-600/50 rounded-lg border border-green-200 dark:border-green-600/30 transition-colors"
            >
              🔄 Similar question
            </button>
            <button 
              onClick={() => {
                const input = document.querySelector('textarea[aria-label="Chat message"]') as HTMLTextAreaElement;
                const sendButton = document.querySelector('button[aria-label="Send message"]') as HTMLButtonElement;
                if (input && sendButton) {
                  input.value = "Show me the next question from the database";
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  setTimeout(() => sendButton.click(), 100);
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-800/40 dark:text-purple-200 dark:border-purple-600/50 rounded-lg border border-purple-200 dark:border-purple-600/30 transition-colors"
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
                <div className={`w-full mb-4`} style={{ display: 'flex', width: '100%', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div className={`${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white px-4 py-3 max-w-[85%] rounded-2xl' 
                      : 'w-full p-6 bg-gray-50 dark:bg-gray-800 border border-[#E5E5EA] dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100'
                  }`}>
                    <ReactMarkdown 
                      components={{
                        p: ({ children }) => <p className={`mb-4 last:mb-0 leading-relaxed text-base ${message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`} style={{ fontSize: '16px' }}>{children}</p>,
                        h1: ({ children }) => <h1 className={`text-2xl font-bold mb-4 border-b pb-2 ${message.role === 'user' ? 'text-white border-white/30' : 'text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-600'}`}>{children}</h1>,
                        h2: ({ children }) => <h2 className={`text-xl font-semibold mb-3 mt-6 first:mt-0 ${message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{children}</h2>,
                        h3: ({ children }) => <h3 className={`text-lg font-medium mb-3 mt-5 first:mt-0 ${message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{children}</h3>,
                        ul: ({ children }) => <ul className="list-none pl-0 mb-4 space-y-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                        li: ({ children }) => <li className={`leading-relaxed flex items-start ${message.role === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`} style={{ fontSize: '16px' }}><span className={`inline-block w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0 ${message.role === 'user' ? 'bg-white' : 'bg-blue-500'}`}></span><span className="flex-1">{children}</span></li>,
                        strong: ({ children }) => <strong className={`font-semibold px-2 py-1 rounded ${message.role === 'user' ? 'text-white bg-white/20' : 'text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-800/40 border border-blue-200 dark:border-blue-700/50'}`}>{children}</strong>,
                        em: ({ children }) => <em className={`italic font-medium ${message.role === 'user' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>{children}</em>,
                        code: ({ children }) => <code className={`px-2 py-1 rounded text-sm font-mono border ${message.role === 'user' ? 'bg-white/20 text-white border-white/30' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600'}`}>{children}</code>,
                        blockquote: ({ children }) => <blockquote className={`border-l-4 pl-4 py-2 rounded-r italic my-4 ${message.role === 'user' ? 'border-white/50 bg-white/10 text-white' : 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100'}`} style={{ fontSize: '16px' }}>{children}</blockquote>
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
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                🤖
              </div>
              <div className="w-full p-8 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-[#E5E5EA] dark:border-gray-700 rounded-xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      </div>
      
      {/* ChatGPT-style Input */}
      <ChatInput
        onSend={async (text: string) => {
          // Add user message to chat
          const newUserMessage = { role: 'user' as const, content: text };
          setMessages(prev => [...prev, newUserMessage]);
          setIsLoading(true);
          
          // Force immediate re-render to ensure proper alignment
          setTimeout(() => {
            setMessages(prev => [...prev]);
          }, 10);
          
          // Check if user is asking for next question
          if (text.toLowerCase().includes('next question') || text.toLowerCase().includes('show me the next question')) {
            // Dispatch event to get next question data directly without intermediate message
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('requestNextQuestionData'));
            }, 500);
            
            setIsLoading(false);
            return;
          }
          
          // Add an empty assistant message that will be filled as tokens arrive
          setMessages(prev => [...prev, { role: 'assistant' as const, content: '' }]);
          
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
            const questionContext = {
              question: questionText,
              options: options,
              correctAnswer: correctAnswer,
              selectedAnswer: selectedAnswer,
              explanation: explanation
            };

            // Check if we have an API key
            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
            
            if (apiKey && apiKey !== 'your-openai-api-key-goes-here') {
              // Real DeepSeek API with streaming
              setIsLoading(true);
              setIsTyping(true);
              setIsStreaming(true);
              
              // Create new AbortController for this request
              abortControllerRef.current = new AbortController();
              
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

              // Create streaming completion with abort signal
              const stream = await client.chat.completions.create({
                model: 'deepseek-chat',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: text }
                ],
                stream: true,
                max_tokens: 4000,
                temperature: 0.7
              }, {
                signal: abortControllerRef.current.signal
              });

              setIsTyping(false);
              let accumulatedResponse = '';

              // Process streaming response
              try {
                for await (const chunk of stream) {
                  // Check if aborted
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
              } catch (error: unknown) {
                if ((error as Error).name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
                  // Request was aborted, add a message indicating it was stopped
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.content = accumulatedResponse + '\n\n*Response stopped by user*';
                    }
                    return newMessages;
                  });
                } else {
                  throw error; // Re-throw other errors
                }
              }
              
              setIsStreaming(false);
            } else {
              // Fallback implementation
              let response = generateFallbackResponse(text, questionContext);
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
          } catch (error) {
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
          } finally {
            setIsLoading(false);
            setIsStreaming(false);
          }
        }}
        onStop={() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsLoading(false);
            setIsTyping(false);
            setIsStreaming(false);
          }
        }}
        disabled={isLoading}
        placeholder="Ask a follow-up question..."
        maxRows={6}
        isStreaming={isStreaming}
      />
    </>
  );  
}
