"use client";

import React from 'react';

interface ToolCallCardProps {
  name: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'tool_pending' | 'finished' | 'streaming';
}

export function ToolCallCard({ name, args, result, status }: ToolCallCardProps) {
  return (
    <div className="mt-2 bg-gray-50 rounded-xl p-3 text-sm font-mono text-gray-800 border border-gray-200 min-h-[160px] flex flex-col shadow-sm transition-all duration-300">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
        <div className="bg-purple-100 p-1.5 rounded-md">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
          </svg>
        </div>
        <span className="font-semibold text-gray-700 tracking-tight">{name}</span>
      </div>
      
      <div className="mb-3">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1 block">Arguments</span>
        <pre className="bg-gray-100/80 p-2.5 rounded-lg overflow-x-auto text-[11px] leading-relaxed border border-gray-200/50">
          {JSON.stringify(args, null, 2)}
        </pre>
      </div>

      <div className="mt-auto">
        {result ? (
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1 block">Result</span>
            <pre className="bg-green-50/50 p-2.5 rounded-lg overflow-x-auto text-[11px] leading-relaxed max-h-40 overflow-y-auto border border-green-100 text-green-900">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-purple-600 animate-pulse mt-2 p-2.5 bg-purple-50/50 rounded-lg border border-purple-100">
            <svg className="animate-spin h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-semibold tracking-wide">Executing tool...</span>
          </div>
        )}
      </div>
    </div>
  );
}
