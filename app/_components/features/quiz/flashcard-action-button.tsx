import type { ReactNode } from "react";

type FlashcardActionButtonProps = {
  label: string;
  shortcut: string | string[];
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "success" | "danger" | "accent";
};

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border/80 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground">
      {children}
    </kbd>
  );
}

const variantClasses = {
  default:
    "border border-input bg-background hover:bg-muted text-foreground",
  success:
    "border border-emerald-500/30 bg-emerald-600 text-white hover:bg-emerald-600/90",
  danger:
    "border border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/90",
  accent:
    "border border-accent/30 bg-accent text-accent-foreground hover:bg-accent/90",
};

export function FlashcardActionButton({
  label,
  shortcut,
  onClick,
  disabled = false,
  variant = "default",
}: FlashcardActionButtonProps) {
  const keys = Array.isArray(shortcut) ? shortcut : [shortcut];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-14 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 ${variantClasses[variant]}`}
    >
      <span>{label}</span>
      {/* Sneltoets-hints zijn ruis op touch-schermen; alleen op ≥sm tonen. */}
      <span className="hidden items-center gap-1 sm:flex">
        {keys.map((key, i) => (
          <span key={key} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-[10px] font-normal opacity-60">/</span>
            )}
            <Kbd>{key}</Kbd>
          </span>
        ))}
      </span>
    </button>
  );
}
