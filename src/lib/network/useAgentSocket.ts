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
    setToolCall,
    setToolResult,
    updateContext,
    finishStream,
    addTraceEvent
  } = useChatStore();

  const sendMessage = useCallback((msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      addTraceEvent({ direction: 'out', payload: msg });
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
          sendMessage({ type: 'PONG', echo: msg.challenge });
          return;
        }

        const yielded = bufferRef.current.insert(msg);

        for (const yMsg of yielded) {
          switch (yMsg.type) {
            case 'TOKEN':
              appendToken(yMsg.stream_id, yMsg.text);
              break;
            case 'TOOL_CALL':
              setToolCall(yMsg.stream_id, yMsg.call_id, yMsg.tool_name, yMsg.args);
              sendMessage({ type: 'TOOL_ACK', call_id: yMsg.call_id });
              break;
            case 'TOOL_RESULT':
              setToolResult(yMsg.stream_id, yMsg.result);
              break;
            case 'CONTEXT_SNAPSHOT':
              updateContext(yMsg.data);
              break;
            case 'STREAM_END':
              finishStream(yMsg.stream_id);
              break;
            case 'ERROR':
              console.error('Server error:', yMsg.message);
              break;
          }
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
  }, [setConnectionState, appendToken, setToolCall, setToolResult, updateContext, finishStream, addTraceEvent, sendMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (wsRef.current) {
        // ✅ FIX 1: Strip the onclose listener before closing 
        // so we don't trigger a ghost reconnection!
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []); // ✅ FIX 2: Make this dependency array completely empty!

  return { sendMessage };
}
