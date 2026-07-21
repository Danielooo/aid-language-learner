"use client";

import { useEffect, useRef } from "react";

import { ChatBubble, ChatTypingIndicator } from "./chat-bubble";
import { getMessageText } from "./message-text";

import type { UIMessage } from "ai";

type ChatStatus = "submitted" | "streaming" | "ready" | "error";

type ChatThreadProps = {
  messages: UIMessage[];
  status: ChatStatus;
  emptyState?: React.ReactNode;
};

export function ChatThread({ messages, status, emptyState }: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";
  const showTypingIndicator =
    status === "submitted" &&
    (messages.length === 0 || messages[messages.length - 1]?.role === "user");

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status, showTypingIndicator]);

  return (
    <div
      ref={scrollRef}
      className="min-h-[4.5rem] max-h-[min(16rem,40vh)] space-y-2 overflow-y-auto rounded-xl bg-chat-thread-bg px-7 py-3"
      aria-live="polite"
      aria-busy={isBusy}
    >
      {messages.length === 0 && !showTypingIndicator && emptyState}

      {messages.map((message, index) => {
        if (message.role !== "user" && message.role !== "assistant") {
          return null;
        }

        const text = getMessageText(message);
        if (!text && message.role === "assistant" && isBusy) {
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
