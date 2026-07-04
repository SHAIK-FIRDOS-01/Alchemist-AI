import { create } from 'zustand';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface ChatMessage {
  id: string; // usually the stream_id or a unique UUID for user messages
  role: 'user' | 'agent';
  text: string;
  status: 'streaming' | 'tool_pending' | 'finished';
  toolData?: {
    call_id: string;
    name: string;
    args: Record<string, unknown>;
    result?: Record<string, unknown>;
  };
}

interface ChatState {
  connectionState: ConnectionState;
  messages: ChatMessage[];
  contextSnapshot: Record<string, unknown> | null;
  contextHistory: Array<{ id: string; timestamp: number; data: Record<string, unknown> }>;
  currentContextIndex: number;
  traceEvents: Array<{ id: string; timestamp: number; direction: 'in' | 'out'; payload: Record<string, unknown> }>;
  setConnectionState: (state: ConnectionState) => void;
  addTraceEvent: (event: { direction: 'in' | 'out'; payload: Record<string, unknown> }) => void;
  addUserMessage: (content: string) => void;
  appendToken: (stream_id: string, text: string) => void;
  setToolCall: (stream_id: string, call_id: string, tool_name: string, args: Record<string, unknown>) => void;
  setToolResult: (stream_id: string, result: Record<string, unknown>) => void;
  finishStream: (stream_id: string) => void;
  updateContext: (data: Record<string, unknown>) => void;
  setContextIndex: (index: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  connectionState: 'disconnected',
  messages: [],
  contextSnapshot: null,
  contextHistory: [],
  currentContextIndex: -1,
  traceEvents: [],

  addTraceEvent: (event) => set((state) => ({
    traceEvents: [
      ...state.traceEvents,
      {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        direction: event.direction,
        payload: event.payload
      }
    ]
  })),

  setConnectionState: (state) => set({ connectionState: state }),

  addUserMessage: (content: string) => set((state) => ({
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text: content,
        status: 'finished',
      }
    ]
  })),

  appendToken: (stream_id, text) => set((state) => {
    const existingIndex = state.messages.findIndex(m => m.id === stream_id);
    if (existingIndex !== -1) {
      const newMessages = [...state.messages];
      newMessages[existingIndex] = {
        ...newMessages[existingIndex],
        text: newMessages[existingIndex].text + text
      };
      return { messages: newMessages };
    } else {
      return {
        messages: [
          ...state.messages,
          {
            id: stream_id,
            role: 'agent',
            text: text,
            status: 'streaming'
          }
        ]
      };
    }
  }),

  setToolCall: (stream_id, call_id, tool_name, args) => set((state) => {
    const existingIndex = state.messages.findIndex(m => m.id === stream_id);
    if (existingIndex !== -1) {
      const newMessages = [...state.messages];
      newMessages[existingIndex] = {
        ...newMessages[existingIndex],
        status: 'tool_pending',
        toolData: {
          call_id,
          name: tool_name,
          args
        }
      };
      return { messages: newMessages };
    }
    return state;
  }),

  setToolResult: (stream_id, result) => set((state) => {
    const existingIndex = state.messages.findIndex(m => m.id === stream_id);
    if (existingIndex !== -1) {
      const existingMessage = state.messages[existingIndex];
      const newMessages = [...state.messages];
      newMessages[existingIndex] = {
        ...existingMessage,
        status: 'streaming',
        toolData: existingMessage.toolData ? {
          ...existingMessage.toolData,
          result
        } : undefined
      };
      return { messages: newMessages };
    }
    return state;
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
    }
    return state;
  }),

  updateContext: (data: Record<string, unknown>) => set((state) => {
    const newHistory = [
      ...state.contextHistory,
      { id: crypto.randomUUID(), timestamp: Date.now(), data }
    ];
    return {
      contextSnapshot: data,
      contextHistory: newHistory,
      currentContextIndex: newHistory.length - 1
    };
  }),

  setContextIndex: (index) => set({ currentContextIndex: index }),
}));
