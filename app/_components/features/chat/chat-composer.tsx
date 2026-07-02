"use client";

type ChatComposerProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
  isBusy: boolean;
  placeholder: string;
};

export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  onStop,
  isBusy,
  placeholder,
}: ChatComposerProps) {
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          disabled={isBusy}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
        />
        {isBusy ? (
          <button
            type="button"
            onClick={onStop}
            className="cursor-pointer rounded-md border border-border px-3 text-xs font-medium hover:bg-muted"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="cursor-pointer rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Verstuur
          </button>
        )}
      </form>
  );
}
