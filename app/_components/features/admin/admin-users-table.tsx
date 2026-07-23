"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api/fetch-json";
import { ConfirmDialog } from "@/app/_components/ui/confirm-dialog";

import type { AdminUserRow } from "@/app/api/admin/users/route";
import type { ReactNode } from "react";

type ListResponse =
  | { ok: true; rows: AdminUserRow[] }
  | { ok: false; error: string };

type RoleFilter = "all" | "admin" | "user";
type StatusFilter = "all" | "active" | "banned";
type AiFilter = "all" | "on" | "off";
type OpenFilter = "role" | "ai" | "status" | null;
type PendingAction = {
  type: "ban" | "delete";
  row: AdminUserRow;
};

function accountLabel(row: AdminUserRow): string {
  return row.display_name || row.username || row.id.slice(0, 8);
}

const filterControlClass =
  "rounded-md border border-input bg-background px-2 py-1.5 text-xs";

const actionBtnClass =
  "inline-flex h-7 w-[6.75rem] shrink-0 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-muted disabled:opacity-50";

const actionDangerClass =
  "inline-flex h-7 w-[6.75rem] shrink-0 items-center justify-center rounded-md border border-destructive/40 bg-background px-2 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50";

function FilterIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`size-3.5 shrink-0 ${active ? "text-accent" : "text-muted-foreground"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3.5h12L9.5 9v3.5L6.5 14V9L2 3.5Z" />
    </svg>
  );
}

function StatusBadge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "danger" | "ok";
}) {
  const toneClass =
    tone === "accent"
      ? "bg-accent/15 text-accent"
      : tone === "danger"
        ? "bg-destructive/10 text-destructive"
        : tone === "ok"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

type FilterOption<T extends string> = { value: T; label: string };

function ColumnFilterHeader<T extends string>({
  label,
  value,
  options,
  open,
  onToggle,
  onSelect,
}: {
  label: string;
  value: T;
  options: FilterOption<T>[];
  open: boolean;
  onToggle: () => void;
  onSelect: (next: T) => void;
}) {
  const active = value !== "all";
  const activeLabel = options.find((o) => o.value === value)?.label;

  return (
    <th className="relative px-3 py-2 font-medium">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left hover:bg-muted/80 ${active ? "text-accent" : "text-muted-foreground"
          }`}
      >
        <span>
          {label}
          {active && activeLabel ? (
            <span className="font-normal text-muted-foreground">
              {" "}
              · {activeLabel}
            </span>
          ) : null}
        </span>
        <FilterIcon active={active} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-3 top-full z-10 mt-1 min-w-[9rem] rounded-md border border-border bg-background py-1 shadow-md"
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`flex w-full px-3 py-1.5 text-left text-xs hover:bg-muted ${selected ? "font-medium text-accent" : "text-foreground"
                  }`}
                onClick={() => onSelect(opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </th>
  );
}

const ROLE_OPTIONS: FilterOption<RoleFilter>[] = [
  { value: "all", label: "Alles" },
  { value: "admin", label: "Admin" },
  { value: "user", label: "Gebruiker" },
];

const AI_OPTIONS: FilterOption<AiFilter>[] = [
  { value: "all", label: "Alles" },
  { value: "on", label: "Aan" },
  { value: "off", label: "Uit" },
];

const STATUS_OPTIONS: FilterOption<StatusFilter>[] = [
  { value: "all", label: "Alles" },
  { value: "active", label: "Actief" },
  { value: "banned", label: "Gedeactiveerd" },
];

export function AdminUsersTable() {
  const queryClient = useQueryClient();

  const {
    data: rows = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.adminUsers(),
    queryFn: async () => {
      const json = await fetchJson<ListResponse>("/api/admin/users");
      if (!json.ok) throw new Error(json.error);
      return json.rows;
    },
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [aiFilter, setAiFilter] = useState<AiFilter>("all");
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  const listError = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Laden mislukt."
    : null;

  const tableHeadRef = useRef<HTMLTableSectionElement>(null);

  const closeFilter = useEffectEvent(() => {
    setOpenFilter(null);
  });

  useEffect(() => {
    if (!openFilter) return;

    function onPointerDown(e: PointerEvent) {
      const el = tableHeadRef.current;
      if (el && !el.contains(e.target as Node)) {
        closeFilter();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeFilter();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== "all" && row.role !== roleFilter) return false;
      if (statusFilter === "active" && row.banned) return false;
      if (statusFilter === "banned" && !row.banned) return false;
      if (aiFilter === "on" && row.ai_disabled) return false;
      if (aiFilter === "off" && !row.ai_disabled) return false;
      if (!q) return true;
      const username = (row.username ?? "").toLowerCase();
      const displayName = (row.display_name ?? "").toLowerCase();
      return username.includes(q) || displayName.includes(q);
    });
  }, [rows, search, roleFilter, statusFilter, aiFilter]);

  const patchMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      await fetchJson("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      setPendingAction(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers() });
    },
  });

  function patch(body: Record<string, unknown>) {
    patchMutation.mutate(body);
  }

  function runPendingAction() {
    if (!pendingAction) return;
    const { type, row } = pendingAction;
    if (type === "ban") {
      patch({ action: "ban", user_id: row.id });
      return;
    }
    patch({ action: "delete", user_id: row.id });
  }

  function toggleFilter(key: Exclude<OpenFilter, null>) {
    setOpenFilter((prev) => (prev === key ? null : key));
  }

  const actionError =
    patchMutation.error instanceof Error
      ? patchMutation.error.message
      : null;

  const busy = patchMutation.isPending;

  const pendingLabel = pendingAction
    ? accountLabel(pendingAction.row)
    : "";

  const confirmCopy =
    pendingAction?.type === "ban"
      ? {
        title: "Account deactiveren?",
        description: (
          <>
            Weet je zeker dat je “{pendingLabel}” wilt deactiveren? Een
            nieuwe login wordt geblokkeerd. Een sessie die nu al openstaat
            blijft bruikbaar tot die gebruiker opnieuw moet inloggen.
          </>
        ),
        confirmLabel: "Deactiveren",
        pendingLabel: "Deactiveren…",
      }
      : pendingAction?.type === "delete" && pendingAction.row.role === "admin"
        ? {
          title: "Admin verwijderen?",
          description: (
            <>
              Weet je zeker dat je het admin-account “{pendingLabel}” wilt
              verwijderen?
            </>
          ),
          confirmLabel: "Verwijderen",
          pendingLabel: "Verwijderen…",
        }
        : {
          title: "Gebruiker verwijderen?",
          description: (
            <>
              Weet je zeker dat je “{pendingLabel}” definitief wilt
              verwijderen? Alle gegevens van deze gebruiker (oefeningen,
              voortgang, inzendingen) gaan permanent verloren.
            </>
          ),
          confirmLabel: "Verwijderen",
          pendingLabel: "Verwijderen…",
        };

  return (
    <div className="space-y-3">
      {(listError || actionError) && (
        <p className="text-sm text-destructive" role="alert">
          {listError ?? actionError}
        </p>
      )}

      <div className="rounded-md border border-border bg-muted/20 p-3">
        <label className="flex min-w-[200px] flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Zoeken
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Weergavenaam of gebruikersnaam…"
            className={filterControlClass}
          />
        </label>
      </div>

      {!loading && (
        <p className="text-[11px] text-muted-foreground">
          {filtered.length === rows.length
            ? `${rows.length} gebruiker${rows.length === 1 ? "" : "s"}`
            : `${filtered.length} van ${rows.length} gebruikers`}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead
            ref={tableHeadRef}
            className="border-b border-border bg-muted/40 text-xs text-muted-foreground"
          >
            <tr>
              <th className="px-3 py-2 font-medium">Gebruikersnaam</th>
              <th className="px-3 py-2 font-medium">Weergavenaam</th>
              <ColumnFilterHeader
                label="Rol"
                value={roleFilter}
                options={ROLE_OPTIONS}
                open={openFilter === "role"}
                onToggle={() => toggleFilter("role")}
                onSelect={(next) => {
                  setRoleFilter(next);
                  setOpenFilter(null);
                }}
              />
              <ColumnFilterHeader
                label="AI"
                value={aiFilter}
                options={AI_OPTIONS}
                open={openFilter === "ai"}
                onToggle={() => toggleFilter("ai")}
                onSelect={(next) => {
                  setAiFilter(next);
                  setOpenFilter(null);
                }}
              />
              <ColumnFilterHeader
                label="Status"
                value={statusFilter}
                options={STATUS_OPTIONS}
                open={openFilter === "status"}
                onToggle={() => toggleFilter("status")}
                onSelect={(next) => {
                  setStatusFilter(next);
                  setOpenFilter(null);
                }}
              />
              <th className="px-3 py-2 font-medium">Acties</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-xs text-muted-foreground"
                >
                  Gebruikers laden…
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-xs text-muted-foreground"
                >
                  Geen gebruikers gevonden.
                </td>
              </tr>
            )}

            {!loading && rows.length > 0 && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-xs text-muted-foreground"
                >
                  Geen gebruikers met deze filters.
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/60 last:border-b-0"
                >
                  <td className="px-3 py-2 font-medium">
                    {row.username ? (
                      <span>@{row.username}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {row.id.slice(0, 8)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.display_name ? (
                      row.display_name
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      tone={row.role === "admin" ? "accent" : "muted"}
                    >
                      {row.role === "admin" ? "Admin" : "Gebruiker"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={row.ai_disabled ? "danger" : "ok"}>
                      {row.ai_disabled ? "Uit" : "Aan"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={row.banned ? "danger" : "ok"}>
                      {row.banned ? "Gedeactiveerd" : "Actief"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-nowrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        className={actionBtnClass}
                        onClick={() =>
                          patch({
                            action: "set_ai_disabled",
                            user_id: row.id,
                            ai_disabled: !row.ai_disabled,
                          })
                        }
                      >
                        {row.ai_disabled ? "AI aan" : "AI uit"}
                      </button>
                      {row.banned ? (
                        <button
                          type="button"
                          disabled={busy}
                          className={actionBtnClass}
                          onClick={() =>
                            patch({ action: "unban", user_id: row.id })
                          }
                        >
                          Reactiveer
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          className={actionDangerClass}
                          onClick={() =>
                            setPendingAction({ type: "ban", row })
                          }
                        >
                          Deactiveer
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        className={actionDangerClass}
                        onClick={() =>
                          setPendingAction({ type: "delete", row })
                        }
                      >
                        Verwijderen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        pendingLabel={confirmCopy.pendingLabel}
        pending={busy}
        tone="danger"
        onCancel={() => {
          if (!busy) setPendingAction(null);
        }}
        onConfirm={runPendingAction}
      />
    </div>
  );
}
