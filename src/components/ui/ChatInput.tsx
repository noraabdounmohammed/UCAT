import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Square } from 'lucide-react';
import '../../styles/mobile-keyboard-fix.css';

interface ChatInputProps {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  maxRows?: number;
  onStop?: () => void;
  isStreaming?: boolean;
  replyPreview?: React.ReactNode;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = "Message…",
  maxRows = 8,
  onStop,
  isStreaming = false,
  replyPreview
}) => {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate scrollHeight properly
    textarea.style.height = 'auto';
    
    // Calculate line height based on ChatGPT specs (16px font * 1.4 line-height)
    const lineHeight = 22; // 16px * 1.4
    const minHeight = 36; // Reduced minimum height for more compact design
    const maxHeight = lineHeight * maxRows;
    
    // Set height based on content, but within min/max bounds
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [maxRows]);

  // Adjust height when value changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  // Monitor textarea for programmatic changes (like from template buttons)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const checkForChanges = () => {
      if (textarea.value !== value) {
        setValue(textarea.value);
      }
    };

    // Check periodically for programmatic changes
    const interval = setInterval(checkForChanges, 100);
    
    // Also check on focus events
    textarea.addEventListener('focus', checkForChanges);
    
    return () => {
      clearInterval(interval);
      textarea.removeEventListener('focus', checkForChanges);
    };
  }, [value]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };

  // Handle send
  const handleSend = useCallback(async () => {
    if (!value.trim() || disabled || isComposing) return;

    const textToSend = value.trim();
    setValue('');

    try {
      await onSend(textToSend);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the message if sending failed
      setValue(textToSend);
    } finally {
      // Keep focus on textarea after sending
      textareaRef.current?.focus();
    }
  }, [value, disabled, isComposing, onSend]);

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      if (canSend) {
        handleSend();
      }
    }
  };

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Add class to body to prevent scrolling on mobile
    if (window.innerWidth <= 768) {
      document.body.classList.add('input-focused');
    }
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Remove class from body
    document.body.classList.remove('input-focused');
  }, []);

  // Handle composition events (for IME)
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // Block file drag/drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Block all drops - we don't want any file uploads
  };

  // Block image/file pastes (allow text only)
  const handlePaste = (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    const items = Array.from(clipboardData.items);
    
    // Check if any items are files/images
    const hasFiles = items.some(item => item.kind === 'file');
    
    if (hasFiles) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Allow text paste (default behavior)
  };

  const canSend = value.trim().length > 0 && !disabled && !isComposing;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-[env(safe-area-inset-bottom)] mobile-fixed-input ${isFocused ? 'input-focused' : ''}`}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transform: 'translateZ(0)', // Force hardware acceleration
        backfaceVisibility: 'hidden', // Prevent flickering
        willChange: 'transform', // Optimize for changes
        minHeight: 'env(keyboard-inset-height, 0px)' // iOS keyboard support
      }}
    >
      <div className="w-full px-3 py-2">
        <div className={`relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:shadow-lg transition-all duration-200 max-w-4xl mx-auto ${
          replyPreview ? 'rounded-b-xl' : 'rounded-xl'
        }`}>
          {replyPreview && (
            <div className="">
              {replyPreview}
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onPaste={handlePaste}
              placeholder={placeholder}
              disabled={disabled}
              aria-label="Chat message"
              className="flex-1 resize-none bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 leading-relaxed"
              style={{
                fontSize: '16px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                fontWeight: '400',
                lineHeight: '1.4',
                minHeight: '36px',
                maxHeight: '64px',
                paddingTop: '8px',
                paddingBottom: '8px',
                verticalAlign: 'middle'
              }}
              rows={1}
            />
            
            {/* Send/Stop Button */}
            {isStreaming && onStop ? (
              <button
                onClick={onStop}
                className="flex items-center justify-center w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200 hover:scale-105 shadow-sm flex-shrink-0"
                aria-label="Stop generation"
              >
                <Square className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 shadow-sm flex-shrink-0 ${
                  canSend 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                aria-label="Send message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};
