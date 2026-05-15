/**
 * Gateway WebSocket Client (Node.js Runtime)
 * Handles live connection to Coven gateway with auto-reconnect and health monitoring
 * Uses 'ws' package for Node.js environments (Vercel, etc.)
 * Protocol: Coven event stream (agents, sessions, tasks, memory updates)
 */

import { WebSocket } from "ws";

export interface GatewayConfig {
  url: string;
  token: string;
  password?: string;
}

// Agent identity and status from Coven
export interface AgentStatus {
  id: string;
  name: string;  // Nova, Cody, Sage, Charm, Kitty, etc.
  status: "online" | "offline" | "busy" | "idle";
  currentTask?: string;
  uptime: number; // seconds
  tasksCompleted: number;
  tasksInProgress: number;
  avatar?: string; // URL to agent avatar
  lastSeen: number; // Unix timestamp
}

// Session metadata from Coven daemon
export interface SessionMetadata {
  id: string;           // Session UUID
  agentId: string;      // Agent harness (codex, claude, etc)
  projectRoot: string;  // Repository path
  harness: string;      // Harness type: codex, claude-code, etc
  status: "active" | "idle" | "completed" | "failed";
  startedAt: number;    // Unix timestamp
  tasksInFlight: number;
  uptime: number;       // Seconds running
}

export interface TaskMetadata {
  id: string;
  sessionId: string;
  description: string;
  status: "pending" | "in-progress" | "done" | "blocked";
  priority: "low" | "medium" | "high";
  assignedTo: string;   // Agent name
  createdAt: number;
  completedAt?: number;
}

export interface SystemHealth {
  gatewayConnected: boolean;
  memoryLayerHealthy: boolean;
  pluginsHealthy: boolean;
  lastHeartbeat: number;
  reconnectAttempts: number;
  uptime: number; // Daemon uptime
}

export interface DashboardData {
  agents: AgentStatus[];
  sessions: SessionMetadata[];
  tasks: TaskMetadata[];
  health: SystemHealth;
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
    completedToday: number;
  };
  stats: {
    activeAgents: number;
    activeSessions: number;
    tasksCompletedToday: number;
    avgTaskDuration: number; // seconds
  };
}

export class GatewayClient {
  private config: GatewayConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();
  private cachedData: Partial<DashboardData> = {
    agents: [],
    sessions: [],
    tasks: [],
    taskStats: {
      total: 0,
      completed: 0,
      inProgress: 0,
      blocked: 0,
      completedToday: 0,
    },
    stats: {
      activeAgents: 0,
      activeSessions: 0,
      tasksCompletedToday: 0,
      avgTaskDuration: 0,
    },
  };
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat = Date.now();
  private connectedAt: number = 0;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.on("open", () => {
          console.log("[Gateway] Connected");
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;

          // Authenticate
          this.send({
            type: "auth",
            token: this.config.token,
            password: this.config.password,
          });

          // Start heartbeat
          this.startHeartbeat();

          resolve();
        });

        this.ws.on("message", (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (e) {
            console.error("[Gateway] Failed to parse message:", e);
          }
        });

        this.ws.on("error", (error: Error) => {
          console.error("[Gateway] WebSocket error:", error);
          reject(error);
        });

        this.ws.on("close", () => {
          console.log("[Gateway] Disconnected");
          this.stopHeartbeat();
          this.attemptReconnect();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(data: any): void {
    this.lastHeartbeat = Date.now();

    if (data.type === "auth_success") {
      console.log("[Gateway] Authenticated");
      this.connectedAt = Date.now();
      // Request initial data
      this.send({ type: "subscribe", channel: "dashboard" });
    }

    // Agent events
    if (data.type === "agent_status" || data.type === "agent_status_update") {
      this.updateAgentStatus(data.agent);
    }

    // Session events
    if (data.type === "session_started" || data.type === "session_update") {
      this.updateSession(data.session);
    }

    // Task events
    if (data.type === "task_created" || data.type === "task_updated") {
      this.updateTask(data.task);
    }

    // Bulk snapshot
    if (data.type === "dashboard_snapshot") {
      this.cachedData = { ...this.cachedData, ...data.payload };
      this.computeStats();
      this.emit("dashboard_update", this.cachedData);
    }

    // Health updates
    if (data.type === "health_update" || data.type === "system_health") {
      this.cachedData.health = data.health || data.payload;
      this.emit("health_update", this.cachedData.health);
    }

    if (data.type === "pong") {
      // Heartbeat response
    }

    if (data.type === "error") {
      console.error("[Gateway] Error:", data.message);
      this.emit("error", data.message);
    }
  }

  private updateAgentStatus(agent: AgentStatus): void {
    if (!this.cachedData.agents) {
      this.cachedData.agents = [];
    }

    const index = this.cachedData.agents.findIndex((a) => a.id === agent.id);
    if (index >= 0) {
      this.cachedData.agents[index] = agent;
    } else {
      this.cachedData.agents.push(agent);
    }

    this.emit("agents_update", this.cachedData.agents);
  }

  private updateSession(session: SessionMetadata): void {
    if (!this.cachedData.sessions) {
      this.cachedData.sessions = [];
    }

    const index = this.cachedData.sessions.findIndex((s) => s.id === session.id);
    if (index >= 0) {
      this.cachedData.sessions[index] = session;
    } else {
      this.cachedData.sessions.push(session);
    }

    this.computeStats();
    this.emit("sessions_update", this.cachedData.sessions);
  }

  private updateTask(task: TaskMetadata): void {
    if (!this.cachedData.tasks) {
      this.cachedData.tasks = [];
    }

    const index = this.cachedData.tasks.findIndex((t) => t.id === task.id);
    if (index >= 0) {
      this.cachedData.tasks[index] = task;
    } else {
      this.cachedData.tasks.push(task);
    }

    this.computeStats();
    this.emit("tasks_update", this.cachedData.tasks);
  }

  private computeStats(): void {
    const now = Date.now();
    const todayStart = new Date(now).setHours(0, 0, 0, 0);

    const tasks = this.cachedData.tasks || [];
    const taskStats = {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "done").length,
      inProgress: tasks.filter((t) => t.status === "in-progress").length,
      blocked: tasks.filter((t) => t.status === "blocked").length,
      completedToday: tasks.filter(
        (t) => t.status === "done" && t.completedAt && t.completedAt > todayStart
      ).length,
    };

    const agents = this.cachedData.agents || [];
    const sessions = this.cachedData.sessions || [];

    const stats = {
      activeAgents: agents.filter((a) => a.status === "online" || a.status === "busy").length,
      activeSessions: sessions.filter((s) => s.status === "active").length,
      tasksCompletedToday: taskStats.completedToday,
      avgTaskDuration: this.calculateAvgTaskDuration(tasks),
    };

    this.cachedData.taskStats = taskStats;
    this.cachedData.stats = stats;
  }

  private calculateAvgTaskDuration(tasks: TaskMetadata[]): number {
    const completed = tasks.filter((t) => t.status === "done" && t.completedAt);
    if (completed.length === 0) return 0;

    const total = completed.reduce((acc, t) => {
      return acc + ((t.completedAt || 0) - t.createdAt);
    }, 0);

    return Math.round(total / completed.length / 1000); // Convert to seconds
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: "ping" });
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[Gateway] Max reconnect attempts reached");
      this.emit("connection_failed");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[Gateway] Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    setTimeout(() => {
      this.connect().catch((e) => {
        console.error("[Gateway] Reconnect failed:", e);
      });
    }, this.reconnectDelay);

    // Exponential backoff: cap at 30s
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)!) {
        try {
          callback(data);
        } catch (e) {
          console.error(`[Gateway] Listener error for ${event}:`, e);
        }
      }
    }
  }

  getCachedData(): Partial<DashboardData> {
    return this.cachedData;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getSystemHealth(): SystemHealth {
    return (
      this.cachedData.health || {
        gatewayConnected: this.isConnected(),
        memoryLayerHealthy: true,
        pluginsHealthy: true,
        lastHeartbeat: this.lastHeartbeat,
        reconnectAttempts: this.reconnectAttempts,
        uptime: Math.floor((Date.now() - this.connectedAt) / 1000),
      }
    );
  }
}

// Singleton instance for server-side use
let clientInstance: GatewayClient | null = null;

export function getGatewayClient(config?: GatewayConfig): GatewayClient {
  if (!clientInstance && config) {
    clientInstance = new GatewayClient(config);
  }
  if (!clientInstance) {
    throw new Error("Gateway client not initialized");
  }
  return clientInstance;
}
