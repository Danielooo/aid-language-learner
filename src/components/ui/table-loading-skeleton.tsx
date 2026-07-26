import { cn } from "@/lib/utils";

type TableLoadingSkeletonProps = {
  /** Aantal kolommen (pulse-bars per rij). */
  columns: number;
  /** Aantal skeleton-rijen. Default 5. */
  rows?: number;
  className?: string;
};

/**
 * Tabel-chrome pulse voor initial load (layout-vorm telt).
 * Geen business-copy — alleen visuele placeholder.
 */
export function TableLoadingSkeleton({
  columns,
  rows = 5,
  className,
}: TableLoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Bezig met laden"
      className={cn(
        "border-border overflow-x-auto rounded-md border",
        className,
      )}
    >
      <table className="w-full text-left text-sm">
        <thead className="border-border bg-muted/40 border-b">
          <tr>
            {Array.from({ length: columns }, (_, i) => (
              <th key={i} className="px-3 py-2">
                <div className="bg-muted h-3 w-16 animate-pulse rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIdx) => (
            <tr key={rowIdx} className="border-border border-b last:border-0">
              {Array.from({ length: columns }, (_, colIdx) => (
                <td key={colIdx} className="px-3 py-3">
                  <div
                    className={cn(
                      "bg-muted/70 h-3 animate-pulse rounded",
                      colIdx === 0 ? "w-28" : "w-16",
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
