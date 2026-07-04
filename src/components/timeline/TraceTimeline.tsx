"use client";

import React, { useState, useMemo } from 'react';
import { useChatStore } from '@/lib/store/useChatStore';
import { EventRow, GroupedEvent } from './EventRow';

export function TraceTimeline() {
  const { traceEvents } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const groupedEvents = useMemo(() => {
    const result: GroupedEvent[] = [];
    let currentGroup: GroupedEvent | null = null;

    for (const event of traceEvents) {
      const payload = event.payload as { type?: string; stream_id?: string; text?: string };
      if (payload.type === 'TOKEN' && event.direction === 'in') {
        if (!currentGroup) {
          currentGroup = {
            ...event,
            isGroup: true,
            groupCount: 1,
            payload: { type: 'TOKEN_GROUP', stream_id: payload.stream_id, tokens: [payload.text] }
          };
        } else {
          const currentGroupPayload = currentGroup.payload as { stream_id?: string; tokens: string[] };
          if (currentGroupPayload.stream_id === payload.stream_id) {
            currentGroup.groupCount! += 1;
            if (payload.text) {
              currentGroupPayload.tokens.push(payload.text);
            }
          } else {
            result.push(currentGroup);
            currentGroup = {
              ...event,
              isGroup: true,
              groupCount: 1,
              payload: { type: 'TOKEN_GROUP', stream_id: payload.stream_id, tokens: [payload.text] }
            };
          }
        }
      } else {
        if (currentGroup) {
          result.push(currentGroup);
          currentGroup = null;
        }
        result.push({ ...event, isGroup: false });
      }
    }
    
    if (currentGroup) {
      result.push(currentGroup);
    }

    return result;
  }, [traceEvents]);

  const filteredEvents = useMemo(() => {
    return groupedEvents.filter((event) => {
      const payload = event.payload as { type?: string };
      if (typeFilter !== 'ALL' && payload.type !== typeFilter) {
        // Allow TOKEN_GROUP to pass if filter is TOKEN
        if (!(typeFilter === 'TOKEN' && payload.type === 'TOKEN_GROUP')) {
          return false;
        }
      }
      
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase();
        if (!JSON.stringify(event.payload).toLowerCase().includes(searchLower)) return false;
      }
      return true;
    });
  }, [groupedEvents, typeFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
      {/* Sticky Header with Controls */}
      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 p-4">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm">Trace Timeline</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search payload..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1.5 text-xs font-mono font-medium text-gray-600 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          >
            <option value="ALL">ALL EVENTS</option>
            <option value="USER_MESSAGE">USER_MESSAGE</option>
            <option value="TOKEN">TOKEN</option>
            <option value="TOOL_CALL">TOOL_CALL</option>
            <option value="TOOL_ACK">TOOL_ACK</option>
            <option value="TOOL_RESULT">TOOL_RESULT</option>
            <option value="CONTEXT_SNAPSHOT">CONTEXT_SNAPSHOT</option>
            <option value="STREAM_END">STREAM_END</option>
            <option value="PING">PING</option>
            <option value="PONG">PONG</option>
            <option value="RESUME">RESUME</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-gray-400">
            No trace events recorded.
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredEvents.map((event, idx) => (
              <EventRow key={event.id || idx} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
