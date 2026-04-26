import React, { useState } from 'react';
import { ChatInput } from '../ui/ChatInput';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  sender: 'user' | 'assistant';
}

export const ChatInputExample: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! This is an example of the ChatGPT-style input component. Try typing a message below.',
      timestamp: new Date(),
      sender: 'assistant'
    }
  ]);

  const handleSend = async (text: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
      sender: 'user'
    };

    setMessages(prev => [...prev, userMessage]);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Add mock assistant response
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: `You said: "${text}". This is a mock response to demonstrate the ChatInput component working properly.`,
      timestamp: new Date(),
      sender: 'assistant'
    };

    setMessages(prev => [...prev, assistantMessage]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          ChatInput Component Demo
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Test the ChatGPT-style input component below
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <p className={`text-xs mt-1 ${
                message.sender === 'user' 
                  ? 'text-blue-100' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input */}
      <ChatInput
        onSend={handleSend}
        placeholder="Type your message here..."
        maxRows={6}
      />
    </div>
  );
};
