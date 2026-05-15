# coven-dash — Production Coven Dashboard

A **fresh, production-ready dashboard** for Coven agents, built with Next.js 14, TypeScript, React, and Tailwind CSS. Real data from the Coven gateway, zero mock data.

## Features

- ✨ **Live agent status grid** — See all agents at a glance
- 📊 **Quick stats** — Active sessions, tasks in flight, completed tasks, blocked items
- 🟢 **System health monitoring** — Gateway, memory layer, plugins status
- 🔄 **Auto-reconnect** — WebSocket connection with exponential backoff
- 📱 **Responsive design** — Desktop, tablet, phone optimized
- ♿ **Accessible** — WCAG AA compliant

## Tech Stack

- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI:** React with Lucide icons
- **Deployment:** Vercel
- **Package:** `@opencoven/dash` (npm)

## Getting Started

### Prerequisites

- Node.js 18+ (tested with v24.13.0)
- npm or yarn

### Installation

1. Clone the repository:

```bash
cd ~/Documents/GitHub/OpenCoven/coven-dash
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env.local
# Edit .env.local with your gateway details
```

4. Start development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

```
GATEWAY_URL=wss://your-gateway-url.com
GATEWAY_TOKEN=your-secure-token
GATEWAY_PASSWORD=optional-password
```

## Pages

- **Dashboard Home** (`/dashboard`) — Agent status grid, quick stats, system health, quick actions
- **Sessions Browser** (coming in next step) — Live session list, filters, quick actions
- **Tasks & Delegation** (coming in next step) — Task board with drag-drop delegation
- **Cross-Project Dashboard** (coming in next step) — Projects, stats, agent utilization

## Architecture

### WebSocket Gateway Client (`lib/gateway-client.ts`)

- Server-side connection to Coven gateway
- Auto-reconnect with exponential backoff (max 30s delay)
- Health monitoring and caching
- Event-based data updates

### API Route (`app/api/dashboard/route.ts`)

- Provides cached dashboard data to frontend
- Handles gateway initialization
- Graceful error handling

### Components

- `QuickStats` — Overview metrics
- `SystemHealthCard` — Health status indicators
- `AgentGrid` — Agent cards with status and quick actions

## Development

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import repository in Vercel
3. Add environment variables
4. Deploy (auto on push)

### Docker

```bash
docker build -t coven-dash .
docker run -p 3000:3000 -e GATEWAY_URL=... coven-dash
```

## Next Steps

1. ✅ Set up Next.js repo structure
2. ✅ Implement gateway WebSocket client (server-side)
3. ✅ Build Dashboard Home page
4. ⬜ Add Sessions Browser page
5. ⬜ Add Tasks & Delegation page
6. ⬜ Add Cross-Project page
7. ⬜ Test with real gateway
8. ⬜ Deploy to Vercel

## Success Criteria

- ✅ Zero mock data (all live from gateway)
- ⬜ Connection stays alive (auto-reconnect working)
- ✅ Dashboard Home page functional
- ⬜ All 4 pages functional
- ⬜ Productivity metrics accurate
- ⬜ Deployed to Vercel
- ⬜ Multi-user ready

## Contributing

See AGENTS.md for contribution guidelines.

## License

Proprietary. For OpenCoven team only.

---

**Built with ✨ for Coven**
