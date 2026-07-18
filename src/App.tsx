import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Conversation } from './types/inbox';

// Fetch all conversations from MSW Mock API
async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations');
  if (!res.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return res.json();
}

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [forceFail, setForceFail] = useState(false);

  // TanStack Query to fetch the list
  const {
    data: conversations,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  // Calculate stats from the complete (non-filtered) dataset
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
  // 1. Exclude RESOLVED tickets from triage view
  const triageConversations = conversations?.filter((c) => c.status !== 'RESOLVED') || [];

  // 2. Apply search filter
  const filteredConversations = triageConversations.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.customerName.toLowerCase().includes(term) ||
      c.lastMessage.toLowerCase().includes(term) ||
      c.customerTier.toLowerCase().includes(term) ||
      c.urgencyReason.toLowerCase().includes(term)
    );
  });

  // Identify the selected conversation detail
  const selectedConversation = conversations?.find((c) => c.id === selectedId);

  return (
    <div className="h-screen w-screen flex bg-graphite-950 text-graphite-200 overflow-hidden font-sans selection:bg-graphite-800 selection:text-white">
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-14 bg-graphite-950 border-r border-graphite-800/80 flex flex-col items-center py-4 justify-between shrink-0 select-none">
        <div className="flex flex-col items-center space-y-6 w-full">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center font-bold text-graphite-950 text-sm shadow-md font-display">
            Y
          </div>
          {/* Icons */}
          <nav className="flex flex-col items-center space-y-4 w-full">
            <button
              aria-label="Inbox"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-amber-500 bg-graphite-900 border border-graphite-800/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              className="w-10 h-10 rounded-lg flex items-center justify-center text-graphite-400 hover:text-graphite-200 hover:bg-graphite-900/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        {/* User Info / Settings */}
        <div className="flex flex-col items-center space-y-4 w-full">
          <button
            aria-label="Settings"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-graphite-400 hover:text-graphite-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        {/* Queue column (Left: ~450px) */}
        <section className="w-[420px] lg:w-[450px] xl:w-[480px] shrink-0 border-r border-graphite-800/80 flex flex-col bg-graphite-950 overflow-hidden">
          {/* Header Stats */}
          <header className="p-4 border-b border-graphite-800/80 shrink-0 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-graphite-50 font-display">
                  Triage Queue
                </h1>
                <p className="text-[11px] text-graphite-400">CX agent triage workspace</p>
              </div>

              {/* Demo mutation forced failure toggle */}
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

            {/* Quick Metrics Widget */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-graphite-900 border border-graphite-800/50 rounded-lg p-3 text-center space-y-1">
                <span className="text-[10px] text-graphite-400 font-sans block uppercase tracking-wider">
                  Unhandled
                </span>
                <span className="text-xl font-bold text-graphite-100 font-display">
                  {isLoading ? '...' : unassignedCount}
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
                  {isLoading ? '...' : breachedCount}
                </span>
              </div>
              <div className="bg-graphite-900 border border-graphite-800/50 rounded-lg p-3 text-center space-y-1">
                <span className="text-[10px] text-graphite-400 font-sans block uppercase tracking-wider">
                  Avg Wait
                </span>
                <span className="text-xl font-bold text-graphite-100 font-display">
                  {isLoading ? '...' : `${avgWaitTime}m`}
                </span>
              </div>
            </div>

            {/* Search Input Filter */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-graphite-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by customer name, tier, keyword..."
                className="w-full pl-9 pr-8 py-1.5 text-sm bg-graphite-900 border border-graphite-800/80 rounded-lg text-graphite-100 placeholder-graphite-500 focus:outline-none focus:border-graphite-700/80 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-graphite-500 hover:text-graphite-300"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          {/* Queue Scroll List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {/* A. Loading Skeletons */}
            {isLoading &&
              Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-graphite-900/40 border border-graphite-800/50 rounded-lg flex items-center space-x-3 h-[72px] relative overflow-hidden animate-pulse"
                >
                  <div className="absolute top-0 left-0 w-[3px] h-full bg-graphite-800" />
                  <div className="flex-1 space-y-2.5 pl-1.5">
                    <div className="flex justify-between items-center">
                      <div className="h-3 w-24 bg-graphite-800 rounded" />
                      <div className="h-3.5 w-14 bg-graphite-800/50 rounded" />
                    </div>
                    <div className="h-2.5 w-4/5 bg-graphite-800/70 rounded" />
                    <div className="h-2.5 w-28 bg-graphite-800/40 rounded" />
                  </div>
                </div>
              ))}

            {/* B. Error State */}
            {isError && (
              <div className="text-center py-10 space-y-2">
                <span className="text-3xl">⚠️</span>
                <h3 className="text-sm font-semibold text-urgency-critical">
                  Network Connection Issue
                </h3>
                <p className="text-xs text-graphite-400 max-w-xs mx-auto">
                  Failed to load conversations from the mock API layer. Make sure MSW is starting
                  successfully in main.tsx.
                </p>
              </div>
            )}

            {/* C. Empty Queue State (Win State) */}
            {!isLoading && !isError && triageConversations.length === 0 && (
              <div className="text-center py-16 space-y-4 px-4 bg-graphite-900/20 border border-dashed border-graphite-800 rounded-xl">
                <span className="text-4xl">🎉</span>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-graphite-100 font-display">
                    All caught up!
                  </h3>
                  <p className="text-xs text-graphite-400 max-w-[240px] mx-auto leading-relaxed">
                    The active triage queue is clean. Good job keeping the response latency low!
                  </p>
                </div>
              </div>
            )}

            {/* D. No Search Results State */}
            {!isLoading &&
              !isError &&
              triageConversations.length > 0 &&
              filteredConversations.length === 0 && (
                <div className="text-center py-12 space-y-2 px-4">
                  <span className="text-2xl text-graphite-500">🔍</span>
                  <h3 className="text-sm font-semibold text-graphite-300">No matching tickets</h3>
                  <p className="text-xs text-graphite-500 max-w-[220px] mx-auto">
                    No results found for "{searchTerm}". Double-check your spelling or refine your
                    term.
                  </p>
                </div>
              )}

            {/* E. Prioritized Queue List */}
            {!isLoading &&
              !isError &&
              filteredConversations.length > 0 &&
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedId;
                const isCritical = c.urgencyScore >= 80;
                const isElevated = c.urgencyScore >= 40 && c.urgencyScore < 80;

                // Configure Left-Edge Urgency Indicator
                let indicatorClass = 'bg-graphite-800 w-[2px]';
                if (isCritical) {
                  indicatorClass =
                    'bg-urgency-critical w-[6px] shadow-[0_0_10px_rgba(244,63,94,0.4)]';
                } else if (isElevated) {
                  indicatorClass = 'bg-urgency-elevated w-[4px]';
                } else {
                  indicatorClass = 'bg-slate-500 w-[2px]';
                }

                // Configure Reason Chip styling
                let chipClass = 'bg-slate-950/40 text-slate-400 border-slate-800/80';
                if (isCritical) {
                  chipClass = 'bg-rose-950/20 text-rose-300 border-rose-900/30 font-semibold';
                } else if (isElevated) {
                  chipClass = 'bg-amber-950/20 text-amber-300 border-amber-900/30';
                }

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 relative overflow-hidden transition-all duration-150 group border ${
                      isSelected
                        ? 'bg-graphite-900 border-graphite-700 shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                        : 'bg-graphite-900/30 border-graphite-800/50 hover:bg-graphite-900/50 hover:border-graphite-800'
                    }`}
                  >
                    {/* Urgency Indicator Strip */}
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-200 ${indicatorClass}`}
                    />

                    <div className="flex-1 space-y-1.5 pl-1.5">
                      {/* Name / Tier & Timer Header */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-graphite-100 group-hover:text-graphite-50">
                            {c.customerName}
                          </span>
                          {/* VIP Golden Badge */}
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

                      {/* Snippet Preview */}
                      <p className="text-xs text-graphite-400 line-clamp-1 group-hover:text-graphite-300">
                        {c.lastMessage}
                      </p>

                      {/* Urgency Reason Chip */}
                      <div className="flex flex-wrap gap-1.5">
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
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </section>

        {/* Detail Panel Area (Right: Remaining width) */}
        <section className="flex-1 bg-graphite-900 flex flex-col overflow-hidden">
          {selectedConversation ? (
            /* Selected Conversation preview card */
            <div className="flex-1 flex flex-col overflow-hidden bg-graphite-900">
              <header className="p-6 border-b border-graphite-800 flex justify-between items-center bg-graphite-900">
                <div>
                  <h2 className="text-lg font-bold text-graphite-100 font-display">
                    {selectedConversation.customerName}
                  </h2>
                  <p className="text-xs text-graphite-400 font-mono">
                    ID: {selectedConversation.id} · {selectedConversation.customerEmail}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded font-bold border ${
                    selectedConversation.urgencyScore >= 80
                      ? 'bg-urgency-critical/10 border-urgency-critical/30 text-urgency-critical'
                      : selectedConversation.urgencyScore >= 40
                        ? 'bg-urgency-elevated/10 border-urgency-elevated/30 text-urgency-elevated'
                        : 'bg-urgency-calm/10 border-urgency-calm/30 text-urgency-calm'
                  }`}
                >
                  Urgency Score: {selectedConversation.urgencyScore}
                </span>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Meta Panel Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-graphite-950/40 border border-graphite-800 p-4 rounded-xl">
                  <div>
                    <span className="text-[10px] text-graphite-500 block uppercase font-mono">
                      Tier
                    </span>
                    <span className="text-sm font-semibold text-graphite-200">
                      {selectedConversation.customerTier}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-graphite-500 block uppercase font-mono">
                      Sentiment
                    </span>
                    <span className="text-sm font-semibold text-graphite-200">
                      {selectedConversation.sentiment}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-graphite-500 block uppercase font-mono">
                      Wait Time
                    </span>
                    <span className="text-sm font-semibold text-graphite-200">
                      {selectedConversation.waitTimeMinutes}m
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-graphite-500 block uppercase font-mono">
                      CSAT Drop
                    </span>
                    <span className="text-sm font-semibold text-graphite-200">
                      {selectedConversation.csatScore
                        ? `${selectedConversation.csatScore}/5`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Transcript messages preview */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-graphite-400 uppercase tracking-wider font-mono">
                    Conversation Transcript
                  </h3>
                  <div className="space-y-3">
                    {selectedConversation.messages.map((m) => {
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
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* B. Empty state */
            <div className="m-auto space-y-6 max-w-md p-6 text-center select-none">
              <div className="w-16 h-16 rounded-full bg-graphite-950/80 border border-graphite-800 flex items-center justify-center mx-auto text-graphite-500 shadow-inner">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
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

              {/* Keyboard navigation quick cheatsheet */}
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
