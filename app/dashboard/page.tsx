"use client";

import { useEffect, useState } from "react";
import { DashboardData } from "@/lib/gateway-client";
import { QuickStats } from "@/components/quick-stats";
import { SystemHealthCard } from "@/components/system-health";
import { AgentGrid } from "@/components/agent-grid";
import { Plus, RefreshCw, AlertTriangle } from "lucide-react";

export default function DashboardHome() {
  const [data, setData] = useState<Partial<DashboardData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const newData = await response.json();
      setData(newData);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchDashboardData, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Coven Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-400">Error</h3>
              <p className="text-red-300 text-sm">{error}</p>
              <p className="text-red-400 text-xs mt-2">
                Make sure GATEWAY_URL and GATEWAY_TOKEN are set.
              </p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Overview</h2>
          <QuickStats data={data} loading={loading} />
        </section>

        {/* System Health */}
        <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">Agents</h2>
            <AgentGrid agents={data.agents || []} loading={loading} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Status</h2>
            <SystemHealthCard health={data.health || null} loading={loading} />

            {/* Quick Actions */}
            <div className="mt-4 space-y-2">
              <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                New Session
              </button>
              <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Delegate Task
              </button>
            </div>
          </div>
        </section>

        {/* Footer Info */}
        <section className="mt-12 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm">
            💡 Tip: Data updates automatically every 5 seconds. Click "Refresh"
            for immediate updates.
          </p>
        </section>
      </main>
    </div>
  );
}
