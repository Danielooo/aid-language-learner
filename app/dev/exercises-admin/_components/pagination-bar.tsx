"use client";

type PaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export function PaginationBar({
  page,
  pageSize,
  total,
  disabled = false,
  onPageChange,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2 text-xs">
      <span className="text-muted-foreground">
        {total === 0
          ? "Geen records"
          : `Rijen ${start}–${end} van ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-border bg-card px-2.5 py-1 hover:bg-muted disabled:opacity-50"
        >
          Vorige
        </button>
        <span className="tabular-nums text-muted-foreground">
          Pagina {page} van {totalPages}
        </span>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-border bg-card px-2.5 py-1 hover:bg-muted disabled:opacity-50"
        >
          Volgende
        </button>
      </div>
    </div>
  );
}
