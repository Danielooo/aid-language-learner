"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChatComposer } from "@/app/_components/features/chat/chat-composer";
import { ChatThread } from "@/app/_components/features/chat/chat-thread";

import type { ExerciseQuizItem } from "@/types/quiz";
import type { QuizChatMode } from "@/lib/ai/exercise-quiz-chat-config";
import type { UIMessage } from "ai";

// Chat-paneel onder een actieve oefening tijdens Leren-sessies.
// Twee modes:
//   - before: nog niet ingediend / kaart nog niet omgedraaid → geen volledige vertaling.
//   - after:  antwoord gezien of ingediend → AI mag uitleggen.

type Feedback = {
  isCorrect?: boolean;
  correctAnswer: string;
};

type Props = {
  exercise: ExerciseQuizItem;
  feedback: Feedback | null;
  userAnswer: string;
};

export function ExerciseChat({ exercise, feedback, userAnswer }: Props) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const mode: QuizChatMode = feedback ? "after" : "before";
  const chatId = `quiz-chat-${exercise.id}`;

  const modeRef = useRef(mode);
  const userAnswerRef = useRef(userAnswer);
  const feedbackRef = useRef(feedback);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    userAnswerRef.current = userAnswer;
  }, [userAnswer]);
  useEffect(() => {
    feedbackRef.current = feedback;
  }, [feedback]);

  /* eslint-disable react-hooks/refs */
  const transport = useMemo(() => {
    return new DefaultChatTransport<UIMessage>({
      api: "/api/quiz/chat",
      body: () => ({
        mode: modeRef.current,
        exercise: {
          source_text: exercise.source_text,
          target_text: exercise.target_text,
          topic: exercise.topic,
        },
        userAnswer: userAnswerRef.current,
        isCorrect: feedbackRef.current?.isCorrect,
      }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/refs */

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    id: chatId,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage({ text });
    setInput("");
  }

  function applySuggestion(s: string) {
    setInput(s);
    setOpen(true);
  }

  function handleClearConversation() {
    setMessages([]);
    stop();
  }

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-6 sm:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              {mode === "before" ? "Hulp bij deze zin" : "Uitleg over je antwoord"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {mode === "before"
                ? "Vraag woordbetekenis of grammatica — geen volledige vertaling."
                : "Vraag uitleg, vervoegingen of of een alternatief ook geldig was."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearConversation}
                className="cursor-pointer rounded-xl border border-input bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Gesprek wissen
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="cursor-pointer rounded-xl border border-accent/30 bg-accent px-3 py-2 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              {open ? "Verberg chat" : "Open chat"}
            </button>
          </div>
        </header>

        {open && (
          <div className="space-y-3">
            <Suggestions mode={mode} onPick={applySuggestion} />

            <ChatThread
              messages={messages}
              status={status}
              emptyState={
                <p className="text-xs text-muted-foreground">
                  Nog geen berichten. Stel een vraag of klik een suggestie.
                </p>
              }
            />

            {error && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                <p className="font-medium">Fout in chat-request</p>
                <pre className="mt-1 font-mono">{error.message}</pre>
              </div>
            )}

            <ChatComposer
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              onStop={stop}
              isBusy={isBusy}
              placeholder={
                mode === "before"
                  ? "bv. Wat betekent het woord 'coche' letterlijk?"
                  : "bv. Is 'auto' ook een geldig alternatief?"
              }
            />
          </div>
        )}
      </div>
    </section>
  );
}

function Suggestions({
  mode,
  onPick,
}: {
  mode: QuizChatMode;
  onPick: (s: string) => void;
}) {
  const items =
    mode === "before"
      ? [
          "Wat betekent dit woord letterlijk: ",
          "Geef de vervoeging van: ",
          "Welke grammaticale tijd staat hier?",
        ]
      : [
          "Is mijn antwoord ook een geldig alternatief?",
          "Waarom moet het zo vertaald worden?",
          "Geef de vervoeging van het hoofdwerkwoord.",
        ];
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <li key={s}>
          <button
            type="button"
            onClick={() => onPick(s)}
            className="cursor-pointer rounded-xl border border-border/60 bg-background/80 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {s}
          </button>
        </li>
      ))}
    </ul>
  );
}
