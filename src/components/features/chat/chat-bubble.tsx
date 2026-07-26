"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

import { cn } from "@/lib/utils";

import { prefersReducedMotion } from "./prefers-reduced-motion";

gsap.registerPlugin(useGSAP);

type ChatBubbleRole = "user" | "assistant";

type ChatBubbleProps = {
  role: ChatBubbleRole;
  messageId: string;
  children: React.ReactNode;
  className?: string;
};

export function ChatBubble({
  role,
  messageId,
  children,
  className,
}: ChatBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const isUser = role === "user";

  useGSAP(
    () => {
      if (!bubbleRef.current) return;
      if (prefersReducedMotion()) {
        gsap.set(bubbleRef.current, { opacity: 1, scale: 1 });
        return;
      }
      gsap.fromTo(
        bubbleRef.current,
        {
          opacity: 0,
          scale: 0.82,
          transformOrigin: isUser ? "100% 100%" : "0% 100%",
        },
        {
          opacity: 1,
          scale: 1,
          duration: 0.35,
          ease: "back.out(1.35)",
        },
      );
    },
    { scope: bubbleRef, dependencies: [messageId], revertOnUpdate: true },
  );

  return (
    <div
      ref={bubbleRef}
      className={cn(
        "relative w-fit max-w-[min(85%,16rem)] rounded-[1.25rem] px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
        isUser
          ? "chat-bubble-sent text-accent-foreground ml-auto bg-[var(--chat-bubble-user)]"
          : "chat-bubble-received bg-chat-bubble-assistant text-chat-bubble-assistant-foreground ring-border/50 mr-auto shadow-sm ring-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Kleine assistant-bubble tijdens wachten op eerste stream-chunk. */
export function ChatTypingIndicator() {
  return (
    <ChatBubble role="assistant" messageId="typing-indicator">
      <span
        className="inline-flex items-center gap-1"
        aria-label="Assistent typt"
      >
        <span className="chat-typing-dot bg-muted-foreground/70 h-1.5 w-1.5 rounded-full" />
        <span className="chat-typing-dot animation-delay-150 bg-muted-foreground/70 h-1.5 w-1.5 rounded-full" />
        <span className="chat-typing-dot animation-delay-300 bg-muted-foreground/70 h-1.5 w-1.5 rounded-full" />
      </span>
    </ChatBubble>
  );
}
