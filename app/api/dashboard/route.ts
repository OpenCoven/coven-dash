import { GatewayClient, DashboardData } from "@/lib/gateway-client";
import { NextRequest, NextResponse } from "next/server";

let gatewayClient: GatewayClient | null = null;

async function initializeGateway() {
  if (gatewayClient) return gatewayClient;

  const gatewayUrl = process.env.GATEWAY_URL;
  const gatewayToken = process.env.GATEWAY_TOKEN;
  const gatewayPassword = process.env.GATEWAY_PASSWORD;

  if (!gatewayUrl || !gatewayToken) {
    throw new Error(
      "GATEWAY_URL and GATEWAY_TOKEN environment variables are required"
    );
  }

  gatewayClient = new GatewayClient({
    url: gatewayUrl,
    token: gatewayToken,
    password: gatewayPassword,
  });

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

    // Get cached data
    const data = client.getCachedData();
    const health = client.getSystemHealth();

    const response: DashboardData = {
      agents: data.agents || [],
      sessions: data.sessions || [],
      health,
      taskStats: data.taskStats || {
        total: 0,
        completed: 0,
        inProgress: 0,
        blocked: 0,
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
