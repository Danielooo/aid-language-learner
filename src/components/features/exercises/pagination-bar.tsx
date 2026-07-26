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
    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-xs">
      <span>
        {total === 0 ? "Geen records" : `${start}–${end} van ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="border-border text-foreground hover:bg-muted inline-flex h-9 items-center rounded-md border px-3 text-xs disabled:opacity-50"
        >
          Vorige
        </button>
        <span className="tabular-nums">
          Pagina {page} van {totalPages}
        </span>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="border-border text-foreground hover:bg-muted inline-flex h-9 items-center rounded-md border px-3 text-xs disabled:opacity-50"
        >
          Volgende
        </button>
      </div>
    </div>
  );
}
