import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { SequenceBuffer } from './SequenceBuffer';
import { ServerMessage } from '../types/protocol';

describe('SequenceBuffer', () => {
  const createMockToken = (seq: number, text: string): ServerMessage => ({
    type: 'TOKEN',
    seq,
    text,
    stream_id: 'test'
  });

  it('should handle in-order sequences', () => {
    const buffer = new SequenceBuffer();
    const result1 = buffer.insert(createMockToken(1, 'A'));
    const result2 = buffer.insert(createMockToken(2, 'B'));
    
    assert.deepStrictEqual(result1.map(m => m.seq), [1]);
    assert.deepStrictEqual(result2.map(m => m.seq), [2]);
    assert.strictEqual(buffer.currentSeq, 2);
  });

  it('should buffer out-of-order sequences and yield them when missing seq arrives', () => {
    const buffer = new SequenceBuffer();
    
    // seq 2 and 3 arrive early
    const result2 = buffer.insert(createMockToken(2, 'B'));
    const result3 = buffer.insert(createMockToken(3, 'C'));
    
    assert.deepStrictEqual(result2, []);
    assert.deepStrictEqual(result3, []);
    assert.strictEqual(buffer.currentSeq, 0); // Still waiting for 1

    // seq 1 arrives, should flush 1, 2, 3
    const result1 = buffer.insert(createMockToken(1, 'A'));
    assert.deepStrictEqual(result1.map(m => m.seq), [1, 2, 3]);
    assert.strictEqual(buffer.currentSeq, 3);
  });

  it('should deduplicate duplicate sequences', () => {
    const buffer = new SequenceBuffer();
    
    const result1 = buffer.insert(createMockToken(1, 'A'));
    const result1dup = buffer.insert(createMockToken(1, 'A'));
    
    assert.deepStrictEqual(result1.map(m => m.seq), [1]);
    assert.deepStrictEqual(result1dup, []);
    assert.strictEqual(buffer.currentSeq, 1);
  });

  it('should handle fully reversed sequences', () => {
    const buffer = new SequenceBuffer();
    
    const r5 = buffer.insert(createMockToken(5, 'E'));
    const r4 = buffer.insert(createMockToken(4, 'D'));
    const r3 = buffer.insert(createMockToken(3, 'C'));
    const r2 = buffer.insert(createMockToken(2, 'B'));
    
    assert.deepStrictEqual(r5, []);
    assert.deepStrictEqual(r4, []);
    assert.deepStrictEqual(r3, []);
    assert.deepStrictEqual(r2, []);
    
    const r1 = buffer.insert(createMockToken(1, 'A'));
    assert.deepStrictEqual(r1.map(m => m.seq), [1, 2, 3, 4, 5]);
    assert.strictEqual(buffer.currentSeq, 5);
  });

  it('should reset properly', () => {
    const buffer = new SequenceBuffer();
    buffer.insert(createMockToken(2, 'B'));
    buffer.reset();
    
    assert.strictEqual(buffer.currentSeq, 0);
    const result = buffer.insert(createMockToken(1, 'A'));
    assert.deepStrictEqual(result.map(m => m.seq), [1]);
  });
});
