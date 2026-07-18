import type { Conversation } from '../types/inbox';

export interface UrgencyResult {
  score: number;
  reason: string;
}

/**
 * Pure, unit-testable urgency scoring function.
 * Calculates urgency score based on sentiment, wait time, customer tier, CSAT drops, and escalation reason.
 * Constructs a readable, compact explanation chip string.
 */
export function calculateUrgency(
  conversation: Omit<Conversation, 'urgencyScore' | 'urgencyReason'>
): UrgencyResult {
  let score = 0;
  const reasonParts: string[] = [];

  // 1. Escalation Reason
  switch (conversation.escalationReason) {
    case 'SLA_BREACH':
      score += 50;
      reasonParts.push('SLA Breach');
      break;
    case 'BILLING_DISPUTE':
      score += 20;
      reasonParts.push('Billing');
      break;
    case 'TECHNICAL_BUG':
      score += 15;
      reasonParts.push('Bug');
      break;
    case 'NEGATIVE_SENTIMENT':
      score += 10;
      reasonParts.push('Escalated');
      break;
    case 'NONE':
    default:
      break;
  }

  // 2. Sentiment
  switch (conversation.sentiment) {
    case 'ANGRY':
      score += 40;
      reasonParts.push('Angry');
      break;
    case 'FRUSTRATED':
      score += 20;
      reasonParts.push('Frustrated');
      break;
    case 'NEUTRAL':
      break;
    case 'POSITIVE':
      score -= 10;
      break;
  }

  // 3. CSAT Drop (Score below 3 is a threat, adds to urgency)
  if (conversation.csatScore !== null && conversation.csatScore < 3) {
    score += 25;
    reasonParts.push('Low CSAT');
  }

  // 4. Wait Time: 1.5 points per minute, capped at 60 points (40 mins)
  const waitPoints = Math.min(conversation.waitTimeMinutes * 1.5, 60);
  score += waitPoints;
  if (conversation.waitTimeMinutes > 0) {
    reasonParts.push(`waited ${conversation.waitTimeMinutes}m`);
  }

  // 5. Customer Tier
  switch (conversation.customerTier) {
    case 'VIP':
      score += 30;
      reasonParts.push('VIP');
      break;
    case 'PRIME':
      score += 15;
      reasonParts.push('Prime');
      break;
    case 'STANDARD':
    default:
      break;
  }

  // Build the unified description string
  const reason = reasonParts.length > 0 ? reasonParts.join(' · ') : 'Normal';
  const finalScore = Math.max(0, Math.round(score));

  return {
    score: finalScore,
    reason,
  };
}

/**
 * Maps the calculated numeric urgency score to a 3-step urgency tier: calm -> elevated -> critical
 */
export function getUrgencyTier(score: number): 'calm' | 'elevated' | 'critical' {
  if (score >= 80) return 'critical';
  if (score >= 40) return 'elevated';
  return 'calm';
}
