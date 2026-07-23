"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import { ChatBubble, ChatTypingIndicator } from "./chat-bubble";
import { getMessageText } from "./message-text";

import type { UIMessage } from "ai";

type ChatStatus = "submitted" | "streaming" | "ready" | "error";

type ChatThreadProps = {
  messages: UIMessage[];
  status: ChatStatus;
  emptyState?: React.ReactNode;
  getAssistantFallbackText?: (message: UIMessage) => string | null;
  className?: string;
};

function resolveMessageText(
  message: UIMessage,
  getAssistantFallbackText?: (message: UIMessage) => string | null,
): string | null {
  let text: string | null = getMessageText(message);
  if (!text && message.role === "assistant" && getAssistantFallbackText) {
    text = getAssistantFallbackText(message);
  }
  return text;
}

export function ChatThread({
  messages,
  status,
  emptyState,
  getAssistantFallbackText,
  className,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const lastHasDisplayableText =
    lastMessage != null &&
    resolveMessageText(lastMessage, getAssistantFallbackText) != null;

  // Typing blijft tot er displaybare bubbeltekst is (ook tijdens streaming
  // met tool-only/lege assistant-messages).
  const showTypingIndicator =
    isBusy &&
    (messages.length === 0 ||
      lastMessage?.role === "user" ||
      (lastMessage?.role === "assistant" && !lastHasDisplayableText));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status, showTypingIndicator]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "min-h-[4.5rem] max-h-[min(16rem,40vh)] space-y-2 overflow-y-auto rounded-xl bg-chat-thread-bg px-7 py-3",
        className,
      )}
      aria-live="polite"
      aria-busy={isBusy}
    >
      {messages.length === 0 && !showTypingIndicator && emptyState}

      {messages.map((message, index) => {
        if (message.role !== "user" && message.role !== "assistant") {
          return null;
        }

        const text = resolveMessageText(message, getAssistantFallbackText);

        // Geen lege assistant-bubbles; typing dekt de busy-gap.
        if (!text) {
          return null;
        }

        return (
          <ChatBubble
            key={`${message.id}-${index}`}
            role={message.role}
            messageId={`${message.id}-${index}`}
          >
            {text}
          </ChatBubble>
        );
      })}

      {showTypingIndicator && <ChatTypingIndicator />}
    </div>
  );
}
