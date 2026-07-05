import { useEffect, useRef, useCallback } from 'react';
import { SequenceBuffer } from './SequenceBuffer';
import { useChatStore } from '../store/useChatStore';
import { ServerMessage, ClientMessage } from '../types/protocol';

export function useAgentSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const bufferRef = useRef<SequenceBuffer>(new SequenceBuffer());
  const reconnectAttempts = useRef<number>(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    setConnectionState,
    appendToken,
    startNewMessage,
    setToolCall,
    setToolResult,
    updateContext,
    finishStream,
    addTraceEvent
  } = useChatStore();

  const sendMessage = useCallback((msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      addTraceEvent({ direction: 'out', payload: msg });
      if (msg.type === 'USER_MESSAGE') {
        bufferRef.current.reset();
      }
      wsRef.current.send(JSON.stringify(msg));
    }
  }, [addTraceEvent]);

  const connect = useCallback(() => {
    setConnectionState('connecting');
    const ws = new WebSocket('ws://localhost:4747/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      setConnectionState('connected');

      if (bufferRef.current.currentSeq > 0) {
        sendMessage({
          type: 'RESUME',
          last_seq: bufferRef.current.currentSeq
        });
      }
    };

    ws.onclose = () => {
      setConnectionState('reconnecting');
      const delay = Math.min(500 * Math.pow(2, reconnectAttempts.current), 10000);
      reconnectAttempts.current += 1;

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }

      reconnectTimeout.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;

        addTraceEvent({ direction: 'in', payload: msg });

        if (msg.type === 'PING') {
          // Handle corrupt PINGs with missing challenge safely
          sendMessage({ type: 'PONG', echo: msg.challenge || "" });
          return;
        }

        const yielded = bufferRef.current.insert(msg);

        for (const yMsg of yielded) {
          switch (yMsg.type) {
            case 'USER_MESSAGE':
              startNewMessage(yMsg.stream_id, yMsg.content);
              break;
            case 'TOKEN':
              appendToken(yMsg.stream_id, yMsg.text);
              break;
            case 'TOKEN_GROUP':
              if (yMsg.tokens && Array.isArray(yMsg.tokens)) {
                const combinedText = yMsg.tokens.join("");
                appendToken(yMsg.stream_id, combinedText);
              }
              break;
            case 'TOOL_CALL':
              setToolCall(yMsg.stream_id, yMsg.call_id, yMsg.tool_name, yMsg.args);
              sendMessage({ type: 'TOOL_ACK', call_id: yMsg.call_id });
              break;
            case 'TOOL_RESULT':
              setToolResult(yMsg.stream_id, yMsg.call_id, yMsg.result);
              break;
            case 'CONTEXT_SNAPSHOT':
              updateContext(yMsg.context_id, yMsg.data);
              break;
            case 'STREAM_END':
              finishStream(yMsg.stream_id);
              break;
            case 'ERROR':
              console.error('Server error:', yMsg.message);
              break;
            default:
              console.warn('Unhandled message type:', (yMsg as Record<string, unknown>).type, yMsg);
              break;
          }
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
  }, [setConnectionState, appendToken, setToolCall, setToolResult, updateContext, finishStream, addTraceEvent, sendMessage, startNewMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { sendMessage };
}
