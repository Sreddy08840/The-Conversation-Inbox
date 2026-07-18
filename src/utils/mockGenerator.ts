import type {
  Conversation,
  CustomerTier,
  EscalationReason,
  Sentiment,
  ConversationStatus,
  Message,
} from '../types/inbox';
import { calculateUrgency } from './urgency';

const CUSTOMERS = [
  'Emma Watson',
  'Liam Neeson',
  'Olivia Rodrigo',
  'Noah Centineo',
  'Ava DuVernay',
  'Sophia Loren',
  'Jackson Pollock',
  'Isabella Rossellini',
  'Lucas Hedges',
  'Mia Farrow',
  'Oliver Stone',
  'Charlotte Bronte',
  'Amara Okafor',
  'Hiroshi Tanaka',
  'Mateo Silva',
  'Elena Rostova',
  'Aisha Bello',
  'Carlos Mendez',
  'Zoe Kravitz',
  'Leo Tolstoy',
];

const MESSAGES_BY_SENTIMENT: Record<Sentiment, string[]> = {
  ANGRY: [
    'My system is down and I am losing $10k per hour! Fix this immediately!',
    'I have been waiting for over an hour. This is the worst service ever.',
    'You billed me twice! If I do not get a refund today I will cancel and sue!',
    'Why is my SLA being ignored? I demand to speak to a manager right now!',
  ],
  FRUSTRATED: [
    'I keep getting an error when I try to save the dashboard. It worked yesterday.',
    'The checkout page is loading extremely slowly. Can someone look into it?',
    "I sent an email yesterday but haven't received a confirmation yet.",
    'Your billing instructions are very confusing. I need someone to walk me through this.',
  ],
  NEUTRAL: [
    'Hi, could you tell me how to export my data to CSV?',
    'What are the pricing details for the Enterprise plan?',
    'Just checking if my account verification has gone through.',
    'Where can I find the API documentation for webhook integration?',
  ],
  POSITIVE: [
    'Thank you so much! The new update solved all my issues.',
    'Awesome support, you guys are super fast!',
    'I really love the clean interface you built. Good job!',
    'Perfect, that answers my question. Have a great day!',
  ],
};

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates an array of 30 to 60 realistic Conversation records.
 */
export function generateMockConversations(count = 45): Conversation[] {
  const conversations: Conversation[] = [];

  for (let i = 0; i < count; i++) {
    const id = `conv-${1000 + i}`;
    const customerName = getRandomElement(CUSTOMERS) + ` (${getRandomInt(10, 99)})`; // Add number to ensure uniqueness

    // Weighted distribution: 15% VIP, 35% PRIME, 50% STANDARD
    const tierRoll = Math.random();
    const customerTier: CustomerTier =
      tierRoll < 0.15 ? 'VIP' : tierRoll < 0.5 ? 'PRIME' : 'STANDARD';

    // Weighted sentiment: ANGRY (15%), FRUSTRATED (25%), NEUTRAL (45%), POSITIVE (15%)
    const sentimentRoll = Math.random();
    const sentiment: Sentiment =
      sentimentRoll < 0.15
        ? 'ANGRY'
        : sentimentRoll < 0.4
          ? 'FRUSTRATED'
          : sentimentRoll < 0.85
            ? 'NEUTRAL'
            : 'POSITIVE';

    // Weighted escalation:
    // SLA_BREACH is likely if wait time is high, NEGATIVE_SENTIMENT if angry, etc.
    let escalationReason: EscalationReason = 'NONE';
    const waitTimeMinutes = getRandomInt(0, 50);

    if (waitTimeMinutes > 30 && Math.random() < 0.7) {
      escalationReason = 'SLA_BREACH';
    } else if (sentiment === 'ANGRY' && Math.random() < 0.6) {
      escalationReason = 'NEGATIVE_SENTIMENT';
    } else {
      const escRoll = Math.random();
      if (escRoll < 0.08) escalationReason = 'BILLING_DISPUTE';
      else if (escRoll < 0.16) escalationReason = 'TECHNICAL_BUG';
    }

    const lastMessage = getRandomElement(MESSAGES_BY_SENTIMENT[sentiment]);

    // CSAT Score: Standard 1-5. Low CSAT is more common for Angry/Frustrated clients.
    let csatScore: number | null = null;
    if (Math.random() < 0.4) {
      // 40% chance of having a CSAT rating
      if (sentiment === 'ANGRY') csatScore = getRandomInt(1, 2);
      else if (sentiment === 'FRUSTRATED') csatScore = getRandomInt(2, 3);
      else if (sentiment === 'POSITIVE') csatScore = getRandomInt(4, 5);
      else csatScore = getRandomInt(3, 5);
    }

    // Status: 70% UNASSIGNED, 15% SNOOZED, 10% ASSIGNED, 5% RESOLVED
    const statusRoll = Math.random();
    let status: ConversationStatus = 'UNASSIGNED';
    let assignedAgentId: string | null = null;

    if (statusRoll < 0.05) {
      status = 'RESOLVED';
    } else if (statusRoll < 0.15) {
      status = 'ASSIGNED';
      assignedAgentId = 'agent-1';
    } else if (statusRoll < 0.3) {
      status = 'SNOOZED';
    }

    // Compute timestamp based on waitTimeMinutes ago
    const lastMessageAt = new Date(Date.now() - waitTimeMinutes * 60 * 1000).toISOString();

    const cleanCustomerName = customerName.split(' (')[0];
    const customerEmail = `${cleanCustomerName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
    const customerPhone = `+1 (555) 01${getRandomInt(10, 99)}-${getRandomInt(1000, 9999)}`;

    const messages: Message[] = [];
    const baseTime = Date.now() - waitTimeMinutes * 60 * 1000;

    // Message 1: Customer initial check-in (10 mins before last message)
    messages.push({
      id: `${id}-msg-1`,
      sender: 'CUSTOMER',
      text: 'Hi there, I have an issue that I need help with.',
      createdAt: new Date(baseTime - 10 * 60 * 1000).toISOString(),
    });

    // Message 2: System auto-response
    messages.push({
      id: `${id}-msg-2`,
      sender: 'SYSTEM',
      text: 'Automated: Thank you for contacting support. A CX agent has been notified.',
      createdAt: new Date(baseTime - 9 * 60 * 1000).toISOString(),
    });

    // Message 3: Customer's actual issue (last message)
    messages.push({
      id: `${id}-msg-3`,
      sender: 'CUSTOMER',
      text: lastMessage,
      createdAt: new Date(baseTime).toISOString(),
    });

    // Optional follow-ups based on status
    if (status === 'ASSIGNED') {
      messages.push({
        id: `${id}-msg-4`,
        sender: 'AGENT',
        text: 'Hello! I am claiming this ticket and looking into this issue for you right now.',
        createdAt: new Date(baseTime + 2 * 60 * 1000).toISOString(),
      });
    } else if (status === 'SNOOZED') {
      messages.push({
        id: `${id}-msg-4`,
        sender: 'AGENT',
        text: 'I have escalated this to our level 2 team. I will snooze this until we receive their feedback.',
        createdAt: new Date(baseTime + 5 * 60 * 1000).toISOString(),
      });
    } else if (status === 'RESOLVED') {
      messages.push({
        id: `${id}-msg-4`,
        sender: 'AGENT',
        text: 'I have processed the update. The issue should be fully resolved now.',
        createdAt: new Date(baseTime + 15 * 60 * 1000).toISOString(),
      });
      messages.push({
        id: `${id}-msg-5`,
        sender: 'SYSTEM',
        text: 'System: Conversation marked as resolved.',
        createdAt: new Date(baseTime + 15 * 60 * 1000 + 1000).toISOString(),
      });
    }

    const baseConv: Omit<Conversation, 'urgencyScore' | 'urgencyReason'> = {
      id,
      customerName,
      customerTier,
      customerEmail,
      customerPhone,
      lastMessage,
      lastMessageAt,
      waitTimeMinutes,
      sentiment,
      csatScore,
      escalationReason,
      assignedAgentId,
      status,
      messages,
    };

    const { score: urgencyScore, reason: urgencyReason } = calculateUrgency(baseConv);

    conversations.push({
      ...baseConv,
      urgencyScore,
      urgencyReason,
    });
  }

  // Return conversations sorted by urgencyScore descending, so priority is default order
  return conversations.sort((a, b) => b.urgencyScore - a.urgencyScore);
}
