/** Gedeelde SVG-iconen voor audio-afspelen (luidspreker / pauze). */

export function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className ?? "size-3.5"}
    >
      <path d="M8.5 2.5a.75.75 0 0 0-1.28-.53L3.78 5.5H1.75A.75.75 0 0 0 1 6.25v3.5c0 .414.336.75.75.75h2.03l3.44 3.53A.75.75 0 0 0 8.5 13.5V2.5Z" />
      <path d="M10.72 5.22a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95.75.75 0 1 1-1.06-1.06 2 2 0 0 0 0-2.83.75.75 0 0 1 0-1.06Z" />
      <path d="M12.49 3.45a.75.75 0 0 1 1.06 0 6 6 0 0 1 0 8.49.75.75 0 1 1-1.06-1.06 4.5 4.5 0 0 0 0-6.37.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className ?? "size-3.5"}
    >
      <path d="M3.5 2h2.5v12H3.5V2zm6.5 0H12.5v12H10V2z" />
    </svg>
  );
}
