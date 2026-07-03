"use client";

import React, { useMemo } from 'react';
import { useChatStore } from '@/lib/store/useChatStore';

const JsonViewer = ({ data, prevData, name = null }: { data: any, prevData: any, name?: string | null }) => {
  const isAdded = prevData === undefined && data !== undefined;
  const isRemoved = data === undefined && prevData !== undefined;
  const isPrimitiveChanged = data !== undefined && prevData !== undefined && typeof data !== 'object' && data !== prevData;
  const typeChanged = data !== undefined && prevData !== undefined && typeof data !== typeof prevData;

  const isObject = (val: any) => val !== null && typeof val === 'object' && !Array.isArray(val);
  const isArray = (val: any) => Array.isArray(val);

  const containerClass = `pl-4 py-0.5 font-mono text-sm ${isAdded || isPrimitiveChanged || typeChanged ? 'bg-green-100 dark:bg-green-900/30 rounded-sm' : ''} ${isRemoved ? 'line-through text-red-500 bg-red-50 dark:bg-red-900/20 rounded-sm' : ''}`;

  if (isRemoved) {
    return (
      <div className={containerClass}>
        <div className="flex">
          {name !== null && <span className="mr-2 font-semibold">"{name}":</span>}
          <span>{JSON.stringify(prevData)}</span>
        </div>
      </div>
    );
  }

  const isDataObj = isObject(data);
  const isDataArr = isArray(data);

  if (isDataObj || isDataArr) {
    const isPrevObj = isObject(prevData);
    const isPrevArr = isArray(prevData);

    const keys = Array.from(new Set([
      ...Object.keys(data || {}),
      ...(isPrevObj || isPrevArr ? Object.keys(prevData || {}) : [])
    ]));

    const bracketOpen = isDataArr ? '[' : '{';
    const bracketClose = isDataArr ? ']' : '}';

    return (
      <div className={containerClass}>
        <div className="flex">
          {name !== null && <span className="mr-2 font-semibold text-blue-600 dark:text-blue-400">"{name}":</span>}
          <span className="text-gray-500 dark:text-gray-400">{bracketOpen}</span>
        </div>
        <div>
          {keys.map(key => (
            <JsonViewer 
              key={key} 
              name={key} 
              data={data[key]} 
              prevData={prevData && (isPrevObj || isPrevArr) ? prevData[key] : undefined} 
            />
          ))}
        </div>
        <div className="text-gray-500 dark:text-gray-400">{bracketClose}</div>
      </div>
    );
  }

  // Primitive value
  let valueColor = 'text-gray-800 dark:text-gray-200';
  if (typeof data === 'string') valueColor = 'text-green-600 dark:text-green-400';
  if (typeof data === 'number') valueColor = 'text-orange-500 dark:text-orange-400';
  if (typeof data === 'boolean') valueColor = 'text-purple-600 dark:text-purple-400';
  if (data === null) valueColor = 'text-gray-500 italic';

  const displayValue = typeof data === 'string' ? `"${data}"` : String(data);

  return (
    <div className={containerClass}>
      <div className="flex">
        {name !== null && <span className="mr-2 font-semibold text-blue-600 dark:text-blue-400">"{name}":</span>}
        <span className={valueColor}>{displayValue}</span>
      </div>
    </div>
  );
};

export function ContextInspector() {
  const { contextHistory, currentContextIndex, setContextIndex } = useChatStore();

  const currentData = useMemo(() => {
    if (currentContextIndex >= 0 && currentContextIndex < contextHistory.length) {
      return contextHistory[currentContextIndex].data;
    }
    return null;
  }, [contextHistory, currentContextIndex]);

  const prevData = useMemo(() => {
    if (currentContextIndex > 0 && currentContextIndex < contextHistory.length) {
      return contextHistory[currentContextIndex - 1].data;
    }
    return undefined;
  }, [contextHistory, currentContextIndex]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-neutral-900 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-950">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Agent Context</h2>
        
        {contextHistory.length > 1 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                History Scrubber
              </label>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {currentContextIndex + 1} / {contextHistory.length}
              </span>
            </div>
            <input 
              type="range" 
              min={0} 
              max={contextHistory.length - 1} 
              value={currentContextIndex}
              onChange={(e) => setContextIndex(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600"
            />
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {contextHistory.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            Waiting for context snapshots...
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-950 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 overflow-x-auto">
            <JsonViewer data={currentData} prevData={prevData} />
          </div>
        )}
      </div>
    </div>
  );
}
