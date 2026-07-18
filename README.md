# Yellow.ai Take-Home: The Conversation Inbox

A triage-first workspace designed specifically for a CX agent. Instead of a generic chronological ticket feed, this workspace uses a prioritized queue driven by a computed urgency score. It is built with **Vite**, **React 18**, **TypeScript (strict mode)**, **Tailwind CSS**, **MSW**, and **TanStack Query**.

---

## Key Features

1. **Prioritized Queue Listing**: Automatically sorts conversations descending by computed urgency index. Completed (resolved) items animate out of the DOM immediately, shortening the active triage queue.
2. **Urgency Score Calculator**: A pure, unit-tested points scoring engine that computes urgency index values (0 to 100+) based on customer parameters:
   - **Customer Tier**: VIP (+30), PRIME (+15), Standard (+0).
   - **Customer Sentiment**: Angry (+40), Frustrated (+20), Positive (-10 reduction).
   - **Response Latency**: 1.5 points per minute of wait time (capped at 60 points max).
   - **Escalation Reason**: SLA Breach (+50), Billing Dispute (+20), Technical Bug (+15), Negative Sentiment (+10).
3. **Signature Urgency Chip**: A pill badge (e.g. `SLA Breach · Angry · waited 14m · VIP`) that explains to the agent exactly why the ticket is positioned in the queue.
4. **Optimistic UI Panel Merging**: Opens conversation details instantly by displaying cached list parameters in the header while loading detailed transcripts and email/phone info in the background.
5. **Robust Write Path Recovery (Failed-Write UI)**:
   - The resolve action has a simulated **25% failure chance** (configurable to 100% via the header checkbox control).
   - If resolve fails, the item slides back into the list, and a red inline warning banner is displayed inside the detail pane containing **Retry** and **Dismiss** controls.
6. **Keyboard-First Hotkeys**: Fully functional keyboard shortcuts with visible focus indicators:
   - `j` / `k` (or Arrow Down / Arrow Up): Move selection through the queue list.
   - `c`: Claim the active unassigned ticket.
   - `r`: Resolve the selected ticket.
   - `s`: Snooze the selected ticket.
   - `/`: Focus the search input field.
   - `Esc`: Clear selection or blur search focus.

---

## Technical Stack & Architecture

- **React 18 & TS Strict Mode**: Strict compile-time checks (`verbatimModuleSyntax: true`).
- **Tailwind CSS**: Custom named base palettes (`graphite-50` to `graphite-950`) and semantic urgency colors (`urgency-calm`, `urgency-elevated`, `urgency-critical`) defined in `tailwind.config.js`.
- **MSW (Mock Service Worker)**: Simulates a real REST API endpoint inside the browser worker thread. Integrates an in-memory mock database to preserve agent claiming/resolving changes.
- **TanStack Query**: Coordinates query fetches, invalidate updates, and mutation lifecycles (`onMutate`, `onError`, `onSettled`) to handle optimistic UI and rollbacks.
- **Vitest**: Unit testing suite to validate scoring calculations.

---

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd "The-Conversation-Inbox"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Scripts

- **Start Dev Server**: Run `npm run dev` to start the local Vite development server.
- **Production Build**: Run `npm run build` to verify compiling, formatting, and assets bundling.
- **Lint Code**: Run `npm run lint` to inspect code issues with ESLint.
- **Format Code**: Run `npm run format` to auto-format TypeScript and Markdown files with Prettier.
- **Run Unit Tests**: Run `npm run test` to run the scoring engine tests under Vitest.
