import { GatewayClient, DashboardData } from "@/lib/gateway-client";
import { readSessionFromCookies } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

let gatewayClient: GatewayClient | null = null;

async function initializeGateway() {
  if (gatewayClient) return gatewayClient;

  // Get credentials from encrypted session cookie
  const config = await readSessionFromCookies();

  if (!config || !config.url || !config.token) {
    return null;
  }

  gatewayClient = new GatewayClient(config);

  try {
    await gatewayClient.connect();
  } catch (error) {
    console.error("Failed to connect to gateway:", error);
    gatewayClient = null;
    throw error;
  }

  return gatewayClient;
}

export async function GET(request: NextRequest) {
  try {
    const client = await initializeGateway();

    if (!client) {
      return NextResponse.json(
        { error: "No gateway session available. Please log in." },
        { status: 401 }
      );
    }

    const data = client.getCachedData();
    const health = client.getSystemHealth();

    const response: DashboardData = {
      agents: data.agents || [],
      sessions: data.sessions || [],
      tasks: data.tasks || [],
      health,
      taskStats: data.taskStats || {
        total: 0,
        completed: 0,
        inProgress: 0,
        blocked: 0,
        completedToday: 0,
      },
      stats: data.stats || {
        activeAgents: 0,
        activeSessions: 0,
        tasksCompletedToday: 0,
        avgTaskDuration: 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard data",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
