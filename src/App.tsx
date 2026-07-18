import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Conversation } from './types/inbox';

// Fetch all conversations from MSW Mock API to compute live stats
async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations');
  if (!res.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return res.json();
}

function App() {
  const [forceFail, setForceFail] = useState(false);

  // Fetch conversations to calculate actual stats for the header
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  // Calculate live header stats
  const activeUnassigned = conversations?.filter((c) => c.status === 'UNASSIGNED') || [];
  const unassignedCount = activeUnassigned.length;
  const breachedCount = activeUnassigned.filter((c) => c.urgencyScore >= 80).length;
  const avgWaitTime =
    activeUnassigned.length > 0
      ? Math.round(
          activeUnassigned.reduce((acc, c) => acc + c.waitTimeMinutes, 0) / activeUnassigned.length
        )
      : 0;

  return (
    <div className="h-screen w-screen flex bg-graphite-950 text-graphite-200 overflow-hidden font-sans selection:bg-graphite-800 selection:text-white">
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-14 bg-graphite-950 border-r border-graphite-800/80 flex flex-col items-center py-4 justify-between shrink-0 select-none">
        <div className="flex flex-col items-center space-y-6 w-full">
          {/* Yellow Logo */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center font-bold text-graphite-950 text-sm shadow-md font-display">
            Y
          </div>
          {/* Nav Items */}
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </button>
          </nav>
        </div>

        {/* User Profile / Settings */}
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

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Queue column (Left: 40% width) */}
        <section className="w-[420px] lg:w-[460px] xl:w-[480px] shrink-0 border-r border-graphite-800/80 flex flex-col bg-graphite-950 overflow-hidden">
          {/* Header Stats */}
          <header className="p-4 border-b border-graphite-800/80 shrink-0 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-graphite-50 font-display">
                  Triage Queue
                </h1>
                <p className="text-[11px] text-graphite-400">CX agent triage workspace</p>
              </div>

              {/* Demo forced failure control */}
              <div className="flex items-center space-x-2 bg-graphite-900 px-2.5 py-1.5 rounded-lg border border-graphite-800/50">
                <input
                  type="checkbox"
                  id="force-fail"
                  checked={forceFail}
                  onChange={(e) => setForceFail(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-graphite-700 bg-graphite-950 text-urgency-critical focus:ring-urgency-critical/20"
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
          </header>

          {/* Skeletons Queue Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {/* Render 7 dense loading skeletons to represent the queue structure */}
            {Array.from({ length: 7 }).map((_, idx) => {
              // Alternate indicators for visualization rhythm
              let indicatorColor = 'bg-graphite-800';
              if (idx === 0) indicatorColor = 'bg-urgency-critical/60';
              if (idx === 1 || idx === 3) indicatorColor = 'bg-urgency-elevated/60';
              if (idx === 2) indicatorColor = 'bg-urgency-calm/60';

              return (
                <div
                  key={idx}
                  className="p-3 bg-graphite-900/40 border border-graphite-800/50 rounded-lg flex items-center space-x-3 h-[72px] relative overflow-hidden animate-pulse"
                >
                  {/* Urgency Color Strip */}
                  <div className={`absolute top-0 left-0 w-[3px] h-full ${indicatorColor}`} />

                  <div className="flex-1 space-y-2.5 pl-1.5">
                    {/* Customer Row */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="h-3 w-24 bg-graphite-800 rounded" />
                        <div className="h-3.5 w-10 bg-graphite-800/60 rounded" />
                      </div>
                      <div className="h-3.5 w-14 bg-graphite-800/50 rounded" />
                    </div>

                    {/* Message Preview Skeleton */}
                    <div className="h-2.5 w-4/5 bg-graphite-800/70 rounded" />

                    {/* Meta Reason Chip Skeleton */}
                    <div className="flex items-center space-x-1.5">
                      <div className="h-3 w-3 bg-graphite-800/50 rounded-full" />
                      <div className="h-2 w-32 bg-graphite-800/40 rounded" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Empty Detail Panel (Right: occuping remaining width) */}
        <section className="flex-1 bg-graphite-900 flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
          <div className="max-w-md space-y-6">
            {/* Center Inbox Clean Logo */}
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

            {/* Keyboard shortcuts quick reference card */}
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
        </section>
      </main>
    </div>
  );
}

export default App;
