"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/routes";

import { LeerplanGroupCard } from "./leerplan-group-card";
import { LeerplanGroupModal } from "./leerplan-group-modal";

import type {
  ExerciseGroupDetail,
  ExerciseGroupDetailSuccess,
  ExerciseGroupListItem,
  ExerciseGroupsListSuccess,
} from "@/types/exercise-groups";

type TabId = "global" | "personal";

type LeerplanGroupsPageProps = {
  onStatsChange?: (stats: {
    personalCount: number;
    activeCount: number;
    globalCount: number;
  }) => void;
};

async function fetchGroups(
  scope: "global" | "mine",
): Promise<ExerciseGroupListItem[]> {
  const res = await fetch(`/api/exercise-groups/${scope}`, {
    cache: "no-store",
  });
  const body = (await res.json()) as ExerciseGroupsListSuccess & {
    error?: string;
  };
  if (!res.ok || !body.ok) {
    throw new Error(body.error ?? `Status ${res.status}`);
  }
  return body.groups;
}

async function fetchGroupDetail(
  scope: "global" | "mine",
  id: string,
): Promise<ExerciseGroupDetail> {
  const res = await fetch(`/api/exercise-groups/${scope}/${id}`, {
    cache: "no-store",
  });
  const body = (await res.json()) as ExerciseGroupDetailSuccess & {
    error?: string;
  };
  if (!res.ok || !body.ok) {
    throw new Error(body.error ?? `Status ${res.status}`);
  }
  return body.group;
}

export function LeerplanGroupsPage({ onStatsChange }: LeerplanGroupsPageProps) {
  const [tab, setTab] = useState<TabId>("personal");
  const [globalGroups, setGlobalGroups] = useState<ExerciseGroupListItem[]>([]);
  const [personalGroups, setPersonalGroups] = useState<ExerciseGroupListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingName, setTogglingName] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalScope, setModalScope] = useState<"global" | "mine">("global");
  const [modalGroupId, setModalGroupId] = useState<string | null>(null);
  const [modalName, setModalName] = useState<string | null>(null);
  const [modalDetail, setModalDetail] = useState<ExerciseGroupDetail | null>(
    null,
  );
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [copyBusy, setCopyBusy] = useState(false);

  const refreshLists = useCallback(async () => {
    const [global, personal] = await Promise.all([
      fetchGroups("global"),
      fetchGroups("mine"),
    ]);
    setGlobalGroups(global);
    setPersonalGroups(personal);
    onStatsChange?.({
      personalCount: personal.length,
      activeCount: personal.filter((g) => g.isActive).length,
      globalCount: global.length,
    });
  }, [onStatsChange]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        await refreshLists();
      } catch (err) {
        if (!cancelled) {
          setGlobalGroups([]);
          setPersonalGroups([]);
          setError(
            err instanceof Error ? err.message : "Kon groepen niet laden.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshLists]);

  async function handleToggleActive(name: string, isActive: boolean) {
    const previous = personalGroups;
    setTogglingName(name);
    setPersonalGroups((current) =>
      current.map((item) =>
        item.name === name ? { ...item, isActive } : item,
      ),
    );
    onStatsChange?.({
      personalCount: previous.length,
      activeCount: previous.filter((g) =>
        g.name === name ? isActive : g.isActive,
      ).length,
      globalCount: globalGroups.length,
    });

    try {
      const res = await fetch("/api/learning-topics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: name, isActive }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      await refreshLists();
    } catch (err) {
      setPersonalGroups(previous);
      onStatsChange?.({
        personalCount: previous.length,
        activeCount: previous.filter((g) => g.isActive).length,
        globalCount: globalGroups.length,
      });
      setError(
        err instanceof Error ? err.message : "Kon voorkeur niet opslaan.",
      );
    } finally {
      setTogglingName(null);
    }
  }

  async function openModal(
    scope: "global" | "mine",
    item: ExerciseGroupListItem,
  ) {
    setModalScope(scope);
    setModalGroupId(item.id);
    setModalName(item.name);
    setModalOpen(true);
    setModalDetail(null);
    setModalError(null);
    setModalLoading(true);

    try {
      const detail = await fetchGroupDetail(scope, item.id);
      setModalDetail(detail);
      setModalName(detail.name);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Kon groep niet laden.",
      );
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    if (copyBusy) return;
    setModalOpen(false);
    setModalGroupId(null);
    setModalName(null);
    setModalDetail(null);
    setModalError(null);
  }

  async function handleCopy() {
    if (!modalGroupId || modalDetail?.alreadyCopied) return;
    setCopyBusy(true);
    setModalError(null);

    try {
      const res = await fetch(
        `/api/exercise-groups/global/${modalGroupId}/copy`,
        { method: "POST" },
      );
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      await refreshLists();
      setTab("personal");
      setModalOpen(false);
      setModalGroupId(null);
      setModalName(null);
      setModalDetail(null);
      setModalError(null);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Kopiëren mislukt.",
      );
    } finally {
      setCopyBusy(false);
    }
  }

  const tabButtonClass = (id: TabId) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      tab === id
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const visibleGroups = tab === "global" ? globalGroups : personalGroups;

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Leerplan-tabs"
        className="flex flex-wrap gap-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "personal"}
          onClick={() => setTab("personal")}
          className={tabButtonClass("personal")}
        >
          Persoonlijke oefeningengroepen ({personalGroups.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "global"}
          onClick={() => setTab("global")}
          className={tabButtonClass("global")}
        >
          Community oefeningengroepen ({globalGroups.length})
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : visibleGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {tab === "personal" ? (
            <>
              Nog geen persoonlijke oefeningengroepen.{" "}
              <Link
                href={APP_ROUTES.generator}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Genereer oefeningen
              </Link>{" "}
              of haal een community-oefeningengroep binnen.
            </>
          ) : (
            "Geen community-oefeningengroepen beschikbaar."
          )}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleGroups.map((item) => (
            <LeerplanGroupCard
              key={item.id}
              item={item}
              variant={tab}
              toggling={togglingName === item.name}
              onOpen={() =>
                openModal(tab === "global" ? "global" : "mine", item)
              }
              onToggleActive={
                tab === "personal" ? handleToggleActive : undefined
              }
            />
          ))}
        </div>
      )}

      <LeerplanGroupModal
        open={modalOpen}
        name={modalName}
        members={modalDetail?.members ?? []}
        loading={modalLoading}
        busy={copyBusy}
        showCopyAction={modalScope === "global"}
        alreadyCopied={
          modalDetail?.alreadyCopied ??
          (modalScope === "global" &&
            Boolean(
              modalName &&
                personalGroups.some((g) => g.name === modalName),
            ))
        }
        error={modalError}
        onClose={closeModal}
        onCopy={handleCopy}
      />
    </div>
  );
}
