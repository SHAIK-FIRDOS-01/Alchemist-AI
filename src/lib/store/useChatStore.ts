import { create } from 'zustand';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type MessagePart =
  | { type: 'text'; content: string }
  | { type: 'tool'; call_id: string; name: string; args: Record<string, unknown>; result?: Record<string, unknown> };

export interface ChatMessage {
  id: string; // usually the stream_id or a unique UUID for user messages
  role: 'user' | 'agent';
  parts: MessagePart[];
  status: 'streaming' | 'tool_pending' | 'finished';
}

export interface TraceEvent {
  id: string;
  timestamp: number;
  direction: 'in' | 'out';
  payload: Record<string, unknown>;
  isGroup: boolean;
  groupCount?: number;
}

interface ChatState {
  connectionState: ConnectionState;
  messages: ChatMessage[];
  contextSnapshot: Record<string, unknown> | null;
  contextHistory: Array<{ id: string; timestamp: number; data: Record<string, unknown> }>;
  currentContextIndex: number;
  traceEvents: TraceEvent[];
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
  setConnectionState: (state: ConnectionState) => void;
  addTraceEvent: (event: { direction: 'in' | 'out'; payload: Record<string, unknown> }) => void;
  addUserMessage: (content: string) => void;
  startNewMessage: (stream_id: string, content: string) => void;
  appendToken: (stream_id: string, text: string) => void;
  setToolCall: (stream_id: string, call_id: string, tool_name: string, args: Record<string, unknown>) => void;
  setToolResult: (stream_id: string, call_id: string, result: Record<string, unknown>) => void;
  finishStream: (stream_id: string) => void;
  updateContext: (context_id: string, data: Record<string, unknown>) => void;
  setContextIndex: (index: number) => void;
  activeContextId: string | null;
  setActiveContextId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  connectionState: 'disconnected',
  messages: [],
  contextSnapshot: null,
  contextHistory: [],
  currentContextIndex: -1,
  activeContextId: null,
  traceEvents: [],
  highlightedId: null,

  setActiveContextId: (id) => set({ activeContextId: id }),
  setHighlightedId: (id) => set({ highlightedId: id }),

  addTraceEvent: (event) => set((state) => {
    const newEvent: TraceEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      direction: event.direction,
      payload: event.payload,
      isGroup: false
    };

    const payload = event.payload as { type?: string; stream_id?: string; text?: string };

    if (payload.type === 'TOKEN' && event.direction === 'in') {
      const lastEvent = state.traceEvents[state.traceEvents.length - 1];

      if (lastEvent && lastEvent.isGroup) {
        const lastPayload = lastEvent.payload as { type?: string; stream_id?: string; tokens?: string[] };
        if (lastPayload.type === 'TOKEN_GROUP' && lastPayload.stream_id === payload.stream_id) {
          // Append to existing group
          const newTraceEvents = [...state.traceEvents];
          const updatedGroup = { ...lastEvent, groupCount: (lastEvent.groupCount || 1) + 1 };
          updatedGroup.payload = {
            ...lastEvent.payload,
            tokens: [...(lastPayload.tokens || []), payload.text]
          };
          newTraceEvents[newTraceEvents.length - 1] = updatedGroup;
          return { traceEvents: newTraceEvents };
        }
      }

      // Start new group
      newEvent.isGroup = true;
      newEvent.groupCount = 1;
      newEvent.payload = { type: 'TOKEN_GROUP', stream_id: payload.stream_id, tokens: [payload.text] };
      return { traceEvents: [...state.traceEvents, newEvent] };
    }

    return { traceEvents: [...state.traceEvents, newEvent] };
  }),

  setConnectionState: (state) => set({ connectionState: state }),

  addUserMessage: (content: string) => set((state) => ({
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        parts: [{ type: 'text', content }],
        status: 'finished',
      }
    ]
  })),

  startNewMessage: (stream_id: string, content: string) => set((state) => ({
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        parts: [{ type: 'text', content }],
        status: 'finished',
      },
      {
        id: stream_id,
        role: 'agent',
        parts: [],
        status: 'streaming',
      }
    ]
  })),

  appendToken: (stream_id, text) => set((state) => {
    const existingIndex = state.messages.findIndex(m => m.id === stream_id);
    if (existingIndex !== -1) {
      const newMessages = [...state.messages];
      const existingMessage = newMessages[existingIndex];
      const parts = [...existingMessage.parts];

      if (parts.length > 0 && parts[parts.length - 1].type === 'text') {
        const lastPart = parts[parts.length - 1] as { type: 'text'; content: string };
        parts[parts.length - 1] = { ...lastPart, content: lastPart.content + text };
      } else {
        parts.push({ type: 'text', content: text });
      }

      newMessages[existingIndex] = {
        ...existingMessage,
        parts
      };
      return { messages: newMessages };
    } else {
      return {
        messages: [
          ...state.messages,
          {
            id: stream_id,
            role: 'agent',
            parts: [{ type: 'text', content: text }],
            status: 'streaming'
          }
        ]
      };
    }
  }),

  setToolCall: (stream_id, call_id, tool_name, args) => set((state) => {
    const existingIndex = state.messages.findIndex(m => m.id === stream_id);
    const newToolCall: MessagePart = { type: 'tool', call_id, name: tool_name, args };
    if (existingIndex !== -1) {
      const newMessages = [...state.messages];
      const existingMessage = newMessages[existingIndex];
      newMessages[existingIndex] = {
        ...existingMessage,
        status: 'tool_pending',
        parts: [...existingMessage.parts, newToolCall]
      };
      return { messages: newMessages };
    } else {
      return {
        messages: [
          ...state.messages,
          {
            id: stream_id,
            role: 'agent',
            parts: [newToolCall],
            status: 'tool_pending',
          }
        ]
      };
    }
  }),

  setToolResult: (stream_id, call_id, result) => set((state) => {
    const existingIndex = state.messages.findIndex(m => m.id === stream_id);
    if (existingIndex !== -1) {
      const newMessages = [...state.messages];
      const existingMessage = newMessages[existingIndex];

      const parts = existingMessage.parts.map(part => {
        if (part.type === 'tool' && part.call_id === call_id) {
          return { ...part, result };
        }
        return part;
      });

      newMessages[existingIndex] = {
        ...existingMessage,
        status: 'streaming',
        parts
      };
      return { messages: newMessages };
    } else {
      return {
        messages: [
          ...state.messages,
          {
            id: stream_id,
            role: 'agent',
            parts: [{
              type: 'tool',
              call_id: call_id,
              name: 'unknown_tool',
              args: {},
              result
            }],
            status: 'streaming',
          }
        ]
      };
    }
  }),

  finishStream: (stream_id) => set((state) => {
    const existingIndex = state.messages.findIndex(m => m.id === stream_id);
    if (existingIndex !== -1) {
      const newMessages = [...state.messages];
      newMessages[existingIndex] = {
        ...newMessages[existingIndex],
        status: 'finished'
      };
      return { messages: newMessages };
    } else {
      return {
        messages: [
          ...state.messages,
          {
            id: stream_id,
            role: 'agent',
            parts: [],
            status: 'finished'
          }
        ]
      };
    }
  }),

  updateContext: (context_id: string, incomingData: Record<string, unknown>) => set((state) => {
    // Find the LAST snapshot for this specific context_id to use as base for merge
    const prevSnapshots = state.contextHistory.filter(c => c.id === context_id);
    const prevData = prevSnapshots.length > 0
      ? prevSnapshots[prevSnapshots.length - 1].data
      : {};

    const mergedData = { ...prevData, ...incomingData };

    // Always append to history, do not overwrite, so we can step backward
    const newHistory = [
      ...state.contextHistory,
      { id: context_id, timestamp: Date.now(), data: mergedData }
    ];

    // Filter to find the new index specifically within this context's timeline
    const contextTimeline = newHistory.filter(c => c.id === context_id);
    const newIndex = contextTimeline.length - 1;

    return {
      contextSnapshot: mergedData,
      contextHistory: newHistory,
      currentContextIndex: newIndex,
      activeContextId: context_id
    };
  }),

  setContextIndex: (index) => set({ currentContextIndex: index }),
}));
