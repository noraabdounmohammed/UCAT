import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { generateAIResponse, generateFallbackResponse } from '../../services/openai';

// Utility function to conditionally join classNames
const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

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
  const [isExpanded, setIsExpanded] = useState(integrated); // Auto-expand when integrated
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Add welcome message when chat is first expanded (only for non-integrated mode)
  useEffect(() => {
    if (isExpanded && !hasInitialized && !integrated) {
      // Get the question text from the appropriate field
      const questionText = question.question || question.question_stem || question.individual_question || '';
      
      // Create a personalized welcome message
      const welcomeMessage = {
        role: 'assistant' as const,
        content: `Hi there! I'm your AI medical study assistant. I can help you understand this question about ${questionText.substring(0, 50)}${questionText.length > 50 ? '...' : ''}. What specific aspect would you like me to explain?`
      };
      
      setMessages([welcomeMessage]);
      setHasInitialized(true);
    } else if (integrated && !hasInitialized) {
      // For integrated mode, don't show a welcome message
      setHasInitialized(true);
    }
  }, [isExpanded, hasInitialized, question, integrated]);

  // Scroll to bottom of chat when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Function to handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message to chat
    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputValue('');
    setIsLoading(true);

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
      
      let response: string;
      let isUsingRealAPI = false;

      if (apiKey && apiKey !== 'your-openai-api-key-goes-here') {
        // Use the real OpenAI API if we have a valid key
        console.log('Using real OpenAI API');
        isUsingRealAPI = true;
        response = await generateAIResponse(userMessage, questionContext);
      } else {
        // Fall back to the mock implementation if no valid API key
        console.log('Using fallback response generator');
        response = generateFallbackResponse(userMessage, questionContext);
      }
      
      // Add a prefix to the response if using fallback
      if (!isUsingRealAPI) {
        response = "[USING FALLBACK] " + response;
      }

      // Add AI response to chat
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error while processing your question. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={integrated ? "" : "mt-4 apple-fade-in"}>
      <div className={integrated ? "apple-ai-helper" : "apple-ai-helper bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] overflow-hidden"}>
        {/* Header - always visible */}
        {!integrated && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-4 bg-[#F2F9FF] hover:bg-[#E5F1FF] transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#007AFF]" />
              <span className="font-semibold text-[16px] text-[#1D1D1F]">AI Study Assistant</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-[#86868B]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#86868B]" />
            )}
          </button>
        )}
        
        {/* For integrated mode, show a title */}
        {integrated && (
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-[#007AFF]" />
            <span className="font-semibold text-[16px] text-[#1D1D1F]">Ask follow-up questions</span>
          </div>
        )}
        
        {/* Expandable chat area */}
        {isExpanded && (
          <div className={integrated ? "" : "p-4"}>
            {messages.length === 0 ? (
              <div className={integrated ? "text-center py-2 text-[#86868B]" : "text-center py-6 text-[#86868B]"}>
                {!integrated && (
                  <div className="mb-4 text-[#007AFF]">
                    <MessageSquare className="h-10 w-10 mx-auto mb-2" />
                  </div>
                )}
                {!integrated && <p className="mb-2 text-[15px] font-medium">Medical Study Assistant</p>}
                <p className="mb-2 text-[14px]">
                  {integrated ? "Ask follow-up questions to deepen your understanding." : "Ask questions about this problem to deepen your understanding."}
                </p>
                <p className="text-[14px] text-[#86868B]">
                  Examples: <br />
                  {integrated ? (
                    <>
                      "Can you elaborate on this concept?" <br />
                      "What are the clinical implications?" <br />
                      "How does this relate to other topics?"
                    </>
                  ) : (
                    <>
                      "Why is this answer correct?" <br />
                      "Explain the pathophysiology involved" <br />
                      "How would this present clinically?"
                    </>
                  )}
                </p>
                {import.meta.env.VITE_OPENAI_API_KEY === 'your-openai-api-key-goes-here' && (
                  <div className="mt-3 p-2 bg-[#FFF9C4] border border-[#FFD600] rounded-lg text-[#664D00] text-[12px]">
                    <p>⚠️ Using simulated AI responses. For better results, add your OpenAI API key to the .env file.</p>
                  </div>
                )}
              </div>
            ) : (
              <div 
                ref={chatContainerRef}
                className={integrated ? "max-h-[200px] overflow-y-auto mb-4 pr-2 space-y-3" : "max-h-[300px] overflow-y-auto mb-4 pr-2 space-y-3"}
              >
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "p-3 rounded-xl max-w-[85%]",
                      message.role === 'user' 
                        ? "bg-[#007AFF] text-white ml-auto" 
                        : "bg-[#E5E5EA] text-[#1D1D1F]"
                    )}
                  >
                    <p className="text-[14px] whitespace-pre-line">{message.content}</p>
                  </div>
                ))}
                {isLoading && (
                  <div className="bg-[#E5E5EA] p-3 rounded-xl max-w-[85%] flex items-center">
                    <Loader2 className="h-4 w-4 text-[#86868B] animate-spin mr-2" />
                    <span className="text-[14px] text-[#86868B]">Thinking...</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Input area */}
            <div className={integrated ? "flex gap-2 mt-2" : "flex gap-2 mt-3"}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={integrated ? "Ask a follow-up question about this explanation..." : "Ask a question about this problem..."}
                className={integrated 
                  ? "flex-1 rounded-xl border border-[#E5E5EA] bg-white px-3 py-1.5 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:border-transparent" 
                  : "flex-1 rounded-xl border border-[#E5E5EA] bg-white px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                }
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className={cn(
                  "p-2 rounded-xl",
                  inputValue.trim() && !isLoading
                    ? "bg-[#007AFF] text-white hover:bg-[#0062CC] active:bg-[#0055B3]"
                    : "bg-[#E5E5EA] text-[#86868B]"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
