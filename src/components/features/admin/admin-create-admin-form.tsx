"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/fetch-json";
import { queryKeys } from "@/lib/query-keys";

import type { FormEvent } from "react";

const fieldClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AdminCreateAdminForm() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (body: {
      action: "create_admin";
      username: string;
      password: string;
    }) => {
      await fetchJson("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onSuccess: (_data, variables) => {
      setUsername("");
      setPassword("");
      setSuccess(`Admin @${variables.username} aangemaakt.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers() });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(null);
    createMutation.mutate({
      action: "create_admin",
      username: username.trim(),
      password,
    });
  }

  const error =
    createMutation.error instanceof Error ? createMutation.error.message : null;

  return (
    <div className="max-w-md space-y-3">
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p
          className="border-accent/40 bg-accent/10 text-foreground rounded-md border px-3 py-2 text-sm"
          role="status"
        >
          {success}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Gebruikersnaam
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            required
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Wachtwoord
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            className={fieldClass}
          />
        </label>

        <button
          type="submit"
          disabled={createMutation.isPending || !username.trim() || !password}
          className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium disabled:opacity-50"
        >
          {createMutation.isPending ? "Aanmaken…" : "Admin aanmaken"}
        </button>
      </form>
    </div>
  );
}
