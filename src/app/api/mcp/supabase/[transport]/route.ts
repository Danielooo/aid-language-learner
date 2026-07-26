import { createProjectMcpHandler } from "@/lib/mcp/create-route-handler";
import { registerSupabaseTools } from "@/lib/mcp/supabase-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const handler = createProjectMcpHandler(
  registerSupabaseTools,
  "/api/mcp/supabase",
  "aid-language-learner-supabase",
);

export { handler as GET, handler as POST, handler as DELETE };
