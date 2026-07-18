import { http, delay, HttpResponse } from 'msw';
import { db } from './db';

export const handlers = [
  // 1. GET /api/conversations (returns all conversations, sorted by urgency)
  http.get('/api/conversations', async () => {
    const latency = Math.floor(Math.random() * 300) + 200; // 200-500ms
    await delay(latency);

    const conversations = db.getConversations();
    return HttpResponse.json(conversations);
  }),

  // 2. GET /api/conversations/:id (returns one full conversation including transcript messages)
  http.get('/api/conversations/:id', async ({ params }) => {
    const latency = Math.floor(Math.random() * 300) + 200;
    await delay(latency);

    const { id } = params;
    const conversation = db.getConversation(id as string);

    if (!conversation) {
      return new HttpResponse(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return HttpResponse.json(conversation);
  }),

  // 3. POST /api/conversations/:id/claim (assigns the agent to the ticket)
  http.post('/api/conversations/:id/claim', async ({ params }) => {
    const latency = Math.floor(Math.random() * 300) + 200;
    await delay(latency);

    const { id } = params;
    const updated = db.claim(id as string, 'agent-1'); // Statically mock current agent as 'agent-1'

    if (!updated) {
      return new HttpResponse(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return HttpResponse.json(updated);
  }),

  // 4. POST /api/conversations/:id/resolve (closes ticket; fails 25% of the time to test retry UI)
  http.post('/api/conversations/:id/resolve', async ({ params, request }) => {
    const latency = Math.floor(Math.random() * 300) + 200;
    await delay(latency);

    const { id } = params;
    const url = new URL(request.url);
    const forceFail = url.searchParams.get('fail') === 'true';

    // Fails roughly 1 in 4 times, or if explicitly requested via query param
    if (forceFail || Math.random() < 0.25) {
      return new HttpResponse(
        JSON.stringify({
          error: 'Write Failure: Failed to resolve conversation. Server was unresponsive.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updated = db.resolve(id as string);

    if (!updated) {
      return new HttpResponse(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return HttpResponse.json(updated);
  }),

  // 5. POST /api/conversations/:id/snooze (snoozes ticket)
  http.post('/api/conversations/:id/snooze', async ({ params }) => {
    const latency = Math.floor(Math.random() * 300) + 200;
    await delay(latency);

    const { id } = params;
    const updated = db.snooze(id as string);

    if (!updated) {
      return new HttpResponse(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return HttpResponse.json(updated);
  }),

  // 6. POST /api/conversations/:id/reassign (unassigns agent and returns ticket to triage queue)
  http.post('/api/conversations/:id/reassign', async ({ params }) => {
    const latency = Math.floor(Math.random() * 300) + 200;
    await delay(latency);

    const { id } = params;
    const updated = db.reassign(id as string);

    if (!updated) {
      return new HttpResponse(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return HttpResponse.json(updated);
  }),
];
