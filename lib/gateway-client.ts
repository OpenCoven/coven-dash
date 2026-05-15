/**
 * Gateway WebSocket Client
 * Handles live connection to Coven gateway with auto-reconnect and health monitoring
 */

export interface GatewayConfig {
  url: string;
  token: string;
  password?: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  status: "online" | "offline" | "busy" | "idle";
  currentTask?: string;
  uptime: number; // seconds
  tasksCompleted: number;
  avatar?: string;
}

export interface SessionMetadata {
  id: string;
  agentId: string;
  harness: string;
  status: "active" | "idle" | "completed" | "failed";
  startedAt: number;
  tasksInFlight: number;
}

export interface SystemHealth {
  gatewayConnected: boolean;
  memoryLayerHealthy: boolean;
  pluginsHealthy: boolean;
  lastHeartbeat: number;
  reconnectAttempts: number;
}

export interface DashboardData {
  agents: AgentStatus[];
  sessions: SessionMetadata[];
  health: SystemHealth;
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
  };
}

export class GatewayClient {
  private config: GatewayConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();
  private cachedData: Partial<DashboardData> = {};
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat = Date.now();

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
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
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (e) {
            console.error("[Gateway] Failed to parse message:", e);
          }
        };

        this.ws.onerror = (error) => {
          console.error("[Gateway] WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("[Gateway] Disconnected");
          this.stopHeartbeat();
          this.attemptReconnect();
        };
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
      // Request initial data
      this.send({ type: "subscribe", channel: "dashboard" });
    }

    if (data.type === "agent_status_update") {
      this.updateAgentStatus(data.agent);
    }

    if (data.type === "session_update") {
      this.updateSession(data.session);
    }

    if (data.type === "dashboard_snapshot") {
      this.cachedData = data;
      this.emit("dashboard_update", data);
    }

    if (data.type === "health_update") {
      this.cachedData.health = data.health;
      this.emit("health_update", data.health);
    }

    if (data.type === "error") {
      console.error("[Gateway] Error:", data.message);
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

    this.emit("sessions_update", this.cachedData.sessions);
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
