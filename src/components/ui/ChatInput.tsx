import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SendIcon } from './SendIcon';
import { Spinner } from './Spinner';
import { StopIcon } from './StopIcon';

interface ChatInputProps {
  onSend: (text: string) => Promise<void> | void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxRows?: number;
  isStreaming?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  disabled = false,
  placeholder = "Message…",
  maxRows = 8,
  isStreaming = false
}) => {
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate scrollHeight properly
    textarea.style.height = 'auto';
    
    // Calculate line height based on ChatGPT specs (16px font * 1.5 line-height)
    const lineHeight = 24; // 16px * 1.5
    const minHeight = 44; // Minimum 44px for mobile tap target
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
    if (!value.trim() || isSending || disabled || isComposing) return;

    const textToSend = value.trim();
    setValue('');
    setIsSending(true);

    try {
      await onSend(textToSend);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the message if sending failed
      setValue(textToSend);
    } finally {
      setIsSending(false);
      // Keep focus on textarea after sending
      textareaRef.current?.focus();
    }
  }, [value, isSending, disabled, isComposing, onSend]);

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: allow newline (default behavior)
        return;
      } else if (e.metaKey || e.ctrlKey) {
        // Cmd/Ctrl+Enter: send message
        e.preventDefault();
        handleSend();
      } else {
        // Enter: send message
        e.preventDefault();
        handleSend();
      }
    }
  };

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

  const canSend = value.trim().length > 0 && !isSending && !disabled && !isComposing;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-[env(safe-area-inset-bottom)]">
      <div className="w-full px-4 py-4">
        <div className="relative flex items-end gap-2 bg-white dark:bg-gray-800 border border-[#e5e7eb] dark:border-[#374151] rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-within:border-[#3b82f6] dark:focus-within:border-[#60a5fa] focus-within:shadow-[0_4px_12px_rgba(59,130,246,0.15)] transition-all duration-200 max-w-4xl mx-auto min-h-[44px]">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled || isSending}
            aria-label="Chat message"
            className="flex-1 resize-none bg-transparent border-none outline-none text-[#0a0a0a] dark:text-[#fafafa] placeholder-[#a1a1aa] dark:placeholder-[#71717a] overflow-y-auto"
            style={{
              fontSize: '16px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              fontWeight: '400',
              lineHeight: '1.5',
              padding: '0.5rem 0.75rem',
              minHeight: '44px'
            }}
            rows={1}
          />
          
          {isStreaming && onStop ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop response"
              className="flex-shrink-0 rounded-full flex items-center justify-center mr-2 mb-2 transition-all duration-200 bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl active:scale-95"
              style={{
                padding: '0.75rem',
                fontSize: '16px'
              }}
            >
              <StopIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              aria-label={isSending ? "Sending…" : "Send message"}
              className={`flex-shrink-0 rounded-full flex items-center justify-center mr-2 mb-2 transition-all duration-200 ${
                canSend
                  ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white dark:bg-[#3b82f6] dark:hover:bg-[#2563eb] shadow-lg hover:shadow-xl active:scale-95'
                  : 'bg-[#d1d5db] dark:bg-[#6b7280] text-[#9ca3af] dark:text-[#9ca3af] cursor-not-allowed'
              }`}
              style={{
                padding: '0.75rem',
                fontSize: '16px'
              }}
            >
              {isSending ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <SendIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        
      </div>
    </div>
  );
};
