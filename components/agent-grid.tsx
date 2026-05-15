"use client";

import { useEffect, useState } from "react";
import { AgentStatus } from "@/lib/gateway-client";
import {
  Circle,
  Activity,
  AlertCircle,
  CheckCircle,
  Zap,
  Plus,
} from "lucide-react";

interface AgentGridProps {
  agents: AgentStatus[];
  loading: boolean;
}

const statusColors = {
  online: "bg-green-500",
  offline: "bg-gray-500",
  busy: "bg-blue-500",
  idle: "bg-yellow-500",
};

const statusLabels = {
  online: "Online",
  offline: "Offline",
  busy: "Busy",
  idle: "Idle",
};

export function AgentGrid({ agents, loading }: AgentGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="bg-slate-800 rounded-lg p-4 animate-pulse h-40"
            />
          ))}
      </div>
    );
  }

  if (!agents.length) {
    return (
      <div className="text-center py-12 bg-slate-800 rounded-lg">
        <Zap className="mx-auto h-12 w-12 text-slate-500 mb-2" />
        <p className="text-slate-400">No agents connected yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${statusColors[agent.status]}`}
              />
              <h3 className="font-medium text-white">{agent.name}</h3>
            </div>
            <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded">
              {statusLabels[agent.status]}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Tasks Completed</span>
              <span className="text-slate-200 font-medium">
                {agent.tasksCompleted}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Uptime</span>
              <span className="text-slate-200 font-medium">
                {formatUptime(agent.uptime)}
              </span>
            </div>
            {agent.currentTask && (
              <div className="flex justify-between">
                <span className="text-slate-400">Current</span>
                <span className="text-slate-200 font-medium truncate">
                  {agent.currentTask}
                </span>
              </div>
            )}
          </div>

          <button className="w-full mt-4 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">
            Delegate Task
          </button>
        </div>
      ))}
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}
