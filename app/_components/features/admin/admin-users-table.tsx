"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminUserRow } from "@/app/api/admin/users/route";

type ListResponse =
  | { ok: true; rows: AdminUserRow[] }
  | { ok: false; error: string };

export function AdminUsersTable() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const json = (await res.json()) as ListResponse;
    if (!json.ok) {
      setError(json.error);
      return;
    }
    setRows(json.rows);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function patch(body: Record<string, unknown>, userId: string) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? "Actie mislukt.");
        return;
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">AI</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Acties</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const busy = busyId === row.id;
              return (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {row.display_name || row.username || row.id.slice(0, 8)}
                    </div>
                    {row.username && (
                      <div className="text-xs text-muted-foreground">
                        @{row.username}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">{row.role}</td>
                  <td className="px-3 py-2">
                    {row.ai_disabled ? "uit" : "aan"}
                  </td>
                  <td className="px-3 py-2">
                    {row.banned ? "gedeactiveerd" : "actief"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs underline-offset-2 hover:underline disabled:opacity-50"
                        onClick={() =>
                          void patch(
                            {
                              action: "set_role",
                              user_id: row.id,
                              role: row.role === "admin" ? "user" : "admin",
                            },
                            row.id,
                          )
                        }
                      >
                        {row.role === "admin" ? "Maak user" : "Maak admin"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs underline-offset-2 hover:underline disabled:opacity-50"
                        onClick={() =>
                          void patch(
                            {
                              action: "set_ai_disabled",
                              user_id: row.id,
                              ai_disabled: !row.ai_disabled,
                            },
                            row.id,
                          )
                        }
                      >
                        {row.ai_disabled ? "AI aan" : "AI uit"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs underline-offset-2 hover:underline disabled:opacity-50"
                        onClick={() =>
                          void patch(
                            {
                              action: row.banned ? "unban" : "ban",
                              user_id: row.id,
                            },
                            row.id,
                          )
                        }
                      >
                        {row.banned ? "Reactiveer" : "Deactiveer"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
