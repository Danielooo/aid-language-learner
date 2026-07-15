type ChartEmptyStateProps = {
  title: string;
  message?: string;
};

export function ChartEmptyState({ title, message }: ChartEmptyStateProps) {
  return (
    <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-4 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {message && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
