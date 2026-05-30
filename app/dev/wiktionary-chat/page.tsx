"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";

import type { UIMessage } from "ai";
import type { WiktionaryResult } from "@/lib/api/wiktionary";

type PreviewResponse = {
  model: string;
  word: string;
  focusLang: string;
  systemPrompt: string;
  wiktionaryResult: WiktionaryResult | null;
};

const SUGGESTIONS = ["hola", "casa", "perro", "comer", "rápido", "biblioteca"];

export default function WiktionaryChatPage() {
  const [word, setWord] = useState("hola");
  const [focusLang, setFocusLang] = useState("es");
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { messages, sendMessage, status, error, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/dev/chat" }),
  });

  // Vuur de preview opnieuw zodra word/focusLang verandert, zodat de
  // debug-panels meteen de Wiktionary-data + system prompt tonen die de
  // volgende chat-request gaat gebruiken. setState gebeurt alleen in de
  // async callbacks (legitiem "subscribe to external system"); voor het
  // leeg-woord-geval renderen we via `displayedPreview` hieronder.
  useEffect(() => {
    const trimmed = word.trim();
    if (!trimmed) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ word: trimmed, focus: focusLang });
    fetch(`/api/dev/chat/preview?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((r) => r.json() as Promise<PreviewResponse>)
      .then((data) => {
        setPreview(data);
        setPreviewError(null);
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name === "AbortError") return;
        setPreviewError(e instanceof Error ? e.message : "Onbekende fout");
      });
    return () => controller.abort();
  }, [word, focusLang]);

  const displayedPreview = word.trim() ? preview : null;
  const displayedPreviewError = word.trim() ? previewError : null;

  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || !word.trim()) return;
    sendMessage({ text }, { body: { word: word.trim(), focusLang } });
    setInput("");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Wiktionary-chatbot
        </h1>
        <p className="text-sm text-muted-foreground">
          Les-11-stijl: woord wordt vóór elk chat-bericht opgezocht via
          Wiktionary, ruwe data wordt in de system prompt geplakt, antwoord
          komt via{" "}
          <code className="font-mono text-xs">streamText</code> +{" "}
          <code className="font-mono text-xs">useChat</code>. Drie debug-panels
          onderaan tonen de raw JSON in én uit.
        </p>
      </header>

      <section className="grid gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground sm:grid-cols-[1fr_auto]">
        <label htmlFor="word" className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Woord
          </span>
          <input
            id="word"
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="bv. hola"
            autoComplete="off"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <label htmlFor="focus" className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Focus-taal
          </span>
          <input
            id="focus"
            type="text"
            value={focusLang}
            onChange={(e) => setFocusLang(e.target.value)}
            placeholder="es"
            className="w-24 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm uppercase"
          />
        </label>

        <p className="text-xs text-muted-foreground sm:col-span-2">
          Probeer:{" "}
          {SUGGESTIONS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setWord(s)}
              className="font-mono text-accent hover:underline"
            >
              {i > 0 && <span className="text-muted-foreground">, </span>}
              {s}
            </button>
          ))}
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Chat</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Status:{" "}
              <code className="font-mono text-foreground">{status}</code>
            </span>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="rounded border border-border px-2 py-1 hover:bg-muted"
              >
                Wis chat
              </button>
            )}
          </div>
        </header>

        <div className="min-h-[120px] space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm">
          {messages.length === 0 && (
            <p className="text-muted-foreground">
              Nog geen berichten. Stel een vraag over{" "}
              <code className="font-mono text-foreground">{word || "?"}</code>.
            </p>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            <p className="font-medium">Fout in chat-request</p>
            <pre className="mt-1 font-mono">{error.message}</pre>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isBusy || !word.trim()}
            placeholder={
              word.trim()
                ? `Vraag iets over "${word}"...`
                : "Vul eerst een woord in hierboven"
            }
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || !word.trim()}
              className="rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              Verstuur
            </button>
          )}
        </form>
      </section>

      <DebugPanels
        preview={displayedPreview}
        previewError={displayedPreviewError}
        messages={messages}
      />
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`rounded-md border px-3 py-2 ${isUser
          ? "border-accent/40 bg-accent/10"
          : "border-border bg-background"
        }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {message.role}
      </p>
      <div className="mt-1 whitespace-pre-wrap text-sm text-foreground">
        {message.parts.map((part, i) =>
          part.type === "text" ? <span key={i}>{part.text}</span> : null,
        )}
      </div>
    </div>
  );
}

function DebugPanels({
  preview,
  previewError,
  messages,
}: {
  preview: PreviewResponse | null;
  previewError: string | null;
  messages: UIMessage[];
}) {
  const openAiInput = preview
    ? {
      model: preview.model,
      system: preview.systemPrompt,
      messages,
    }
    : null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Debug-panels</h2>

      <DetailsPanel title="1. Raw Wiktionary-response (input van externe API)">
        {previewError && (
          <p className="text-xs text-destructive">Preview-fout: {previewError}</p>
        )}
        {preview ? (
          <JsonBlock data={preview.wiktionaryResult} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Nog geen preview geladen.
          </p>
        )}
      </DetailsPanel>

      <DetailsPanel title="2. Input naar OpenAI (system prompt + messages)">
        {openAiInput ? (
          <JsonBlock data={openAiInput} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Vul een woord in om de system prompt te zien.
          </p>
        )}
      </DetailsPanel>

      <DetailsPanel title="3. Output van OpenAI (useChat messages-state)">
        {messages.length > 0 ? (
          <JsonBlock data={messages} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Nog geen messages. Verstuur eerst een vraag.
          </p>
        )}
      </DetailsPanel>
    </section>
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
      <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
        {title}
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="overflow-x-auto rounded bg-muted/40 p-3 font-mono text-xs">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
