import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Conversation, Message } from './types/inbox';

// Fetch all conversations from MSW Mock API
async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations');
  if (!res.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return res.json();
}

// Fetch single detailed conversation from MSW Mock API
async function fetchConversationDetail(id: string): Promise<Conversation> {
  const res = await fetch(`/api/conversations/${id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch conversation details');
  }
  return res.json();
}

// POST triage endpoints
async function claimConversation(id: string): Promise<Conversation> {
  const res = await fetch(`/api/conversations/${id}/claim`, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Server error claiming ticket');
  }
  return res.json();
}

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
    throw new Error(errorData.error || 'Server error resolving ticket');
  }
  return res.json();
}

async function snoozeConversation(id: string): Promise<Conversation> {
  const res = await fetch(`/api/conversations/${id}/snooze`, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Server error snoozing ticket');
  }
  return res.json();
}

async function reassignConversation(id: string): Promise<Conversation> {
  const res = await fetch(`/api/conversations/${id}/reassign`, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Server error reassigning ticket');
  }
  return res.json();
}

function App() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [forceFail, setForceFail] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track write failure details per conversation ID
  const [errorMap, setErrorMap] = useState<Record<string, { action: string; message: string }>>({});

  // TanStack Query list fetcher
  const {
    data: conversations,
    isLoading: isQueueLoading,
    isError: isQueueError,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  // Fetch detailed conversation in the background
  const { data: detailedConversation, isLoading: isDetailLoading } = useQuery({
    queryKey: ['conversationDetail', selectedId],
    queryFn: () => fetchConversationDetail(selectedId!),
    enabled: !!selectedId,
  });

  // Live aggregated stats
  const activeUnassigned = conversations?.filter((c) => c.status === 'UNASSIGNED') || [];
  const unassignedCount = activeUnassigned.length;
  const breachedCount = activeUnassigned.filter((c) => c.urgencyScore >= 80).length;
  const avgWaitTime =
    activeUnassigned.length > 0
      ? Math.round(
          activeUnassigned.reduce((acc, c) => acc + c.waitTimeMinutes, 0) / activeUnassigned.length
        )
      : 0;

  // Filter conversations for the queue listing
  const triageConversations = conversations || [];
  const filteredConversations = triageConversations.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.customerName.toLowerCase().includes(term) ||
      c.lastMessage.toLowerCase().includes(term) ||
      c.customerTier.toLowerCase().includes(term) ||
      c.urgencyReason.toLowerCase().includes(term)
    );
  });

  // Query mutations with Optimistic UI updates
  const claimMutation = useMutation({
    mutationFn: claimConversation,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['conversations'] });
      await queryClient.cancelQueries({ queryKey: ['conversationDetail', id] });

      const previousConversations = queryClient.getQueryData<Conversation[]>(['conversations']);
      const previousDetail = queryClient.getQueryData<Conversation>(['conversationDetail', id]);

      if (previousConversations) {
        queryClient.setQueryData<Conversation[]>(
          ['conversations'],
          previousConversations.map((c) =>
            c.id === id ? { ...c, status: 'ASSIGNED', assignedAgentId: 'agent-1' } : c
          )
        );
      }
      if (previousDetail) {
        queryClient.setQueryData<Conversation>(['conversationDetail', id], {
          ...previousDetail,
          status: 'ASSIGNED',
          assignedAgentId: 'agent-1',
        });
      }

      setErrorMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      return { previousConversations, previousDetail, id };
    },
    onError: (err, id, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(['conversationDetail', id], context.previousDetail);
      }
      setErrorMap((prev) => ({
        ...prev,
        [id]: { action: 'claim', message: err.message },
      }));
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversationDetail', id] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: resolveConversation,
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['conversations'] });
      await queryClient.cancelQueries({ queryKey: ['conversationDetail', id] });

      const previousConversations = queryClient.getQueryData<Conversation[]>(['conversations']);
      const previousDetail = queryClient.getQueryData<Conversation>(['conversationDetail', id]);

      if (previousConversations) {
        queryClient.setQueryData<Conversation[]>(
          ['conversations'],
          previousConversations.map((c) => (c.id === id ? { ...c, status: 'RESOLVED' } : c))
        );
      }
      if (previousDetail) {
        queryClient.setQueryData<Conversation>(['conversationDetail', id], {
          ...previousDetail,
          status: 'RESOLVED',
        });
      }

      setErrorMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      return { previousConversations, previousDetail, id };
    },
    onError: (err, variables, context) => {
      const id = variables.id;
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(['conversationDetail', id], context.previousDetail);
      }
      setErrorMap((prev) => ({
        ...prev,
        [id]: { action: 'resolve', message: err.message },
      }));
    },
    onSettled: (_data, _error, variables) => {
      const id = variables.id;
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversationDetail', id] });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: snoozeConversation,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['conversations'] });
      await queryClient.cancelQueries({ queryKey: ['conversationDetail', id] });

      const previousConversations = queryClient.getQueryData<Conversation[]>(['conversations']);
      const previousDetail = queryClient.getQueryData<Conversation>(['conversationDetail', id]);

      if (previousConversations) {
        queryClient.setQueryData<Conversation[]>(
          ['conversations'],
          previousConversations.map((c) => (c.id === id ? { ...c, status: 'SNOOZED' } : c))
        );
      }
      if (previousDetail) {
        queryClient.setQueryData<Conversation>(['conversationDetail', id], {
          ...previousDetail,
          status: 'SNOOZED',
        });
      }

      setErrorMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      return { previousConversations, previousDetail, id };
    },
    onError: (err, id, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(['conversationDetail', id], context.previousDetail);
      }
      setErrorMap((prev) => ({
        ...prev,
        [id]: { action: 'snooze', message: err.message },
      }));
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversationDetail', id] });
    },
  });

  const reassignMutation = useMutation({
    mutationFn: reassignConversation,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['conversations'] });
      await queryClient.cancelQueries({ queryKey: ['conversationDetail', id] });

      const previousConversations = queryClient.getQueryData<Conversation[]>(['conversations']);
      const previousDetail = queryClient.getQueryData<Conversation>(['conversationDetail', id]);

      if (previousConversations) {
        queryClient.setQueryData<Conversation[]>(
          ['conversations'],
          previousConversations.map((c) =>
            c.id === id ? { ...c, status: 'UNASSIGNED', assignedAgentId: null } : c
          )
        );
      }
      if (previousDetail) {
        queryClient.setQueryData<Conversation>(['conversationDetail', id], {
          ...previousDetail,
          status: 'UNASSIGNED',
          assignedAgentId: null,
        });
      }

      setErrorMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      return { previousConversations, previousDetail, id };
    },
    onError: (err, id, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(['conversationDetail', id], context.previousDetail);
      }
      setErrorMap((prev) => ({
        ...prev,
        [id]: { action: 'reassign', message: err.message },
      }));
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversationDetail', id] });
    },
  });

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isInputFocused =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';

      if (event.key === 'Escape') {
        if (isInputFocused) {
          (document.activeElement as HTMLElement).blur();
        } else {
          setSelectedId(null);
        }
        return;
      }

      if (isInputFocused) return;

      if (event.key === '/') {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      const visibleItems = filteredConversations.filter((c) => c.status !== 'RESOLVED');
      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault();
        if (visibleItems.length === 0) return;
        const currentIndex = visibleItems.findIndex((c) => c.id === selectedId);
        if (currentIndex === -1) {
          setSelectedId(visibleItems[0].id);
        } else if (currentIndex < visibleItems.length - 1) {
          setSelectedId(visibleItems[currentIndex + 1].id);
        }
        return;
      }

      if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (visibleItems.length === 0) return;
        const currentIndex = visibleItems.findIndex((c) => c.id === selectedId);
        if (currentIndex === -1) {
          setSelectedId(visibleItems[visibleItems.length - 1].id);
        } else if (currentIndex > 0) {
          setSelectedId(visibleItems[currentIndex - 1].id);
        }
        return;
      }

      if (!selectedId) return;
      const current = visibleItems.find((c) => c.id === selectedId);
      if (!current) return;

      if (event.key === 'c') {
        if (current.status === 'UNASSIGNED') {
          claimMutation.mutate(selectedId);
        }
      } else if (event.key === 'r') {
        if (current.status !== 'RESOLVED') {
          resolveMutation.mutate({ id: selectedId, forceFail });
        }
      } else if (event.key === 's') {
        if (current.status !== 'SNOOZED' && current.status !== 'RESOLVED') {
          snoozeMutation.mutate(selectedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedId,
    filteredConversations,
    forceFail,
    claimMutation,
    resolveMutation,
    snoozeMutation,
  ]);

  // Trigger retry of a failed mutation
  const handleRetry = (id: string, action: string) => {
    if (action === 'claim') claimMutation.mutate(id);
    else if (action === 'resolve') resolveMutation.mutate({ id, forceFail });
    else if (action === 'snooze') snoozeMutation.mutate(id);
    else if (action === 'reassign') reassignMutation.mutate(id);
  };

  const handleDismissError = (id: string) => {
    setErrorMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Optimistic detail display context
  const listConversation = conversations?.find((c) => c.id === selectedId);
  const currentConversation = detailedConversation || listConversation;
  const currentError = selectedId ? errorMap[selectedId] : null;

  // Compute breakdown points
  const getScoreBreakdown = (c: Omit<Conversation, 'urgencyScore' | 'urgencyReason'>) => {
    const breakdown = [];
    if (c.customerTier === 'VIP') breakdown.push({ factor: 'Customer Tier: VIP', points: 30 });
    else if (c.customerTier === 'PRIME')
      breakdown.push({ factor: 'Customer Tier: Prime', points: 15 });

    if (c.sentiment === 'ANGRY') breakdown.push({ factor: 'Sentiment: Angry', points: 40 });
    else if (c.sentiment === 'FRUSTRATED')
      breakdown.push({ factor: 'Sentiment: Frustrated', points: 20 });
    else if (c.sentiment === 'POSITIVE')
      breakdown.push({ factor: 'Sentiment: Positive (Reduction)', points: -10 });

    if (c.csatScore !== null && c.csatScore < 3)
      breakdown.push({ factor: 'CSAT Drop (< 3)', points: 25 });

    const waitPts = Math.min(c.waitTimeMinutes * 1.5, 60);
    if (waitPts > 0) {
      breakdown.push({
        factor: `Response Latency (${c.waitTimeMinutes}m @ 1.5/m)`,
        points: Math.round(waitPts),
      });
    }

    if (c.escalationReason === 'SLA_BREACH')
      breakdown.push({ factor: 'Escalation: SLA Breach', points: 50 });
    else if (c.escalationReason === 'BILLING_DISPUTE')
      breakdown.push({ factor: 'Escalation: Billing Dispute', points: 20 });
    else if (c.escalationReason === 'TECHNICAL_BUG')
      breakdown.push({ factor: 'Escalation: Technical Bug', points: 15 });
    else if (c.escalationReason === 'NEGATIVE_SENTIMENT')
      breakdown.push({ factor: 'Escalation: Negative Sentiment', points: 10 });

    return breakdown;
  };

  const scoreBreakdown = currentConversation ? getScoreBreakdown(currentConversation) : [];

  return (
    <div className="h-screen w-screen flex bg-graphite-950 text-graphite-200 overflow-hidden font-sans selection:bg-graphite-800 selection:text-white">
      {/* 1. Left Sidebar - Hidden on small screen sizes */}
      <aside className="w-14 bg-graphite-950 border-r border-graphite-800/80 hidden sm:flex flex-col items-center py-4 justify-between shrink-0 select-none">
        <div className="flex flex-col items-center space-y-6 w-full">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center font-bold text-graphite-950 text-sm shadow-md font-display">
            Y
          </div>
          <nav className="flex flex-col items-center space-y-4 w-full" aria-label="Main Navigation">
            <button
              aria-label="Inbox"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-amber-500 bg-graphite-900 border border-graphite-800/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </button>
            <button
              aria-label="Analytics"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-graphite-400 hover:text-graphite-200 hover:bg-graphite-900/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </button>
          </nav>
        </div>

        <div className="flex flex-col items-center space-y-4 w-full">
          <button
            aria-label="Settings"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-graphite-400 hover:text-graphite-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-graphite-800 border border-graphite-700/60 flex items-center justify-center text-xs font-semibold text-graphite-300">
            SA
          </div>
        </div>
      </aside>

      {/* 2. Workspace Content Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Queue column - Responsively switch visibility on mobile */}
        <section
          className={`w-full md:w-[420px] lg:w-[450px] xl:w-[480px] shrink-0 border-r border-graphite-800/80 flex flex-col bg-graphite-950 overflow-hidden ${
            selectedId !== null ? 'hidden md:flex' : 'flex'
          }`}
          aria-label="Queue list pane"
        >
          <header className="p-4 border-b border-graphite-800/80 shrink-0 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-graphite-50 font-display">
                  Triage Queue
                </h1>
                <p className="text-[11px] text-graphite-400 font-sans">CX agent triage workspace</p>
              </div>
              <div className="flex items-center space-x-2 bg-graphite-900 px-2.5 py-1.5 rounded-lg border border-graphite-800/50">
                <input
                  type="checkbox"
                  id="force-fail"
                  checked={forceFail}
                  onChange={(e) => setForceFail(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-graphite-700 bg-graphite-950 text-urgency-critical focus:ring-urgency-critical/20 cursor-pointer"
                />
                <label
                  htmlFor="force-fail"
                  className="text-[10px] font-medium text-graphite-400 select-none cursor-pointer"
                >
                  Force Resolves to fail
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-graphite-900 border border-graphite-800/50 rounded-lg p-3 text-center space-y-1">
                <span className="text-[10px] text-graphite-400 font-sans block uppercase tracking-wider">
                  Unhandled
                </span>
                <span className="text-xl font-bold text-graphite-100 font-display">
                  {isQueueLoading ? '...' : unassignedCount}
                </span>
              </div>
              <div className="bg-graphite-900 border border-graphite-800/50 rounded-lg p-3 text-center space-y-1">
                <span className="text-[10px] text-graphite-400 font-sans block uppercase tracking-wider">
                  At Risk
                </span>
                <span
                  className={`text-xl font-bold font-display ${
                    breachedCount > 0 ? 'text-urgency-critical' : 'text-graphite-100'
                  }`}
                >
                  {isQueueLoading ? '...' : breachedCount}
                </span>
              </div>
              <div className="bg-graphite-900 border border-graphite-800/50 rounded-lg p-3 text-center space-y-1">
                <span className="text-[10px] text-graphite-400 font-sans block uppercase tracking-wider">
                  Avg Wait
                </span>
                <span className="text-xl font-bold text-graphite-100 font-display">
                  {isQueueLoading ? '...' : `${avgWaitTime}m`}
                </span>
              </div>
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-graphite-500">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search queue... (press '/' to focus)"
                className="w-full pl-9 pr-8 py-1.5 text-sm bg-graphite-900 border border-graphite-800/80 rounded-lg text-graphite-100 placeholder-graphite-500 focus:outline-none focus:ring-2 focus:ring-amber-500/80 focus:border-amber-500/80 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-graphite-500 hover:text-graphite-300"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </header>

          <div
            className="flex-1 overflow-y-auto p-4 space-y-2.5"
            role="list"
            aria-label="Conversation prioritized queue"
          >
            {isQueueLoading &&
              Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  role="listitem"
                  className="p-3 bg-graphite-900/40 border border-graphite-800/50 rounded-lg flex items-center space-x-3 h-[86px] relative overflow-hidden animate-pulse"
                >
                  <div className="absolute top-0 left-0 w-[4px] h-full bg-graphite-800" />
                  <div className="flex-1 space-y-2.5 pl-1.5">
                    <div className="flex justify-between items-center">
                      <div className="h-3 w-24 bg-graphite-800 rounded" />
                      <div className="h-3 w-10 bg-graphite-800/50 rounded" />
                    </div>
                    <div className="h-2.5 w-4/5 bg-graphite-800/70 rounded" />
                    <div className="h-3 w-32 bg-graphite-800/40 rounded" />
                  </div>
                </div>
              ))}

            {isQueueError && (
              <div className="text-center py-12 px-4 space-y-3 bg-graphite-900/10 border border-rose-900/30 rounded-xl">
                <span className="text-3xl">⚠️</span>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-rose-400">
                    Unable to load conversations
                  </h3>
                  <p className="text-xs text-graphite-400 max-w-[240px] mx-auto leading-relaxed">
                    The mock API service failed to respond. Refresh or restart your browser mock
                    worker.
                  </p>
                </div>
                <button
                  onClick={() => refetchQueue()}
                  className="px-3 py-1 bg-graphite-900 hover:bg-graphite-800 active:bg-graphite-950 text-xs font-semibold rounded text-graphite-200 border border-graphite-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
                >
                  Reload Queue
                </button>
              </div>
            )}

            {!isQueueLoading &&
              !isQueueError &&
              triageConversations.filter((c) => c.status !== 'RESOLVED').length === 0 && (
                <div className="text-center py-16 px-4 bg-graphite-900/20 border border-dashed border-graphite-800 rounded-xl space-y-3">
                  <span className="text-4xl block">🎉</span>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-graphite-100 font-display">
                      Triage Queue Clean
                    </h3>
                    <p className="text-xs text-graphite-400 max-w-[240px] mx-auto leading-relaxed font-sans">
                      All active tickets are handled. Enjoy the empty inbox!
                    </p>
                  </div>
                </div>
              )}

            {!isQueueLoading &&
              !isQueueError &&
              filteredConversations.filter((c) => c.status !== 'RESOLVED').length === 0 &&
              triageConversations.filter((c) => c.status !== 'RESOLVED').length > 0 && (
                <div className="text-center py-12 space-y-2 text-xs text-graphite-500 font-sans">
                  <span>No matching conversations. Refine your search query.</span>
                </div>
              )}

            {!isQueueLoading &&
              !isQueueError &&
              filteredConversations.length > 0 &&
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedId;
                const isCritical = c.urgencyScore >= 80;
                const isElevated = c.urgencyScore >= 40 && c.urgencyScore < 80;
                const isResolved = c.status === 'RESOLVED';

                let indicatorClass = 'bg-graphite-800 w-[2px]';
                if (isCritical) {
                  indicatorClass =
                    'bg-urgency-critical w-[6px] shadow-[0_0_10px_rgba(244,63,94,0.4)]';
                } else if (isElevated) {
                  indicatorClass = 'bg-urgency-elevated w-[4px]';
                } else {
                  indicatorClass = 'bg-slate-500 w-[2px]';
                }

                let chipClass = 'bg-slate-950/40 text-slate-400 border-slate-800/80';
                if (isCritical) {
                  chipClass = 'bg-rose-950/20 text-rose-300 border-rose-900/30 font-semibold';
                } else if (isElevated) {
                  chipClass = 'bg-amber-950/20 text-amber-300 border-amber-900/30';
                }

                return (
                  <div key={c.id} role="listitem">
                    <button
                      onClick={() => setSelectedId(c.id)}
                      aria-selected={isSelected}
                      aria-label={`${c.customerName}, tier ${c.customerTier}, wait time ${c.waitTimeMinutes} minutes, urgency score ${c.urgencyScore}, status ${c.status}. Reason: ${c.urgencyReason}`}
                      className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 relative overflow-hidden group border motion-safe:transition-all motion-safe:duration-300 ease-out h-[86px] max-h-[86px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-950 ${
                        isResolved ? 'animating-out' : ''
                      } ${
                        isSelected
                          ? 'bg-graphite-900 border-amber-500/50 ring-1 ring-amber-500/30 shadow-[0_0_12px_rgba(251,191,36,0.05)]'
                          : 'bg-graphite-900/30 border-graphite-800/50 hover:bg-graphite-900/50 hover:border-graphite-800'
                      }`}
                    >
                      <div
                        className={`absolute top-0 left-0 h-full transition-all duration-200 ${indicatorClass}`}
                      />

                      <div className="flex-1 space-y-1.5 pl-1.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-xs text-graphite-100 group-hover:text-graphite-50">
                              {c.customerName}
                            </span>
                            {c.customerTier === 'VIP' ? (
                              <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-amber-950/40 text-amber-400 border border-amber-900/40 tracking-wider">
                                VIP
                              </span>
                            ) : c.customerTier === 'PRIME' ? (
                              <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-blue-950/30 text-blue-300 border border-blue-900/30 tracking-wider">
                                PRIME
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[10px] text-graphite-400 font-mono">
                            {c.waitTimeMinutes}m ago
                          </span>
                        </div>

                        <p className="text-xs text-graphite-400 line-clamp-1 group-hover:text-graphite-300">
                          {c.lastMessage}
                        </p>

                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full border font-mono tracking-wide uppercase ${chipClass}`}
                          >
                            {c.urgencyReason}
                          </span>
                          {c.status !== 'UNASSIGNED' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-graphite-950/50 text-graphite-500 border border-graphite-800 font-mono uppercase">
                              {c.status}
                            </span>
                          )}
                          {!isResolved && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                resolveMutation.mutate({ id: c.id, forceFail });
                              }}
                              className="ml-auto px-2 py-0.5 bg-graphite-950 border border-graphite-800 hover:bg-urgency-critical/10 hover:border-urgency-critical/40 hover:text-urgency-critical text-[9px] text-graphite-300 rounded font-sans transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
          </div>
        </section>

        {/* Detail Panel Area - Responsively switch visibility on mobile */}
        <section
          className={`flex-1 bg-graphite-900 flex flex-col overflow-hidden ${
            selectedId !== null ? 'flex' : 'hidden md:flex'
          }`}
          aria-label="Conversation detail pane"
        >
          {currentConversation ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-graphite-900">
              <header className="p-4 border-b border-graphite-800/80 flex justify-between items-center bg-graphite-900 shrink-0">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedId(null)}
                    aria-label="Close conversation detail"
                    className="p-1.5 rounded-lg hover:bg-graphite-800 text-graphite-400 hover:text-graphite-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  <div>
                    <h2 className="text-base font-bold text-graphite-100 font-display">
                      {currentConversation.customerName}
                    </h2>
                    {isDetailLoading ? (
                      <div className="h-2.5 w-24 bg-graphite-800 animate-pulse rounded mt-1" />
                    ) : (
                      <p className="text-[10px] text-graphite-400 font-mono">
                        {currentConversation.customerEmail} · {currentConversation.customerPhone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded font-bold border ${
                      currentConversation.urgencyScore >= 80
                        ? 'bg-urgency-critical/10 border-urgency-critical/30 text-urgency-critical'
                        : currentConversation.urgencyScore >= 40
                          ? 'bg-urgency-elevated/10 border-urgency-elevated/30 text-urgency-elevated'
                          : 'bg-urgency-calm/10 border-urgency-calm/30 text-urgency-calm'
                    }`}
                  >
                    Score: {currentConversation.urgencyScore}
                  </span>
                </div>
              </header>

              {/* Triage Action bar inside the detail panel */}
              <div className="px-6 py-3 bg-graphite-950/40 border-b border-graphite-800 flex flex-wrap gap-2 shrink-0">
                {currentConversation.status === 'UNASSIGNED' && (
                  <button
                    onClick={() => claimMutation.mutate(currentConversation.id)}
                    disabled={claimMutation.isPending}
                    className="px-3 py-1 bg-graphite-800 hover:bg-graphite-700 text-xs font-semibold rounded text-graphite-100 border border-graphite-700 disabled:opacity-50 transition-colors font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
                  >
                    {claimMutation.isPending ? 'Claiming...' : 'Claim Conversation'}
                  </button>
                )}

                {currentConversation.status === 'ASSIGNED' && (
                  <button
                    onClick={() => reassignMutation.mutate(currentConversation.id)}
                    disabled={reassignMutation.isPending}
                    className="px-3 py-1 bg-graphite-800 hover:bg-graphite-700 text-xs font-semibold rounded text-graphite-300 border border-graphite-700 disabled:opacity-50 transition-colors font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
                  >
                    {reassignMutation.isPending ? 'Reassigning...' : 'Reassign Queue'}
                  </button>
                )}

                {currentConversation.status !== 'RESOLVED' && (
                  <button
                    onClick={() =>
                      resolveMutation.mutate({ id: currentConversation.id, forceFail })
                    }
                    disabled={resolveMutation.isPending}
                    className="px-3 py-1 bg-urgency-critical hover:bg-rose-500 text-xs font-semibold rounded text-white border border-rose-500 disabled:opacity-50 transition-colors font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
                  >
                    {resolveMutation.isPending ? 'Resolving...' : 'Resolve'}
                  </button>
                )}

                {currentConversation.status !== 'SNOOZED' &&
                  currentConversation.status !== 'RESOLVED' && (
                    <button
                      onClick={() => snoozeMutation.mutate(currentConversation.id)}
                      disabled={snoozeMutation.isPending}
                      className="px-3 py-1 bg-graphite-800 hover:bg-graphite-700 text-xs font-semibold rounded text-graphite-300 border border-graphite-700 disabled:opacity-50 transition-colors font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
                    >
                      {snoozeMutation.isPending ? 'Snoozing...' : 'Snooze'}
                    </button>
                  )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Triage failed retry panel */}
                {currentError && (
                  <div className="p-4 bg-rose-950/40 border border-rose-900/40 rounded-xl flex items-center justify-between text-xs font-sans text-rose-300 animate-fadeIn shrink-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-base" role="img" aria-label="Warning">
                        ⚠️
                      </span>
                      <div>
                        <span className="font-bold uppercase tracking-wider block text-[9px] text-rose-400">
                          Triage failed ({currentError.action})
                        </span>
                        <span>The conversation write path rejected the request.</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleRetry(selectedId!, currentError.action)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 active:bg-rose-600 border border-rose-500 text-white rounded font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => handleDismissError(selectedId!)}
                        className="px-2 py-1 bg-graphite-900 border border-graphite-800 hover:bg-graphite-800 rounded transition-colors text-graphite-400 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* Score breakdown inspect */}
                <div className="bg-graphite-950/50 border border-graphite-800 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-graphite-800/80 pb-2">
                    <span className="text-[10px] font-bold text-graphite-400 uppercase tracking-wider font-mono">
                      Urgency Score Calculation
                    </span>
                    <span className="text-[10px] text-graphite-500 font-mono italic">
                      {currentConversation.urgencyReason}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {scoreBreakdown.map((row, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-xs font-mono"
                      >
                        <span className="text-graphite-400">· {row.factor}</span>
                        <span
                          className={
                            row.points > 0
                              ? 'text-amber-500 font-bold'
                              : 'text-emerald-500 font-bold'
                          }
                        >
                          {row.points > 0 ? `+${row.points}` : row.points}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-xs font-bold font-mono border-t border-graphite-800/60 pt-2 text-graphite-200">
                      <span>Total Urgency Index</span>
                      <span
                        className={
                          currentConversation.urgencyScore >= 80
                            ? 'text-urgency-critical'
                            : 'text-graphite-100'
                        }
                      >
                        {currentConversation.urgencyScore}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transcript messages timeline */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-graphite-400 uppercase tracking-wider font-mono">
                    Conversation Transcript
                  </h3>

                  <div className="space-y-3.5">
                    {isDetailLoading ? (
                      <>
                        <div className="flex flex-col mr-auto items-start max-w-[85%]">
                          <div className="p-3 rounded-xl text-xs leading-relaxed bg-graphite-950 border border-graphite-800 text-graphite-200 rounded-tl-none">
                            {listConversation?.lastMessage}
                          </div>
                          <span className="text-[9px] text-graphite-500 font-mono mt-1 px-1">
                            Customer ·{' '}
                            {listConversation
                              ? new Date(listConversation.lastMessageAt).toLocaleTimeString()
                              : ''}
                          </span>
                        </div>
                        <div className="flex flex-col ml-auto items-end max-w-[80%] animate-pulse">
                          <div className="p-3 rounded-xl h-12 w-48 bg-graphite-850 rounded-tr-none border border-graphite-800" />
                        </div>
                      </>
                    ) : (
                      currentConversation.messages.map((m: Message) => {
                        const isCustomer = m.sender === 'CUSTOMER';
                        const isAgent = m.sender === 'AGENT';

                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col max-w-[85%] ${
                              isCustomer
                                ? 'mr-auto items-start'
                                : isAgent
                                  ? 'ml-auto items-end'
                                  : 'mx-auto items-center'
                            }`}
                          >
                            <div
                              className={`p-3 rounded-xl text-xs leading-relaxed ${
                                isCustomer
                                  ? 'bg-graphite-950 border border-graphite-800 text-graphite-200 rounded-tl-none'
                                  : isAgent
                                    ? 'bg-amber-500 text-graphite-950 font-medium rounded-tr-none'
                                    : 'bg-graphite-900 border border-graphite-800/50 text-graphite-400 text-center text-[10px]'
                              }`}
                            >
                              {m.text}
                            </div>
                            <span className="text-[9px] text-graphite-500 font-mono mt-1 px-1">
                              {isCustomer ? 'Customer' : isAgent ? 'Agent' : 'System'} ·{' '}
                              {new Date(m.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state selection detail pane */
            <div className="m-auto space-y-6 max-w-md p-6 text-center select-none">
              <div className="w-16 h-16 rounded-full bg-graphite-950/80 border border-graphite-800 flex items-center justify-center mx-auto text-graphite-500 shadow-inner">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-graphite-100 font-display">
                  No conversation selected
                </h2>
                <p className="text-sm text-graphite-400 font-sans max-w-xs mx-auto">
                  Choose a ticket from the priority queue to start triaging customer concerns.
                </p>
              </div>

              {/* Keyboard shortcuts cheatsheet */}
              <div className="bg-graphite-950/60 border border-graphite-800/80 rounded-xl p-4 text-left space-y-3">
                <span className="text-[10px] font-semibold text-graphite-400 tracking-wider uppercase font-sans">
                  Keyboard Navigation
                </span>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-sans text-graphite-300">
                  <div className="flex justify-between items-center py-0.5">
                    <span>Next Ticket</span>
                    <kbd className="px-1.5 py-0.5 bg-graphite-900 border border-graphite-800 rounded font-mono text-[10px] text-graphite-400">
                      J
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span>Claim Ticket</span>
                    <kbd className="px-1.5 py-0.5 bg-graphite-900 border border-graphite-800 rounded font-mono text-[10px] text-graphite-400">
                      C
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span>Prev Ticket</span>
                    <kbd className="px-1.5 py-0.5 bg-graphite-900 border border-graphite-800 rounded font-mono text-[10px] text-graphite-400">
                      K
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span>Resolve Ticket</span>
                    <kbd className="px-1.5 py-0.5 bg-graphite-900 border border-graphite-800 rounded font-mono text-[10px] text-graphite-400">
                      R
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span>Search Queue</span>
                    <kbd className="px-1.5 py-0.5 bg-graphite-900 border border-graphite-800 rounded font-mono text-[10px] text-graphite-400">
                      /
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span>Snooze Ticket</span>
                    <kbd className="px-1.5 py-0.5 bg-graphite-900 border border-graphite-800 rounded font-mono text-[10px] text-graphite-400">
                      S
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
