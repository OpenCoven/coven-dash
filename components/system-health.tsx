"use client";

import { SystemHealth } from "@/lib/gateway-client";
import { Activity, AlertCircle, CheckCircle } from "lucide-react";

interface SystemHealthCardProps {
  health: SystemHealth | null;
  loading: boolean;
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function SystemHealthCard({ health, loading }: SystemHealthCardProps) {
  if (loading || !health) {
    return (
      <div className="rounded-lg p-4 bg-slate-800/50 border border-slate-700 animate-pulse h-64" />
    );
  }

  const components = [
    {
      label: "Gateway",
      healthy: health.gatewayConnected,
      attempts: health.reconnectAttempts,
    },
    {
      label: "Memory Layer",
      healthy: health.memoryLayerHealthy,
    },
    {
      label: "Plugins",
      healthy: health.pluginsHealthy,
    },
  ];

  return (
    <div className="rounded-lg p-4 bg-slate-800/50 border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold text-white">System Status</h3>
      </div>

      <div className="space-y-3">
        {components.map((comp, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-slate-300">{comp.label}</span>
            <div className="flex items-center gap-2">
              {comp.healthy ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Healthy</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Error</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 mb-2">
          Last heartbeat {formatUptime(Date.now() - health.lastHeartbeat)}
        </p>
        {health.reconnectAttempts > 0 && (
          <p className="text-xs text-yellow-400">
            Reconnection attempts: {health.reconnectAttempts}
          </p>
        )}
      </div>
    </div>
  );
}
