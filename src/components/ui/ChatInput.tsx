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
  contained?: boolean; // New prop to control positioning
  lightMode?: boolean; // New prop for light mode styling
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = "Message…",
  maxRows = 8,
  onStop,
  isStreaming = false,
  replyPreview,
  contained = false,
  lightMode = false
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
      className={`${contained ? 'relative' : 'fixed bottom-0 left-0 right-0'} z-50 border-t border-white/10 ${contained ? '' : 'pb-[env(safe-area-inset-bottom)] mobile-fixed-input'} ${isFocused ? 'input-focused' : ''}`}
      style={contained ? {} : {
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
        <div className={`relative border-2 transition-all duration-200 max-w-4xl mx-auto ${
          lightMode 
            ? 'bg-black/[0.03] border-black/[0.08] hover:bg-black/[0.05] hover:border-black/[0.12] focus-within:border-black/[0.20]'
            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 focus-within:border-white/30'
        } ${replyPreview ? 'rounded-b-xl' : 'rounded-xl'}`}>
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
              className={`flex-1 resize-none bg-transparent border-none outline-none leading-relaxed ${
                lightMode ? 'text-stone-900 placeholder-stone-400' : 'text-white placeholder-white/50'
              }`}
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
                className="flex items-center justify-center w-8 h-8 bg-rose-500/80 hover:bg-rose-500 text-white rounded-full transition-all duration-200 hover:scale-105 flex-shrink-0"
                aria-label="Stop generation"
              >
                <Square className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 flex-shrink-0 ${
                  lightMode
                    ? canSend 
                      ? 'bg-black/[0.12] hover:bg-black/[0.18] text-stone-900' 
                      : 'bg-black/[0.03] text-stone-400 cursor-not-allowed'
                    : canSend 
                      ? 'bg-white/20 hover:bg-white/30 text-white' 
                      : 'bg-white/5 text-white/30 cursor-not-allowed'
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
