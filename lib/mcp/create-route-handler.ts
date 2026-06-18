import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "mcp-handler";

import { assertMcpRequestAllowed } from "./guard";

type RegisterTools = (server: McpServer) => void;

export function createProjectMcpHandler(
  registerTools: RegisterTools,
  basePath: string,
  serverName: string,
) {
  const mcpHandler = createMcpHandler(
    registerTools,
    {
      serverInfo: {
        name: serverName,
        version: "1.0.0",
      },
    },
    {
      basePath,
      maxDuration: 60,
      verboseLogs: process.env.NODE_ENV === "development",
    },
  );

  return async (request: Request): Promise<Response> => {
    const blocked = assertMcpRequestAllowed(request);
    if (blocked) return blocked;
    return mcpHandler(request);
  };
}
