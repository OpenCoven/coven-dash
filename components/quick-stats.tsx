"use client";

import { DashboardData } from "@/lib/gateway-client";
import {
  CheckCircle,
  Clock,
  Users,
  Zap,
} from "lucide-react";

interface QuickStatsProps {
  data: Partial<DashboardData>;
  loading: boolean;
}

export function QuickStats({ data, loading }: QuickStatsProps) {
  const stats = [
    {
      label: "Active Agents",
      value: data.stats?.activeAgents || 0,
      icon: Zap,
      color: "bg-purple-900/30 text-purple-400",
    },
    {
      label: "Active Sessions",
      value: data.stats?.activeSessions || 0,
      icon: Users,
      color: "bg-blue-900/30 text-blue-400",
    },
    {
      label: "Tasks In Flight",
      value: data.taskStats?.inProgress || 0,
      icon: Clock,
      color: "bg-yellow-900/30 text-yellow-400",
    },
    {
      label: "Completed Today",
      value: data.stats?.tasksCompletedToday || 0,
      icon: CheckCircle,
      color: "bg-green-900/30 text-green-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={i}
            className={`rounded-lg p-4 border border-slate-700 ${
              loading ? "animate-pulse" : ""
            }`}
          >
            <div className={`inline-block p-2 rounded ${stat.color} mb-2`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-slate-400 text-sm">{stat.label}</p>
            <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}
