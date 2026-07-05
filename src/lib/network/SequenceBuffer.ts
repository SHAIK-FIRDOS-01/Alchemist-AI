import { ServerMessage } from '../types/protocol';

export class SequenceBuffer {
  private nextExpectedSeq: number = 1;
  private buffer: Map<number, ServerMessage> = new Map();

  public insert(message: ServerMessage): ServerMessage[] {
    // Drop already processed sequences (deduplication from reconnects or duplicate deliveries)
    if (message.seq < this.nextExpectedSeq) {
      return [];
    }

    // Buffer future sequences
    if (message.seq > this.nextExpectedSeq) {
      if (!this.buffer.has(message.seq)) {
        this.buffer.set(message.seq, message);
      }
      return [];
    }

    // Exact match, start yielding
    const yielded: ServerMessage[] = [message];
    this.nextExpectedSeq++;

    // Yield any buffered messages that are now in sequence
    while (this.buffer.has(this.nextExpectedSeq)) {
      const bufferedMessage = this.buffer.get(this.nextExpectedSeq)!;
      this.buffer.delete(this.nextExpectedSeq);
      yielded.push(bufferedMessage);
      this.nextExpectedSeq++;
    }

    return yielded;
  }

  public get currentSeq(): number {
    return this.nextExpectedSeq - 1;
  }

  public reset(): void {
    this.buffer.clear();
    this.nextExpectedSeq = 1;
  }
}
