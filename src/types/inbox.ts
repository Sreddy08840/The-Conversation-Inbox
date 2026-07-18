export type CustomerTier = 'VIP' | 'PRIME' | 'STANDARD';

export type EscalationReason =
  'SLA_BREACH' | 'BILLING_DISPUTE' | 'TECHNICAL_BUG' | 'NEGATIVE_SENTIMENT' | 'NONE';

export type Sentiment = 'ANGRY' | 'FRUSTRATED' | 'NEUTRAL' | 'POSITIVE';

export type TriageAction = 'CLAIM' | 'RESOLVE' | 'SNOOZE' | 'REASSIGN';

export type ConversationStatus = 'UNASSIGNED' | 'ASSIGNED' | 'SNOOZED' | 'RESOLVED';

export interface Conversation {
  id: string;
  customerName: string;
  customerTier: CustomerTier;
  lastMessage: string;
  lastMessageAt: string; // ISO Timestamp format
  waitTimeMinutes: number;
  sentiment: Sentiment;
  csatScore: number | null; // 1-5 rating, or null if not yet graded
  escalationReason: EscalationReason;
  assignedAgentId: string | null;
  status: ConversationStatus;
  urgencyScore: number;
  urgencyReason: string;
}
