type ChartEmptyStateProps = {
  title: string;
  message?: string;
};

export function ChartEmptyState({ title, message }: ChartEmptyStateProps) {
  return (
    <div className="border-border bg-muted/20 flex h-40 flex-col items-center justify-center rounded-md border border-dashed px-4 text-center">
      <p className="text-foreground text-sm font-medium">{title}</p>
      {message && (
        <p className="text-muted-foreground mt-1 max-w-sm text-xs">{message}</p>
      )}
    </div>
  );
}
