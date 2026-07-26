"use client";

import { useEffect, useRef } from "react";

import type {
  TopicProgressRow,
  TopicProgressStatus,
} from "@/lib/dashboard/types";

type TopicProgressModalProps = {
  topic: TopicProgressRow | null;
  open: boolean;
  onClose: () => void;
};

const STATUS_LABEL: Record<TopicProgressStatus, string> = {
  "nog-starten": "Nog starten",
  bezig: "Bezig",
  "ver-gevorderd": "Ver gevorderd",
  beheerst: "Beheerst",
};

const STATUS_BADGE_CLASS: Record<TopicProgressStatus, string> = {
  "nog-starten": "bg-muted text-muted-foreground",
  bezig: "bg-[#3b82f6]/20 text-foreground",
  "ver-gevorderd": "bg-chart-neutral/25 text-foreground",
  beheerst: "bg-chart-correct/20 text-foreground",
};

const BUCKET_ROWS = [
  {
    key: "nogNiet" as const,
    label: "Nog niet",
    detail: "0× goed",
    barClass: "bg-muted-foreground/40",
  },
  {
    key: "bezig" as const,
    label: "Bezig",
    detail: "1–3× goed",
    barClass: "bg-[#3b82f6]",
  },
  {
    key: "gevorderd" as const,
    label: "Gevorderd",
    detail: "4–8× goed",
    barClass: "bg-chart-neutral",
  },
  {
    key: "beheerst" as const,
    label: "Beheerst",
    detail: "9×+ goed",
    barClass: "bg-chart-correct",
  },
];

function CrossIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function TopicProgressModal({
  topic,
  open,
  onClose,
}: TopicProgressModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  if (!open || !topic) return null;

  const maxBucket = Math.max(
    1,
    topic.buckets.nogNiet,
    topic.buckets.bezig,
    topic.buckets.gevorderd,
    topic.buckets.beheerst,
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="border-border bg-card text-card-foreground backdrop:bg-foreground/40 fixed inset-0 m-auto h-fit max-h-[85vh] w-[min(420px,90vw)] rounded-lg border p-0"
    >
      <div className="flex max-h-[85vh] flex-col">
        <header className="border-border relative space-y-2 border-b px-5 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{topic.topic}</h2>
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[topic.status]}`}
            >
              {STATUS_LABEL[topic.status]}
            </span>
          </div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {topic.percentMastered}%
          </p>
          <p className="text-muted-foreground text-sm">
            Voortgang tot alles beheerst (9× goed per oefening)
            {topic.masteredCount > 0
              ? ` · ${topic.masteredCount.toLocaleString("nl-NL")} van ${topic.totalCount.toLocaleString("nl-NL")} al op 9×+`
              : null}
            {topic.dueCount > 0
              ? ` · ${topic.dueCount.toLocaleString("nl-NL")} aan de beurt`
              : null}
          </p>
          <button
            type="button"
            aria-label="Sluiten"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-md"
          >
            <CrossIcon />
          </button>
        </header>

        <div className="space-y-3 overflow-auto px-5 py-4">
          <p className="text-muted-foreground text-xs font-medium">Verdeling</p>
          <ul className="space-y-2.5">
            {BUCKET_ROWS.map((row) => {
              const count = topic.buckets[row.key];
              const widthPct = Math.round((count / maxBucket) * 100);
              return (
                <li key={row.key} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-foreground font-medium">
                      {row.label}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({row.detail})
                      </span>
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {count.toLocaleString("nl-NL")}
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full ${row.barClass}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </dialog>
  );
}
