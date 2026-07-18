import { describe, it, expect } from 'vitest';
import { calculateUrgency, getUrgencyTier } from './urgency';
import type { Conversation } from '../types/inbox';

// Helper to create a base mock conversation skeleton
function createMockConversation(
  overrides: Partial<Omit<Conversation, 'urgencyScore' | 'urgencyReason'>> = {}
): Omit<Conversation, 'urgencyScore' | 'urgencyReason'> {
  return {
    id: 'conv-1',
    customerName: 'Test Customer',
    customerTier: 'STANDARD',
    lastMessage: 'Hello there',
    lastMessageAt: new Date().toISOString(),
    waitTimeMinutes: 0,
    sentiment: 'NEUTRAL',
    csatScore: null,
    escalationReason: 'NONE',
    assignedAgentId: null,
    status: 'UNASSIGNED',
    messages: [],
    ...overrides,
  };
}

describe('calculateUrgency', () => {
  it('should score a standard, calm conversation as 0 and Normal', () => {
    const conv = createMockConversation({
      sentiment: 'POSITIVE',
      customerTier: 'STANDARD',
      waitTimeMinutes: 0,
    });
    const result = calculateUrgency(conv);
    expect(result.score).toBe(0); // 0 - 10 = -10, clamped to 0
    expect(result.reason).toBe('Normal');
  });

  it('should score a VIP with positive sentiment correctly', () => {
    const conv = createMockConversation({
      customerTier: 'VIP',
      sentiment: 'POSITIVE',
      waitTimeMinutes: 0,
    });
    const result = calculateUrgency(conv);
    expect(result.score).toBe(20); // 30 - 10 = 20
    expect(result.reason).toBe('VIP');
  });

  it('should cap wait time points at 60', () => {
    const conv1 = createMockConversation({
      waitTimeMinutes: 40, // 40 * 1.5 = 60
    });
    const conv2 = createMockConversation({
      waitTimeMinutes: 100, // should cap at 60
    });

    const res1 = calculateUrgency(conv1);
    const res2 = calculateUrgency(conv2);

    expect(res1.score).toBe(60);
    expect(res2.score).toBe(60);
    expect(res1.reason).toBe('waited 40m');
    expect(res2.reason).toBe('waited 100m');
  });

  it('should add points for low CSAT score (< 3)', () => {
    const conv = createMockConversation({
      csatScore: 2,
    });
    const result = calculateUrgency(conv);
    expect(result.score).toBe(25);
    expect(result.reason).toContain('Low CSAT');
  });

  it('should not add points for high CSAT score (>= 3)', () => {
    const conv = createMockConversation({
      csatScore: 4,
    });
    const result = calculateUrgency(conv);
    expect(result.score).toBe(0);
    expect(result.reason).not.toContain('Low CSAT');
  });

  it('should calculate complex combinations correctly and construct the reason chip', () => {
    const conv = createMockConversation({
      customerTier: 'VIP', // +30
      sentiment: 'ANGRY', // +40
      waitTimeMinutes: 10, // +15
      escalationReason: 'SLA_BREACH', // +50
    });
    const result = calculateUrgency(conv);
    expect(result.score).toBe(135); // 50 + 40 + 15 + 30 = 135
    expect(result.reason).toBe('SLA Breach · Angry · waited 10m · VIP');
  });
});

describe('getUrgencyTier', () => {
  it('should return calm for scores below 40', () => {
    expect(getUrgencyTier(0)).toBe('calm');
    expect(getUrgencyTier(39)).toBe('calm');
  });

  it('should return elevated for scores between 40 and 79', () => {
    expect(getUrgencyTier(40)).toBe('elevated');
    expect(getUrgencyTier(79)).toBe('elevated');
  });

  it('should return critical for scores 80 and above', () => {
    expect(getUrgencyTier(80)).toBe('critical');
    expect(getUrgencyTier(120)).toBe('critical');
  });
});
