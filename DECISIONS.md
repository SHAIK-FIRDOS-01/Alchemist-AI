# DECISIONS.md — Agent Console Implementation

---

## 1. Seq-Based Ordering and Deduplication

**Data structure used: `Map<number, ServerMessage>` inside a custom `SequenceBuffer` class.**

The `SequenceBuffer` class (`src/lib/network/SequenceBuffer.ts`) is the core of the networking layer. It holds a single `nextExpectedSeq` integer counter and a `Map<number, ServerMessage>` buffer for out-of-order packets.

When a message arrives via `ws.onmessage`, it is passed to `SequenceBuffer.insert()`:

- **If `message.seq < nextExpectedSeq`**: The message has already been processed (e.g., a duplicate from a reconnection replay or chaos mode's duplicate injection). It is silently dropped. This is the deduplication path.
- **If `message.seq > nextExpectedSeq`**: The message is a future packet that arrived early. It is stored in the `Map` keyed by its `seq` number. No processing happens.
- **If `message.seq === nextExpectedSeq`**: This is exactly what we expected. The message is yielded immediately. The counter is incremented, and the buffer is drained sequentially — any buffered messages whose seq values now form a contiguous chain are also yielded in order.

**Why a `Map` and not a sorted array or priority queue?**

The `Map` gives O(1) keyed access by `seq` number for both insertion and retrieval. During the drain loop (`while (this.buffer.has(this.nextExpectedSeq))`), we pick up exactly the next expected seq without iterating the entire buffer. A sorted array would require O(n log n) re-sorting on every insert. A priority queue would work similarly but add more implementation overhead for no gain, since we always drain greedily and only need the single next key.

The `currentSeq` getter (`return this.nextExpectedSeq - 1`) exposes the highest fully-processed seq to the reconnection logic, ensuring the `RESUME` message is always accurate.

---

## 2. Preventing Layout Shift During Tool Call Interruptions

**Strategy: Flat `parts` array state machine, no CSS reflow triggers.**

Each agent message in the Zustand store is represented as a `ChatMessage` with a `parts: MessagePart[]` array. A `MessagePart` is either `{ type: 'text', content: string }` or a tool call object. The `status` field on the message acts as a simple state machine: `'streaming' → 'tool_pending' → 'streaming' → 'finished'`.

When a `TOOL_CALL` event arrives mid-stream:

1. `setToolCall()` in the store **appends** a new `{ type: 'tool', ... }` part to the existing `parts` array. The preceding text part is untouched.
2. The message status changes to `'tool_pending'`.

When `TOOL_RESULT` arrives:

1. `setToolResult()` **maps over `parts`** and finds the specific tool part by `call_id`, updating only that part with the result. It does not splice, shift, or reorder parts.
2. The message status returns to `'streaming'`.

The `MessageBubble` component renders `parts` sequentially — text blocks render as `<div>` elements and tool parts render as `<ToolCallCard>` components. Because we are only ever **appending** to or **updating in-place** within the parts array, the DOM elements that were already rendered (i.e., previous text segments and previous tool cards) never get re-mounted. React's reconciliation sees stable keys and performs surgical updates only, which means zero layout shift and zero flicker.

The `ToolCallCard` has a fixed `min-height` and a loading spinner when `result` is `undefined`, so no height jump occurs when the result arrives — the card already occupies its space.

---

## 3. Reconnection and State Recovery

**How we track "consumed by DOM" vs. "received by socket":**

The `SequenceBuffer` is the source of truth for what has been consumed. A message is only considered "consumed" once it has been yielded by `SequenceBuffer.insert()` and processed by the `switch` statement in `useAgentSocket`. The `currentSeq` getter returns `nextExpectedSeq - 1`, which represents the highest seq that has passed through both the buffer and the message handler — meaning it has been committed to Zustand state and is therefore rendered.

On disconnect, the `ws.onclose` handler fires and schedules a reconnect with exponential backoff: `Math.min(500 * Math.pow(2, reconnectAttempts), 10000)`, giving delays of 500ms → 1s → 2s → 4s → ... → 10s (capped).

Critically, the `bufferRef` (holding the `SequenceBuffer`) and all Zustand state are held in React refs and a global store — they are **not** destroyed on disconnect. The WebSocket object is what gets replaced; the state persists.

On reconnection (`ws.onopen`), the very first action is to send a `RESUME` message:

```ts
if (bufferRef.current.currentSeq > 0) {
  sendMessage({ type: 'RESUME', last_seq: bufferRef.current.currentSeq });
}
```

The server then replays all events after that seq. Since `SequenceBuffer.insert()` will silently drop any seq it has already processed (`< nextExpectedSeq`), duplicate events in the replay are harmlessly discarded. Only genuinely missed events will pass through, stitching themselves into the existing DOM state.

If a drop happens mid-tool-call (after `TOOL_CALL`, before `TOOL_RESULT`), the `ToolCallCard` stays mounted in the DOM with its spinner visible. When the replayed `TOOL_RESULT` arrives after recovery, it finds the existing tool part by `call_id` and updates it in place — the user sees the result appear with no visual discontinuity.

---

## 4. Handling 50 Concurrent Agent Streams (Operations Dashboard)

The current architecture uses a single flat `messages: ChatMessage[]` array in Zustand, keyed by `stream_id`. This works for a sequential chat but would become a bottleneck for 50 concurrent streams because:

- Every `appendToken` call iterates the entire message array to find the target by `stream_id` (`findIndex`).
- Every token across any of the 50 streams triggers a full Zustand state update, which could re-render subscribed components broadly.

**Changes I would make:**

1. **Shard state by `stream_id`**: Replace `messages: ChatMessage[]` with `messages: Record<string, ChatMessage>` (a map). `appendToken` would then be an O(1) lookup instead of O(n) scan.
2. **Per-stream Zustand slices or atoms**: Use `zustand/context` with one store per stream, or migrate to `jotai` with per-stream atoms. This scopes re-renders so that a token arriving on stream #12 does not re-render stream #37's chat panel.
3. **Virtualize the dashboard**: A grid of 50 panels would require virtualizing streams that are off-screen to keep the DOM lightweight.
4. **One `SequenceBuffer` per stream**: Currently the buffer is global per connection. For 50 streams, each stream would need its own buffer instance and `nextExpectedSeq` counter since their seq spaces would be independent.
5. **Web Worker for message processing**: Offload the sequence buffering, deduplication, and JSON parsing to a Web Worker, communicating processed events to the main thread via `postMessage` to avoid blocking the render loop during bursts.

---

## 5. Handling 100x Longer Agent Responses (Document Generation)

The current rendering strategy — appending tokens to a `content` string in a single `<div>` — works for chat but would produce a massive, unvirtualized DOM node for a full document. The chat panel would freeze on large text because every token append triggers React to diff a large string.

**Changes I would make:**

1. **Chunk-level virtualisation**: Instead of one `{ type: 'text', content: string }` part that grows unboundedly, split the text into fixed-size chunks (e.g., 500 tokens each). Render only the chunks currently in the viewport using a virtual scroller (e.g., `@tanstack/react-virtual`). New tokens always append to the last chunk.
2. **Markdown streaming renderer**: For document generation, the output is likely Markdown. Use an incremental Markdown parser that emits rendered blocks (headings, paragraphs, code blocks) as discrete DOM nodes rather than one giant string, making virtualisation trivial.
3. **Deferred rendering with `requestIdleCallback`**: Instead of updating React state on every token, batch tokens in a local ref and flush to Zustand state during browser idle time. This decouples the 30–80ms socket rate from the 16ms frame budget.
4. **Context Inspector lazy-loading**: The 500KB `CONTEXT_SNAPSHOT` in chaos mode already exercises this, and the `MAX_KEYS_TO_RENDER` pagination in `ContextInspector.tsx` handles it. For 100x document-length context, I would additionally only mount the inspector panel when explicitly opened by the user, and use `React.lazy` for the JSON tree renderer.
5. **Immutable text storage**: Store the full text in a flat `Uint8Array` or plain string ref (not React state), and only store a "render cursor" position in React state. The component reads from the ref up to the cursor position. This avoids React having to diff megabytes of text on every token.
