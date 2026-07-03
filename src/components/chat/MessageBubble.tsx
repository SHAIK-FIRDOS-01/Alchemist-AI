"use client";

import React from 'react';
import { ChatMessage } from '@/lib/store/useChatStore';
import { ToolCallCard } from './ToolCallCard';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[85%] flex flex-col shadow-sm rounded-2xl p-4 transition-all duration-300 ${
          isUser 
            ? 'bg-blue-600 text-white rounded-br-sm' 
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm hover:shadow-md'
        }`}
      >
        {message.text && (
          <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
            {message.text}
          </div>
        )}
        
        {message.toolData && (
          <ToolCallCard 
            name={message.toolData.name}
            args={message.toolData.args}
            result={message.toolData.result}
            status={message.status}
          />
        )}
      </div>
    </div>
  );
}
