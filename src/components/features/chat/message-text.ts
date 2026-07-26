import type { UIMessage } from "ai";

/** Haalt zichtbare tekst uit een UIMessage (alle text-parts samengevoegd). */
export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("");
}
