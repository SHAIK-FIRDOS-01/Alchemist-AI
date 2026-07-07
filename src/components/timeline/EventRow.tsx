"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore, TraceEvent } from '@/lib/store/useChatStore';

interface EventRowProps {
  event: TraceEvent;
}

export function EventRow({ event }: EventRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { highlightedId, setHighlightedId } = useChatStore();
  const rowRef = useRef<HTMLDivElement>(null);

  const payload = event.payload as Record<string, unknown>;
  const callId = payload.call_id as string | undefined;
  const streamId = payload.stream_id as string | undefined;

  const type = payload.type as string;
  const targetId = type === 'TOKEN' || type === 'TOKEN_GROUP' ? streamId : callId;

  const isHighlighted = targetId && highlightedId === targetId;

  useEffect(() => {
    if (isHighlighted && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  const handleRowClick = () => {
    setExpanded(!expanded);
    if (targetId) {
      setHighlightedId(targetId);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PING':
      case 'PONG':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'ERROR':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'TOOL_CALL':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'TOOL_ACK':
      case 'TOOL_RESULT':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'TOKEN':
      case 'TOKEN_GROUP':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'USER_MESSAGE':
        return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'CONTEXT_SNAPSHOT':
        return 'text-teal-600 bg-teal-50 border-teal-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const payloadWithType = event.payload as { type?: string };
  const typeName = payloadWithType?.type || 'UNKNOWN';
  const colorClass = getTypeColor(typeName);
  const d = new Date(event.timestamp);
  const timeString = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;

  const isToolChild = typeName === 'TOOL_ACK' || typeName === 'TOOL_RESULT';

  return (
    <div 
      ref={rowRef}
      className={`flex flex-col border-b border-gray-100 last:border-0 transition-colors ${
        isHighlighted ? 'bg-blue-50/80 border-l-4 border-l-blue-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
      } ${isToolChild ? 'ml-6 border-l-gray-200' : ''}`}
    >
      <div 
        className="flex items-center justify-between p-2 cursor-pointer select-none"
        onClick={handleRowClick}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${event.direction === 'in' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
            {event.direction}
          </span>
          <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
            {timeString}
          </span>
          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${colorClass}`}>
            {typeName}
          </span>
          
          {event.isGroup && (
            <span className="text-[11px] text-gray-500 font-medium truncate">
              Streamed {event.groupCount} tokens
            </span>
          )}
        </div>
        
        <svg 
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-50 bg-gray-50/50">
          <pre className="text-[10px] font-mono leading-relaxed text-gray-700 overflow-x-auto bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm max-h-64 overflow-y-auto">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
