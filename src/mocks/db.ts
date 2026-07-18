import { generateMockConversations } from '../utils/mockGenerator';
import type { Conversation } from '../types/inbox';

// Live in-memory dataset that persists across reload/interaction requests
let conversations: Conversation[] = generateMockConversations(45);

export const db = {
  getConversations(): Conversation[] {
    // Keep them sorted by urgencyScore descending
    return [...conversations].sort((a, b) => b.urgencyScore - a.urgencyScore);
  },

  getConversation(id: string): Conversation | undefined {
    return conversations.find((c) => c.id === id);
  },

  claim(id: string, agentId: string): Conversation | undefined {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      conv.status = 'ASSIGNED';
      conv.assignedAgentId = agentId;
      conv.messages.push({
        id: `${id}-msg-claim-${Date.now()}`,
        sender: 'SYSTEM',
        text: 'Agent claimed conversation.',
        createdAt: new Date().toISOString(),
      });
    }
    return conv;
  },

  resolve(id: string): Conversation | undefined {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      conv.status = 'RESOLVED';
      conv.messages.push({
        id: `${id}-msg-resolve-${Date.now()}`,
        sender: 'SYSTEM',
        text: 'Conversation marked as resolved.',
        createdAt: new Date().toISOString(),
      });
    }
    return conv;
  },

  snooze(id: string): Conversation | undefined {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      conv.status = 'SNOOZED';
      conv.messages.push({
        id: `${id}-msg-snooze-${Date.now()}`,
        sender: 'SYSTEM',
        text: 'Conversation snoozed by agent.',
        createdAt: new Date().toISOString(),
      });
    }
    return conv;
  },

  reassign(id: string): Conversation | undefined {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      conv.status = 'UNASSIGNED';
      conv.assignedAgentId = null;
      conv.messages.push({
        id: `${id}-msg-reassign-${Date.now()}`,
        sender: 'SYSTEM',
        text: 'Conversation returned to the triage queue.',
        createdAt: new Date().toISOString(),
      });
    }
    return conv;
  },

  reset() {
    conversations = generateMockConversations(45);
  },
};
