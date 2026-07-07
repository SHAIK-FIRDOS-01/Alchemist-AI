"use client";

import React, { useMemo, useState } from 'react';
import { useChatStore } from '@/lib/store/useChatStore';

const MAX_KEYS_TO_RENDER = 50;

const JsonViewer = ({ data, prevData, name = null, initialExpand = false }: { data: unknown, prevData: unknown, name?: string | null, initialExpand?: boolean }) => {
  const isAdded = prevData === undefined && data !== undefined;
  const isRemoved = data === undefined && prevData !== undefined;

  // Safe type guards
  const isObject = (val: unknown): val is Record<string, unknown> => val !== null && typeof val === 'object' && !Array.isArray(val);
  const isArray = (val: unknown): val is Array<unknown> => Array.isArray(val);

  const isDataObj = isObject(data);
  const isDataArr = isArray(data);
  const isPrevObj = isObject(prevData);
  const isPrevArr = isArray(prevData);

  const containerClass = `pl-4 py-0.5 font-mono text-sm ${isAdded ? 'bg-green-100 dark:bg-green-900/30' : ''} ${isRemoved ? 'line-through text-red-500 bg-red-50 dark:bg-red-900/20' : ''}`;

  const [isExpanded, setIsExpanded] = useState(initialExpand || name === null);
  const [renderedKeysCount, setRenderedKeysCount] = useState(MAX_KEYS_TO_RENDER);

  if (isRemoved) {
    return (
      <div className={containerClass}>
        <div className="flex">
          {name !== null && <span className="mr-2 font-semibold">&quot;{name}&quot;:</span>}
          <span>{JSON.stringify(prevData)}</span>
        </div>
      </div>
    );
  }

  if (isDataObj || isDataArr) {
    const keys = Array.from(new Set([
      ...Object.keys(isDataObj || isDataArr ? (data as Record<string, unknown>) : {}),
      ...(isPrevObj || isPrevArr ? Object.keys(prevData as Record<string, unknown>) : [])
    ]));

    const bracketOpen = isDataArr ? '[' : '{';
    const bracketClose = isDataArr ? ']' : '}';

    const visibleKeys = keys.slice(0, renderedKeysCount);
    const hasMore = keys.length > renderedKeysCount;

    return (
      <div className={containerClass}>
        <div 
          className="flex cursor-pointer hover:opacity-80 select-none items-center" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {name !== null && (
            <span className="mr-2 font-semibold text-blue-600 dark:text-blue-400">
              <span className="inline-block w-3 text-center mr-1 text-gray-400 text-xs">
                {isExpanded ? '▼' : '▶'}
              </span>
              &quot;{name}&quot;:
            </span>
          )}
          <span className="text-gray-500 dark:text-gray-400">
            {bracketOpen} {isExpanded ? '' : ` ${keys.length} items ${bracketClose}`}
          </span>
        </div>
        {isExpanded && (
          <>
            <div>
              {visibleKeys.map(key => (
                <JsonViewer
                  key={key}
                  name={key}
                  data={(data as Record<string, unknown>)[key]}
                  prevData={prevData && (isPrevObj || isPrevArr) ? (prevData as Record<string, unknown>)[key] : undefined}
                />
              ))}
              {hasMore && (
                <div 
                  className="pl-4 py-1 text-blue-500 hover:text-blue-700 cursor-pointer text-xs font-semibold"
                  onClick={() => setRenderedKeysCount(prev => prev + MAX_KEYS_TO_RENDER)}
                >
                  Show more ({keys.length - renderedKeysCount} remaining)...
                </div>
              )}
            </div>
            <div className="text-gray-500 dark:text-gray-400">{bracketClose}</div>
          </>
        )}
      </div>
    );
  }

  // Primitive value rendering
  let valueColor = 'text-gray-800 dark:text-gray-200';
  if (typeof data === 'string') valueColor = 'text-green-600 dark:text-green-400';
  if (typeof data === 'number') valueColor = 'text-orange-500 dark:text-orange-400';
  if (typeof data === 'boolean') valueColor = 'text-purple-600 dark:text-purple-400';

  const displayValue = typeof data === 'string' ? `"${data}"` : String(data);

  return (
    <div className={containerClass}>
      <div className="flex">
        {name !== null && <span className="mr-2 font-semibold text-blue-600 dark:text-blue-400">&quot;{name}&quot;:</span>}
        <span className={valueColor}>{displayValue}</span>
      </div>
    </div>
  );
};

export function ContextInspector() {
  const contextHistory = useChatStore((state) => state.contextHistory);
  const currentContextIndex = useChatStore((state) => state.currentContextIndex);
  const activeContextId = useChatStore((state) => state.activeContextId);
  const setContextIndex = useChatStore((state) => state.setContextIndex);

  const activeContextTimeline = useMemo(() => {
    if (!activeContextId) return [];
    return contextHistory.filter(c => c.id === activeContextId);
  }, [contextHistory, activeContextId]);

  const currentData = useMemo(() => {
    if (currentContextIndex >= 0 && currentContextIndex < activeContextTimeline.length) {
      return activeContextTimeline[currentContextIndex].data;
    }
    return null;
  }, [activeContextTimeline, currentContextIndex]);

  const prevData = useMemo(() => {
    if (currentContextIndex > 0 && currentContextIndex < activeContextTimeline.length) {
      return activeContextTimeline[currentContextIndex - 1].data;
    }
    return undefined;
  }, [activeContextTimeline, currentContextIndex]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-neutral-900 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-950">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Agent Context {activeContextId ? `(${activeContextId})` : ''}
        </h2>

        {activeContextTimeline.length > 1 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                History Scrubber
              </label>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {currentContextIndex + 1} / {activeContextTimeline.length}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={activeContextTimeline.length - 1}
              value={currentContextIndex}
              onChange={(e) => setContextIndex(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeContextTimeline.length === 0 ? (
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
