"use client";

import { SystemHealth } from "@/lib/gateway-client";
import {
  CheckCircle,
  AlertCircle,
  WifiOff,
  Activity,
  AlertTriangle,
} from "lucide-react";

interface SystemHealthProps {
  health: SystemHealth | null;
  loading: boolean;
}

export function SystemHealthCard({ health, loading }: SystemHealthProps) {
  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 animate-pulse h-48" />
    );
  }

  if (!health) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-red-900/50">
        <h3 className="font-semibold text-red-400 mb-2">Health Unavailable</h3>
        <p className="text-sm text-slate-400">
          Unable to fetch system health data
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="font-semibold text-white mb-4">System Health</h3>

      <div className="space-y-3">
        <HealthItem
          label="Gateway"
          status={health.gatewayConnected}
          icon={<Activity className="w-4 h-4" />}
        />
        <HealthItem
          label="Memory Layer"
          status={health.memoryLayerHealthy}
          icon={<Activity className="w-4 h-4" />}
        />
        <HealthItem
          label="Plugins"
          status={health.pluginsHealthy}
          icon={<Activity className="w-4 h-4" />}
        />

        <div className="pt-3 border-t border-slate-700">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Reconnect Attempts</span>
            <span
              className={
                health.reconnectAttempts > 0
                  ? "text-yellow-400 font-medium"
                  : "text-slate-300"
              }
            >
              {health.reconnectAttempts}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthItem({
  label,
  status,
  icon,
}: {
  label: string;
  status: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="text-slate-400">{icon}</div>
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      {status ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-500" />
      )}
    </div>
  );
}
