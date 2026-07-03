"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/store/useChatStore';
import { useAgentSocket } from '@/lib/network/useAgentSocket';
import { MessageBubble } from './MessageBubble';

export function ChatPanel() {
  const { sendMessage } = useAgentSocket();
  const { messages, connectionState, addUserMessage } = useChatStore();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    addUserMessage(inputValue);
    sendMessage({ type: 'USER_MESSAGE', content: inputValue });
    setInputValue('');
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'bg-green-500';
      case 'reconnecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      case 'connecting': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50/80">
        <h2 className="font-semibold text-gray-700">Agent Chat</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${getStatusColor()} ${connectionState !== 'connected' ? 'animate-pulse' : ''}`} />
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
            {connectionState}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm font-medium">
            Send a message to start the conversation...
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/50">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
            disabled={connectionState !== 'connected'}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || connectionState !== 'connected'}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-[0.98]"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
