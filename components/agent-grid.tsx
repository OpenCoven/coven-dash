"use client";

import { AgentStatus } from "@/lib/gateway-client";
import { Bot } from "lucide-react";

interface AgentGridProps {
  agents: AgentStatus[];
  loading: boolean;
}

const STATUS_COLORS = {
  online: "bg-green-900/30 border-green-700 text-green-400",
  idle: "bg-slate-900/50 border-slate-700 text-slate-400",
  busy: "bg-yellow-900/30 border-yellow-700 text-yellow-400",
  offline: "bg-red-900/30 border-red-700 text-red-400",
};

const STATUS_DOTS = {
  online: "bg-green-500",
  idle: "bg-slate-500",
  busy: "bg-yellow-500",
  offline: "bg-red-500",
};

export function AgentGrid({ agents, loading }: AgentGridProps) {
  if (loading && agents.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-800/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12">
        <Bot className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
        <p className="text-slate-400">No agents connected yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => {
        const colorClass =
          STATUS_COLORS[agent.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.offline;
        const dotClass =
          STATUS_DOTS[agent.status as keyof typeof STATUS_DOTS] || STATUS_DOTS.offline;

        return (
          <div
            key={agent.id}
            className={`rounded-lg p-4 border transition-all hover:shadow-lg ${colorClass}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${dotClass}`}
                />
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate">
                    {agent.name}
                  </h3>
                  <p className="text-xs opacity-75 capitalize">{agent.status}</p>
                </div>
              </div>
              {agent.avatar && (
                <img
                  src={agent.avatar}
                  alt={agent.name}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
              )}
            </div>

            <div className="space-y-2 text-sm">
              {agent.currentTask && (
                <div>
                  <p className="opacity-75">Current Task:</p>
                  <p className="font-mono text-xs truncate opacity-90">
                    {agent.currentTask}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="opacity-75">Completed</p>
                  <p className="font-bold">{agent.tasksCompleted}</p>
                </div>
                <div>
                  <p className="opacity-75">In Progress</p>
                  <p className="font-bold">{agent.tasksInProgress}</p>
                </div>
              </div>
              {agent.uptime > 0 && (
                <div className="text-xs opacity-75">
                  Uptime: {formatUptime(agent.uptime)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
