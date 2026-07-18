function App() {
  return (
    <div className="min-h-screen bg-graphite-950 flex flex-col justify-center items-center p-8 selection:bg-graphite-800 selection:text-white">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <header className="space-y-3">
          <span className="text-xs font-semibold tracking-widest text-graphite-400 uppercase font-sans">
            Yellow.ai Take-Home
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-graphite-50 font-display">
            Conversation Inbox
          </h1>
          <p className="text-graphite-300 max-w-md mx-auto text-sm sm:text-base font-sans">
            A triage-first workspace for CX agents. Powered by calculated urgency routing and
            keyboard navigation.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          {/* Calm Card */}
          <div className="p-5 rounded-lg border bg-urgency-calm/10 border-urgency-calm/30 text-left relative overflow-hidden group hover:border-urgency-calm/50 transition-colors duration-200">
            <div className="absolute top-0 left-0 w-1 h-full bg-urgency-calm/80" />
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-urgency-calm/20 text-urgency-calm border border-urgency-calm/20 mb-3 font-sans">
              Calm
            </span>
            <h3 className="font-semibold text-graphite-100 font-sans text-sm mb-1">
              General Inquiry
            </h3>
            <p className="text-xs text-graphite-400 font-sans leading-relaxed">
              Standard tier customer asking about billing details. Response time target: 2 hours.
            </p>
          </div>

          {/* Elevated Card */}
          <div className="p-5 rounded-lg border bg-urgency-elevated/10 border-urgency-elevated/30 text-left relative overflow-hidden group hover:border-urgency-elevated/50 transition-colors duration-200">
            <div className="absolute top-0 left-0 w-1 h-full bg-urgency-elevated/80" />
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-urgency-elevated/20 text-urgency-elevated border border-urgency-elevated/20 mb-3 font-sans">
              Elevated
            </span>
            <h3 className="font-semibold text-graphite-100 font-sans text-sm mb-1">
              Cart Abandonment
            </h3>
            <p className="text-xs text-graphite-400 font-sans leading-relaxed">
              Elevated wait time (18 mins) for a logged-in user with items in cart.
            </p>
          </div>

          {/* Critical Card */}
          <div className="p-5 rounded-lg border bg-urgency-critical/10 border-urgency-critical/30 text-left relative overflow-hidden group hover:border-urgency-critical/50 transition-colors duration-200">
            <div className="absolute top-0 left-0 w-1 h-full bg-urgency-critical/80" />
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-urgency-critical/20 text-urgency-critical border border-urgency-critical/20 mb-3 font-sans">
              Critical
            </span>
            <h3 className="font-semibold text-graphite-100 font-sans text-sm mb-1">
              VIP SLA Warning
            </h3>
            <p className="text-xs text-graphite-400 font-sans leading-relaxed">
              Angry sentiment on tier-1 VIP client. Immediate attention required.
            </p>
          </div>
        </div>

        <footer className="pt-8 border-t border-graphite-800/60">
          <p className="text-xs text-graphite-500 font-sans">
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-graphite-900 border border-graphite-800 rounded text-graphite-400 font-mono text-[10px]">
              J
            </kbd>{' '}
            or{' '}
            <kbd className="px-1.5 py-0.5 bg-graphite-900 border border-graphite-800 rounded text-graphite-400 font-mono text-[10px]">
              K
            </kbd>{' '}
            to explore keyboard cues (coming in Step 3).
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
