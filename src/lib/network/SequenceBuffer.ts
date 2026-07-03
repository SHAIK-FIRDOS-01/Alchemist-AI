import { ServerMessage } from '../types/protocol';

export class SequenceBuffer {
  private nextExpectedSeq: number = 1;
  private buffer: Map<number, ServerMessage> = new Map();

  public insert(message: ServerMessage): ServerMessage[] {
    if (message.seq < this.nextExpectedSeq) {
      return [];
    }

    if (message.seq > this.nextExpectedSeq) {
      this.buffer.set(message.seq, message);
      return [];
    }

    const yielded: ServerMessage[] = [message];
    this.nextExpectedSeq++;

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
