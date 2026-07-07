"use client";

import React from 'react';
import { ChatMessage, useChatStore } from '@/lib/store/useChatStore';
import { ToolCallCard } from './ToolCallCard';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const highlightedId = useChatStore((state) => state.highlightedId);
  const isHighlighted = highlightedId === message.id;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] flex flex-col shadow-sm rounded-2xl p-4 transition-all duration-300 ${isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm hover:shadow-md'
          }`}
      >
        {message.parts.map((part, idx) => {
          if (part.type === 'text') {
            return (
              <div 
                key={idx} 
                className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed mb-2 last:mb-0 ${isHighlighted && !isUser ? 'ring-2 ring-blue-400 bg-blue-50/30 p-2 rounded-md transition-all' : 'p-2 transition-all'}`}
              >
                {part.content}
              </div>
            );
          } else if (part.type === 'tool') {
            return (
              <ToolCallCard
                key={part.call_id || idx}
                call_id={part.call_id}
                name={part.name}
                args={part.args}
                result={part.result}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
