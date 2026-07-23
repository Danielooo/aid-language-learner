"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/fetch-json";
import { queryKeys } from "@/lib/query-keys";
import { USER_AI_REQUESTS_PER_DAY } from "@/types/exercise-group-submission";

export type AiQuotaView = {
  remaining: number | null;
  limit: number;
  disabled: boolean;
};

type AiQuotaSuccess = {
  ok: true;
  remaining: number | null;
  limit: number;
  disabled: boolean;
};

type AiQuotaFailure = { ok: false; error: string };

export function useAiQuota() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.aiQuota(),
    queryFn: async (): Promise<AiQuotaView | null> => {
      try {
        const json = await fetchJson<AiQuotaSuccess | AiQuotaFailure>(
          "/api/exercises/ai-quota",
        );
        if (!json.ok) return null;
        return {
          remaining: json.remaining,
          limit: json.limit,
          disabled: json.disabled,
        };
      } catch {
        // Quota-badge is nice-to-have; stil falen mag.
        return null;
      }
    },
  });

  return {
    aiQuota: query.data ?? null,
    refreshAiQuota: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiQuota() });
    },
  };
}

export function formatQuotaLabel(quota: AiQuotaView | null): string | null {
  if (!quota) return null;
  if (quota.disabled) {
    return "AI-generatie is uitgeschakeld voor jouw account.";
  }
  if (quota.remaining === null) {
    return "AI-requests: onbeperkt";
  }
  const limit = quota.limit || USER_AI_REQUESTS_PER_DAY;
  return `Nog ${quota.remaining} van ${limit} AI-requests vandaag`;
}
