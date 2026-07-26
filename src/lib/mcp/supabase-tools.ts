import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { mcpErrorText, mcpJsonText } from "./response";

function getManagementConfig() {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!projectRef || !accessToken) {
    throw new Error(
      "SUPABASE_PROJECT_REF en SUPABASE_ACCESS_TOKEN ontbreken in .env.local.",
    );
  }

  return { projectRef, accessToken };
}

async function managementFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { projectRef, accessToken } = getManagementConfig();
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    },
  );

  const body = await response.text();
  let parsed: unknown = body;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    parsed = body;
  }

  if (!response.ok) {
    throw new Error(
      `Supabase Management API ${response.status}: ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`,
    );
  }

  return parsed as T;
}

function assertSelectOnly(sql: string) {
  const normalized = sql.trim().replace(/;+\s*$/, "");
  if (!/^select\b/i.test(normalized)) {
    throw new Error("Alleen SELECT-queries zijn toegestaan.");
  }
  if (/[;]/.test(normalized.slice(6))) {
    throw new Error("Meerdere statements zijn niet toegestaan.");
  }
}

export function registerSupabaseTools(server: McpServer) {
  server.registerTool(
    "supabase_project_status",
    {
      title: "Supabase project status",
      description:
        "Haal projectnaam, status en regio op via de Supabase Management API.",
      inputSchema: {},
    },
    async () => {
      try {
        const project = await managementFetch<Record<string, unknown>>("");
        return mcpJsonText({
          ok: true,
          id: project.id,
          name: project.name,
          status: project.status,
          region: project.region,
          database: project.database,
        });
      } catch (error) {
        return mcpErrorText(
          error instanceof Error ? error.message : "Onbekende fout",
        );
      }
    },
  );

  server.registerTool(
    "supabase_list_exercises",
    {
      title: "List exercises",
      description:
        "Lijst oefeningen uit public.exercises (en fallback dev_exercises) met optioneel topic-filter.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(20),
        topic: z.string().optional(),
        table: z.enum(["exercises", "dev_exercises"]).default("exercises"),
      },
    },
    async ({ limit, topic, table }) => {
      try {
        const supabase = getSupabaseAdmin();
        let query = supabase
          .from(table)
          .select("id, source_text, target_text, topic, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (topic) {
          query = query.eq("topic", topic);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        return mcpJsonText({
          ok: true,
          table,
          count: data?.length ?? 0,
          rows: data,
        });
      } catch (error) {
        return mcpErrorText(
          error instanceof Error ? error.message : "Onbekende fout",
        );
      }
    },
  );

  server.registerTool(
    "supabase_count_audio_metadata",
    {
      title: "Count Tatoeba audio metadata",
      description:
        "Tel oefeningen met Tatoeba-audio metadata in public.exercises.",
      inputSchema: {},
    },
    async () => {
      try {
        const supabase = getSupabaseAdmin();

        const [withAudio, withSentence, total] = await Promise.all([
          supabase
            .from("exercises")
            .select("id", { count: "exact", head: true })
            .not("audio_path", "is", null),
          supabase
            .from("exercises")
            .select("id", { count: "exact", head: true })
            .not("tatoeba_sentence_id", "is", null),
          supabase
            .from("exercises")
            .select("id", { count: "exact", head: true }),
        ]);

        if (withAudio.error) throw new Error(withAudio.error.message);
        if (withSentence.error) throw new Error(withSentence.error.message);
        if (total.error) throw new Error(total.error.message);

        return mcpJsonText({
          ok: true,
          total_exercises: total.count ?? 0,
          with_audio_path: withAudio.count ?? 0,
          with_tatoeba_sentence_id: withSentence.count ?? 0,
        });
      } catch (error) {
        return mcpErrorText(
          error instanceof Error ? error.message : "Onbekende fout",
        );
      }
    },
  );

  server.registerTool(
    "supabase_execute_sql_readonly",
    {
      title: "Execute read-only SQL",
      description:
        "Voer een SELECT-query uit via de Supabase Management API (alleen SELECT).",
      inputSchema: {
        query: z.string().min(1),
      },
    },
    async ({ query }) => {
      try {
        assertSelectOnly(query);
        const result = await managementFetch<unknown>("/database/query", {
          method: "POST",
          body: JSON.stringify({ query }),
        });
        return mcpJsonText({ ok: true, result });
      } catch (error) {
        return mcpErrorText(
          error instanceof Error ? error.message : "Onbekende fout",
        );
      }
    },
  );
}
