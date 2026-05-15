## Quick Start for Next Steps

### Credentials Setup
```bash
cd ~/Documents/GitHub/OpenCoven/coven-dash

# Create .env.local for local development
cat > .env.local << 'EOF'
GATEWAY_URL=ws://localhost:9999
GATEWAY_TOKEN=your-token
GATEWAY_PASSWORD=optional-password
EOF

# Now test the dev server
npm run dev
```

### Running the Dashboard
```bash
# Terminal 1: Start Coven daemon
cd ~/Documents/GitHub/OpenCoven/coven
coven daemon start

# Terminal 2: Start dashboard
cd ~/Documents/GitHub/OpenCoven/coven-dash
npm run dev

# Open http://localhost:3000/dashboard
```

### File Structure for Reference
```
coven-dash/
├── app/
│   ├── layout.tsx           ← Root wrapper
│   ├── page.tsx             ← Home redirect
│   ├── dashboard/
│   │   └── page.tsx         ← Home page (DONE ✅)
│   └── api/
│       └── dashboard/
│           └── route.ts     ← API endpoint (DONE ✅)
├── components/
│   ├── quick-stats.tsx      ← Metrics grid (DONE ✅)
│   ├── agent-grid.tsx       ← Agent cards (DONE ✅)
│   └── system-health.tsx    ← Health monitoring (DONE ✅)
├── lib/
│   └── gateway-client.ts    ← WebSocket client (DONE ✅)
├── public/                  ← Static assets
├── package.json             ← Dependencies (pinned to v16.2.6)
├── tsconfig.json            ← TS strict mode
├── tailwind.config.ts       ← Dark theme
└── next.config.ts           ← Next.js config
```

### Build Commands
```bash
npm run dev      # Dev server with hot reload
npm run build    # Prod build (TypeScript + Turbopack)
npm start        # Run prod build locally
npm run lint     # ESLint check
```

### Next Page to Build: Sessions Browser

Use `/app/dashboard/page.tsx` as a template. Create:
```
app/sessions/page.tsx
components/sessions-table.tsx
components/session-filters.tsx
```

Quick structure:
```tsx
// app/sessions/page.tsx
export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [filters, setFilters] = useState({});
  
  useEffect(() => {
    // Fetch /api/sessions
  }, []);
  
  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <SessionsFilters />
      <SessionsTable sessions={sessions} />
    </div>
  );
}
```

### Important Notes
- **Keep v16.2.6 locked** in package.json — don't upgrade
- **Server-side only** for WebSocket (not browser)
- **Dark theme** throughout (tailwind.config.ts)
- **Responsive** (mobile-first breakpoints)
- **TypeScript strict** mode always enabled
- **Zero mock data** — always from gateway

### Debugging
```bash
# Check what's in the gateway
tail -f .coven/daemon.log

# TypeScript errors?
npm run build  # Will show exact line numbers

# Want to add logging?
console.log("[Gateway]", message);  // lib/gateway-client.ts
console.log("[Dashboard]", data);   // app/dashboard/page.tsx
```

---

**Next session:** Build Sessions Browser (Step 4) + start Tasks & Delegation (Step 5)  
**Reference:** BUILD_REPORT.md for full spec and architecture
