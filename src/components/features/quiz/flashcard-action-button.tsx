type FlashcardActionButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "success" | "danger" | "accent";
};

const variantClasses = {
  default: "border border-input bg-background hover:bg-muted text-foreground",
  success:
    "border border-emerald-500/30 bg-emerald-600 text-white hover:bg-emerald-600/90",
  danger:
    "border border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/90",
  accent:
    "border border-accent/30 bg-accent text-accent-foreground hover:bg-accent/90",
};

export function FlashcardActionButton({
  label,
  onClick,
  disabled = false,
  variant = "default",
}: FlashcardActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-14 w-full cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 ${variantClasses[variant]}`}
    >
      {label}
    </button>
  );
}
