import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";

import { mcpErrorText, mcpJsonText } from "./response";

const DEFAULT_REPO = "Danielooo/aid-language-learner";

function getGithubToken(): string {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("GITHUB_PERSONAL_ACCESS_TOKEN ontbreekt in .env.local.");
  }
  return token;
}

async function githubFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getGithubToken();
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
  });

  const body = await response.text();
  let parsed: unknown = body;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    parsed = body;
  }

  if (!response.ok) {
    throw new Error(
      `GitHub API ${response.status}: ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`,
    );
  }

  return parsed as T;
}

export function registerGithubTools(server: McpServer) {
  server.registerTool(
    "github_repo_status",
    {
      title: "GitHub repo status",
      description:
        "Haal metadata op van het aid-language-learner repository.",
      inputSchema: {
        repo: z.string().default(DEFAULT_REPO),
      },
    },
    async ({ repo }) => {
      try {
        const data = await githubFetch<Record<string, unknown>>(`/repos/${repo}`);
        return mcpJsonText({
          ok: true,
          full_name: data.full_name,
          private: data.private,
          default_branch: data.default_branch,
          html_url: data.html_url,
          pushed_at: data.pushed_at,
          open_issues_count: data.open_issues_count,
        });
      } catch (error) {
        return mcpErrorText(
          error instanceof Error ? error.message : "Onbekende fout",
        );
      }
    },
  );

  server.registerTool(
    "github_list_pull_requests",
    {
      title: "List pull requests",
      description: "Lijst pull requests van het repository.",
      inputSchema: {
        repo: z.string().default(DEFAULT_REPO),
        state: z.enum(["open", "closed", "all"]).default("open"),
        limit: z.number().int().min(1).max(50).default(10),
      },
    },
    async ({ repo, state, limit }) => {
      try {
        const pulls = await githubFetch<
          Array<{
            number: number;
            title: string;
            state: string;
            html_url: string;
            user: { login: string } | null;
            created_at: string;
            updated_at: string;
          }>
        >(`/repos/${repo}/pulls?state=${state}&per_page=${limit}`);

        return mcpJsonText({
          ok: true,
          count: pulls.length,
          pull_requests: pulls.map((pr) => ({
            number: pr.number,
            title: pr.title,
            state: pr.state,
            author: pr.user?.login ?? null,
            html_url: pr.html_url,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
          })),
        });
      } catch (error) {
        return mcpErrorText(
          error instanceof Error ? error.message : "Onbekende fout",
        );
      }
    },
  );

  server.registerTool(
    "github_get_file",
    {
      title: "Get file contents",
      description: "Haal de inhoud van een bestand op uit het repository.",
      inputSchema: {
        repo: z.string().default(DEFAULT_REPO),
        path: z.string().min(1),
        ref: z.string().default("main"),
      },
    },
    async ({ repo, path, ref }) => {
      try {
        const data = await githubFetch<{
          name: string;
          path: string;
          sha: string;
          size: number;
          content?: string;
          encoding?: string;
        }>(`/repos/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`);

        let text: string | null = null;
        if (data.content && data.encoding === "base64") {
          text = Buffer.from(data.content, "base64").toString("utf8");
        }

        return mcpJsonText({
          ok: true,
          name: data.name,
          path: data.path,
          sha: data.sha,
          size: data.size,
          content: text,
        });
      } catch (error) {
        return mcpErrorText(
          error instanceof Error ? error.message : "Onbekende fout",
        );
      }
    },
  );

  server.registerTool(
    "github_list_issues",
    {
      title: "List issues",
      description: "Lijst recente issues van het repository.",
      inputSchema: {
        repo: z.string().default(DEFAULT_REPO),
        state: z.enum(["open", "closed", "all"]).default("open"),
        limit: z.number().int().min(1).max(50).default(10),
      },
    },
    async ({ repo, state, limit }) => {
      try {
        const issues = await githubFetch<
          Array<{
            number: number;
            title: string;
            state: string;
            html_url: string;
            user: { login: string } | null;
            created_at: string;
            updated_at: string;
            pull_request?: unknown;
          }>
        >(`/repos/${repo}/issues?state=${state}&per_page=${limit}`);

        const filtered = issues.filter((issue) => !issue.pull_request);

        return mcpJsonText({
          ok: true,
          count: filtered.length,
          issues: filtered.map((issue) => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            author: issue.user?.login ?? null,
            html_url: issue.html_url,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
          })),
        });
      } catch (error) {
        return mcpErrorText(
          error instanceof Error ? error.message : "Onbekende fout",
        );
      }
    },
  );
}
