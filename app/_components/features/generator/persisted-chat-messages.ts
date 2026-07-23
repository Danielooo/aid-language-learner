import { getMessageText } from "@/app/_components/features/chat/message-text";

import type { UIMessage } from "ai";

/** Compacte chatbubbels voor localStorage (zonder tool-payloads). */
export type PersistedChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export function parsePersistedChatMessages(
  value: unknown,
): PersistedChatMessage[] {
  if (!Array.isArray(value)) return [];
  const out: PersistedChatMessage[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const msg = item as Record<string, unknown>;
    if (typeof msg.id !== "string" || typeof msg.text !== "string") continue;
    // Oude drafts gebruikten role "status" i.p.v. "assistant".
    const role =
      msg.role === "user"
        ? "user"
        : msg.role === "assistant" || msg.role === "status"
          ? "assistant"
          : null;
    if (!role) continue;
    const text = msg.text.trim();
    if (!text) continue;
    out.push({ id: msg.id, role, text });
  }
  return out;
}

export function persistedMessagesToUIMessages(
  messages: PersistedChatMessage[],
): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.text }],
  }));
}

export function uiMessagesToPersisted(
  messages: UIMessage[],
  getAssistantFallbackText?: (message: UIMessage) => string | null,
): PersistedChatMessage[] {
  const out: PersistedChatMessage[] = [];
  for (const msg of messages) {
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    let text = getMessageText(msg);
    if (!text && msg.role === "assistant" && getAssistantFallbackText) {
      text = getAssistantFallbackText(msg) ?? "";
    }
    text = text.trim();
    if (!text) continue;
    out.push({ id: msg.id, role: msg.role, text });
  }
  return out;
}
