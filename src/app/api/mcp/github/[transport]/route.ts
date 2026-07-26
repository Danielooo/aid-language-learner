import { createProjectMcpHandler } from "@/lib/mcp/create-route-handler";
import { registerGithubTools } from "@/lib/mcp/github-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const handler = createProjectMcpHandler(
  registerGithubTools,
  "/api/mcp/github",
  "aid-language-learner-github",
);

export { handler as GET, handler as POST, handler as DELETE };
