import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Combineert conditionele classes (clsx) en lost Tailwind-conflicten op
// (tailwind-merge). Gebruik overal i.p.v. template-literals zodra er
// conditionele of dynamische class-namen in het spel zijn.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
