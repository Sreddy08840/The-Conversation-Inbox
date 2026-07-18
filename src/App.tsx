import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Conversation } from './types/inbox';

// Fetch all conversations from MSW Mock API
async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations');
  if (!res.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return res.json();
}

// Resolve a conversation (may fail dynamically)
async function resolveConversation({
  id,
  forceFail,
}: {
  id: string;
  forceFail: boolean;
}): Promise<Conversation> {
  const url = `/api/conversations/${id}/resolve${forceFail ? '?fail=true' : ''}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Server error occurred');
  }
  return res.json();
}

// Claim a conversation
async function claimConversation(id: string): Promise<Conversation> {
  const res = await fetch(`/api/conversations/${id}/claim`, { method: 'POST' });
  if (!res.ok) {
    throw new Error('Failed to claim');
  }
  return res.json();
}

function App() {
  const queryClient = useQueryClient();
  const [forceFail, setForceFail] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Local helper to display visual logs
  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${message}`, ...prev.slice(0, 19)]);
    // eslint-disable-next-line no-console
    console.log(`[MSW Demo] ${message}`);
  };

  // TanStack Query to fetch list of conversations
  const {
    data: conversations,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  // Mutator to resolve conversation
  const resolveMutation = useMutation({
    mutationFn: resolveConversation,
    onSuccess: (data) => {
      addLog(`✓ Successfully resolved ${data.customerName}'s conversation (ID: ${data.id})`);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: Error) => {
      addLog(`❌ Resolve error: ${err.message}`);
    },
  });

  // Mutator to claim conversation
  const claimMutation = useMutation({
    mutationFn: claimConversation,
    onSuccess: (data) => {
      addLog(`✓ Successfully claimed ${data.customerName}'s conversation (ID: ${data.id})`);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: Error) => {
      addLog(`❌ Claim error: ${err.message}`);
    },
  });

  useEffect(() => {
    addLog('App initialized. Fetching inbox data from MSW...');
  }, []);

  return (
    <div className="min-h-screen bg-graphite-950 flex flex-col justify-start items-center p-8 selection:bg-graphite-800 selection:text-white">
      <div className="max-w-4xl w-full space-y-8">
        <header className="space-y-3 text-center">
          <span className="text-xs font-semibold tracking-widest text-graphite-400 uppercase font-sans">
            Yellow.ai Take-Home · Step 3
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-graphite-50 font-display">
            MSW API & Fetching Layer
          </h1>
          <p className="text-graphite-300 max-w-lg mx-auto text-sm font-sans">
            Verifying our data layer: conversations are loaded with a 200–500ms delay, and
            resolution write actions fail 25% of the time (or 100% when forced).
          </p>
        </header>

        {/* Demo Controls */}
        <div className="bg-graphite-900 border border-graphite-800 rounded-lg p-5 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="force-fail"
              checked={forceFail}
              onChange={(e) => setForceFail(e.target.checked)}
              className="w-4 h-4 rounded border-graphite-700 bg-graphite-950 text-urgency-critical focus:ring-urgency-critical/35"
            />
            <label
              htmlFor="force-fail"
              className="text-sm font-medium text-graphite-200 select-none"
            >
              Force Resolve failures (adds{' '}
              <code className="text-xs bg-graphite-950 px-1 py-0.5 rounded text-urgency-critical">
                ?fail=true
              </code>
              )
            </label>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-4 py-2 bg-graphite-800 hover:bg-graphite-700 active:bg-graphite-800 border border-graphite-700 text-graphite-100 rounded text-sm transition-colors duration-155 disabled:opacity-50 font-sans"
          >
            {isLoading ? 'Loading...' : 'Refresh Queue'}
          </button>
        </div>

        {/* Layout split: Queue List + Live logs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Conversation list */}
          <div className="bg-graphite-900 border border-graphite-800 rounded-lg p-5 flex flex-col space-y-4">
            <h2 className="text-lg font-semibold text-graphite-100 font-display border-b border-graphite-800 pb-2">
              Queue Preview ({conversations?.length || 0})
            </h2>

            {isLoading && (
              <div className="text-sm text-graphite-400 animate-pulse py-4 font-sans">
                Loading conversations from mocked worker...
              </div>
            )}

            {isError && (
              <div className="text-sm text-urgency-critical py-4 font-sans">
                Failed to load mock queue. Check console/MSW registry.
              </div>
            )}

            <div className="overflow-y-auto max-h-[350px] space-y-3 pr-1">
              {conversations?.map((c) => {
                const isCritical = c.urgencyScore >= 80;
                const isElevated = c.urgencyScore >= 40 && c.urgencyScore < 80;

                return (
                  <div
                    key={c.id}
                    className="p-3 bg-graphite-950 border border-graphite-800 rounded flex flex-col space-y-2 hover:border-graphite-700 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-xs text-graphite-200">
                          {c.customerName}
                        </span>
                        <span className="ml-2 px-1 text-[10px] rounded bg-graphite-900 border border-graphite-800 text-graphite-400 font-mono">
                          {c.customerTier}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                          isCritical
                            ? 'bg-urgency-critical/10 border-urgency-critical/30 text-urgency-critical'
                            : isElevated
                              ? 'bg-urgency-elevated/10 border-urgency-elevated/30 text-urgency-elevated'
                              : 'bg-urgency-calm/10 border-urgency-calm/30 text-urgency-calm'
                        }`}
                      >
                        Score: {c.urgencyScore}
                      </span>
                    </div>
                    <p className="text-xs text-graphite-400 line-clamp-1">{c.lastMessage}</p>
                    <div className="text-[10px] text-graphite-500 font-mono italic">
                      Reason: {c.urgencyReason}
                    </div>

                    <div className="flex gap-2 pt-1">
                      {c.status !== 'ASSIGNED' && c.status !== 'RESOLVED' && (
                        <button
                          onClick={() => claimMutation.mutate(c.id)}
                          className="px-2 py-0.5 bg-graphite-900 border border-graphite-800 hover:bg-graphite-800 text-[10px] text-graphite-300 rounded font-sans"
                        >
                          Claim
                        </button>
                      )}
                      {c.status !== 'RESOLVED' && (
                        <button
                          onClick={() => resolveMutation.mutate({ id: c.id, forceFail })}
                          className="px-2 py-0.5 bg-graphite-900 border border-graphite-800 hover:bg-urgency-critical/10 hover:border-urgency-critical/40 hover:text-urgency-critical text-[10px] text-graphite-300 rounded font-sans"
                        >
                          Resolve
                        </button>
                      )}
                      <span className="ml-auto text-[10px] text-graphite-500 bg-graphite-900 px-1 py-0.5 rounded uppercase font-mono">
                        Status: {c.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logs side panel */}
          <div className="bg-graphite-900 border border-graphite-800 rounded-lg p-5 flex flex-col space-y-4">
            <h2 className="text-lg font-semibold text-graphite-100 font-display border-b border-graphite-800 pb-2">
              Network Logs
            </h2>
            <div className="flex-1 bg-graphite-950 border border-graphite-800 rounded p-3 font-mono text-[11px] overflow-y-auto max-h-[350px] space-y-1.5 text-graphite-400">
              {logs.length === 0 && <div className="text-graphite-600">No events logged yet.</div>}
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes('❌')
                      ? 'text-urgency-critical'
                      : log.includes('✓')
                        ? 'text-emerald-400'
                        : ''
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
