

// src/lib/types/protocol.ts

// ==========================================
// CLIENT -> SERVER MESSAGES
// ==========================================
export type ClientMessage =
    | { type: "USER_MESSAGE"; content: string }
    | { type: "PONG"; echo: string }
    | { type: "RESUME"; last_seq: number }
    | { type: "TOOL_ACK"; call_id: string };

// ==========================================
// SERVER -> CLIENT MESSAGES
// ==========================================
export type ServerTokenEvent = {
    type: "TOKEN";
    seq: number;
    text: string;
    stream_id: string;
};

export type ServerToolCallEvent = {
    type: "TOOL_CALL";
    seq: number;
    call_id: string;
    tool_name: string;
    args: Record<string, unknown>;
    stream_id: string;
};

export type ServerToolResultEvent = {
    type: "TOOL_RESULT";
    seq: number;
    call_id: string;
    result: Record<string, unknown>;
    stream_id: string;
};

export type ServerContextEvent = {
    type: "CONTEXT_SNAPSHOT";
    seq: number;
    context_id: string;
    data: Record<string, unknown>;
};

export type ServerPingEvent = {
    type: "PING";
    seq: number;
    challenge: string;
};

export type ServerStreamEndEvent = {
    type: "STREAM_END";
    seq: number;
    stream_id: string;
};

export type ServerErrorEvent = {
    type: "ERROR";
    seq: number;
    code: string;
    message: string;
};

export type ServerTokenGroupEvent = {
    type: "TOKEN_GROUP";
    seq: number;
    tokens: string[];
    stream_id: string;
};

export type ServerUserMessageEvent = {
    type: "USER_MESSAGE";
    seq: number;
    content: string;
    stream_id: string;
};

export type ServerMessage =
    | ServerTokenEvent
    | ServerTokenGroupEvent
    | ServerToolCallEvent
    | ServerToolResultEvent
    | ServerContextEvent
    | ServerPingEvent
    | ServerStreamEndEvent
    | ServerErrorEvent
    | ServerUserMessageEvent;
