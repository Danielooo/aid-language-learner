"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChatComposer } from "@/app/_components/features/chat/chat-composer";
import { ChatThread } from "@/app/_components/features/chat/chat-thread";
import {
  EXERCISE_QUIZ_CHAT_MODEL,
  buildQuizChatSystemPrompt,
} from "@/lib/ai/exercise-quiz-chat-config";

import type { ExerciseQuizItem } from "@/types/quiz";
import type { QuizChatMode } from "@/lib/ai/exercise-quiz-chat-config";
import type { UIMessage } from "ai";

// Chat-paneel onder een actieve oefening tijdens quiz-sessies.
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
  const chatId = `quiz-chat-${exercise.id}`;

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
        <div className="flex flex-wrap items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearConversation}
              className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Gesprek wissen
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted"
          >
            {open ? "Verberg chat" : "Open chat"}
          </button>
        </div>
      </header>

      {open && (
        <>
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
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
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
