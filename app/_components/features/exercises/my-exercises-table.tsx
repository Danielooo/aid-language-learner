"use client";

import type { AdminExerciseRow } from "@/lib/exercises/types";

type MyExercisesTableProps = {
  rows: AdminExerciseRow[];
  selectedIds: Set<string>;
  onToggle: (exerciseId: string) => void;
  onToggleAll: () => void;
  onRowClick: (row: AdminExerciseRow) => void;
  disabled?: boolean;
};

function formatAltsPreview(alts: string[]): string {
  if (alts.length === 0) return "—";
  if (alts.length === 1) return alts[0];
  return `${alts[0]} · +${alts.length - 1}`;
}

/**
 * Read-only overzichtstabel; dubbelklik (of Enter) opent de bewerk-modal.
 */
export function MyExercisesTable({
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
  onRowClick,
  disabled = false,
}: MyExercisesTableProps) {
  const allSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(r.exercise_id));

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2 align-middle">
              <input
                type="checkbox"
                checked={allSelected}
                disabled={disabled || rows.length === 0}
                onChange={onToggleAll}
                aria-label="Alles selecteren"
                className="size-4 rounded border-border accent-accent"
              />
            </th>
            <th className="px-3 py-2">Bron</th>
            <th className="px-3 py-2">Vertaling</th>
            <th className="px-3 py-2">Alternatieven</th>
            <th className="px-3 py-2">Topic</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = selectedIds.has(row.exercise_id);
            const alts = row.alternative_translations;
            const extra = Math.max(0, alts.length - 1);
            return (
              <tr
                key={row.exercise_id}
                tabIndex={0}
                title="Dubbelklik om te bewerken"
                onDoubleClick={() => {
                  if (!disabled) onRowClick(row);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !disabled) onRowClick(row);
                }}
                className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
              >
                <td
                  className="px-3 py-2 align-middle"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onToggle(row.exercise_id)}
                    aria-label={`Selecteer oefening ${row.sentence_text}`}
                    className="size-4 rounded border-border accent-accent"
                  />
                </td>
                <td
                  className="max-w-[14rem] truncate px-3 py-2 align-middle text-foreground"
                  title={row.sentence_text}
                >
                  {row.sentence_text}
                </td>
                <td
                  className="max-w-[14rem] truncate px-3 py-2 align-middle text-foreground"
                  title={row.target_text}
                >
                  {row.target_text}
                </td>
                <td className="px-3 py-2 align-middle">
                  <span className="inline-flex max-w-[14rem] items-center gap-1.5">
                    <span
                      className="truncate text-foreground"
                      title={formatAltsPreview(alts)}
                    >
                      {alts[0] ?? "—"}
                    </span>
                    {extra > 0 && (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                        +{extra}
                      </span>
                    )}
                  </span>
                </td>
                <td
                  className="max-w-[10rem] truncate px-3 py-2 align-middle text-muted-foreground"
                  title={row.topic ?? undefined}
                >
                  {row.topic?.trim() ? row.topic : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
