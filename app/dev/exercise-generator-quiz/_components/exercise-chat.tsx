"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  EXERCISE_QUIZ_CHAT_MODEL,
  buildQuizChatSystemPrompt,
} from "@/lib/ai/exercise-quiz-chat-config";

import type { ExerciseQuizItem } from "@/app/api/dev/exercise-generator-quiz/route";
import type { QuizChatMode } from "@/lib/ai/exercise-quiz-chat-config";
import type { UIMessage } from "ai";

// Chat-paneel onder een actieve oefening in /dev/exercise-generator-quiz.
// Twee modes:
//   - before: nog niet ingediend → AI mag GEEN volledige vertaling geven.
//   - after:  ingediend → AI heeft target/userAnswer/isCorrect en mag uitleggen.
//
// Deze component wordt vanuit quiz.tsx gemount met `key={item.id}` zodat
// 'ie unmount/remount bij elke nieuwe oefening (chat-historie schoon).
// Mode-overgang binnen één oefening (before → after na "Controleren") gaat
// via refs: de transport-body is een functie die altijd de actuele mode
// uit refs leest. Zo blijft de transport stabiel maar is de body fris.

type Feedback = {
  isCorrect: boolean;
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

  // Refs zodat de body-functie van de DefaultChatTransport altijd verse
  // waarden ziet, ook als ze wijzigen tussen mount en send (bv. mode flipt
  // van "before" naar "after" zodra de gebruiker "Controleren" klikt).
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

  // Bouw één keer een transport met een body-fn die uit refs leest. Niet
  // opnieuw memoizen op props — de hele component remount al via
  // key={exercise.id} bij oefening-wissel.
  //
  // De `body`-callback wordt pas door de AI SDK aangeroepen op het moment
  // dat een bericht wordt verstuurd, dus `.current` lezen is daar veilig.
  // ESLint's `react-hooks/refs` ziet dat verschil niet en denkt dat we de
  // ref tijdens render aanraken — vandaar de localized disable.
  /* eslint-disable react-hooks/refs */
  const transport = useMemo(() => {
    return new DefaultChatTransport<UIMessage>({
      api: "/api/dev/exercise-quiz-chat",
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

  const { messages, sendMessage, status, error, stop } = useChat({
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

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4 text-card-foreground">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">
            {mode === "before" ? "Hulp bij deze zin" : "Uitleg over je antwoord"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {mode === "before"
              ? "Vraag woordbetekenis of grammatica — geen volledige vertaling."
              : "Vraag uitleg, vervoegingen of of een alternatief ook geldig was."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted"
        >
          {open ? "Verberg chat" : "Open chat"}
        </button>
      </header>

      {open && (
        <>
          <Suggestions mode={mode} onPick={applySuggestion} />

          <div className="min-h-[80px] space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nog geen berichten. Stel een vraag of klik een suggestie.
              </p>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
              <p className="font-medium">Fout in chat-request</p>
              <pre className="mt-1 font-mono">{error.message}</pre>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isBusy}
              placeholder={
                mode === "before"
                  ? "bv. Wat betekent het woord 'coche' letterlijk?"
                  : "bv. Is 'auto' ook een geldig alternatief?"
              }
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            />
            {isBusy ? (
              <button
                type="button"
                onClick={() => stop()}
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

          <DebugPanels
            exercise={exercise}
            mode={mode}
            userAnswer={userAnswer}
            feedback={feedback}
            messages={messages}
          />
        </>
      )}
    </section>
  );
}

// Helpers —————————————————————————————————————————————

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
            className="cursor-pointer rounded border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {s}
          </button>
        </li>
      ))}
    </ul>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`rounded-md border px-2.5 py-1.5 ${
        isUser
          ? "border-accent/40 bg-accent/10"
          : "border-border bg-background"
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {message.role}
      </p>
      <div className="mt-0.5 space-y-1 text-sm text-foreground">
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <span key={i} className="whitespace-pre-wrap">
                {part.text}
              </span>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function DebugPanels({
  exercise,
  mode,
  userAnswer,
  feedback,
  messages,
}: {
  exercise: ExerciseQuizItem;
  mode: QuizChatMode;
  userAnswer: string;
  feedback: Feedback | null;
  messages: UIMessage[];
}) {
  // Het system-prompt dat de server bouwt is een pure functie van mode +
  // exercise + userAnswer + isCorrect. We roepen dezelfde functie hier aan
  // zodat het paneel exact toont wat de LLM ziet — met één expliciete
  // afwijking: bij "before" laten we target_text WEL zien in de exercise-
  // input van het paneel (developer mag spieken), maar de prompt-bouwer
  // krijgt 'm niet binnen — net als de server.
  const systemPrompt = buildQuizChatSystemPrompt({
    mode,
    exercise:
      mode === "before"
        ? { source_text: exercise.source_text, topic: exercise.topic }
        : {
            source_text: exercise.source_text,
            target_text: exercise.target_text,
            topic: exercise.topic,
          },
    userAnswer,
    isCorrect: feedback?.isCorrect,
  });

  const requestBody = {
    mode,
    exercise: {
      source_text: exercise.source_text,
      target_text: exercise.target_text,
      topic: exercise.topic,
    },
    userAnswer,
    isCorrect: feedback?.isCorrect,
  };

  const openAiInput = {
    model: EXERCISE_QUIZ_CHAT_MODEL,
    system: systemPrompt,
    messages,
    requestBody,
  };

  return (
    <div className="space-y-2 pt-1">
      <DetailsPanel title="Verzonden naar OpenAI (system + messages + body)">
        <JsonBlock data={openAiInput} />
      </DetailsPanel>
      <DetailsPanel title="Ontvangen van OpenAI (useChat messages-state)">
        {messages.length > 0 ? (
          <JsonBlock data={messages} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Nog geen messages. Verstuur eerst een vraag.
          </p>
        )}
      </DetailsPanel>
    </div>
  );
}

function DetailsPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-md border border-border bg-card text-card-foreground">
      <summary className="cursor-pointer px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        {title}
      </summary>
      <div className="px-3 pb-3">{children}</div>
    </details>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="overflow-x-auto rounded bg-muted/40 p-2 font-mono text-[11px]">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
