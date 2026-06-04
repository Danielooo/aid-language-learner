"use client";

import { useState } from "react";

import { AudioCard } from "./audio-card";
import { BulkUpload } from "./bulk-upload";
import { DebugPanels } from "./debug-panels";

import type { TatoebaCall } from "./debug-panels";
import type { UploadDescriptor, UploadResponse } from "./types";

// Client-wrapper die de twee result-secties + debug-panels samenbindt.
// Houdt de laatste upload-args en -response vast zodat panel 5 en 6 elke
// keer dat een AudioCard of de BulkUpload uploadt geüpdatet worden.
//
// De inhoud van de twee result-lijsten zelf wordt al server-side voor-
// gerenderd door de page; we krijgen hier alleen de "plat-gemaakte"
// descriptors mee om client-side acties op uit te voeren.

export type SectionA = {
  call: TatoebaCall | null;
  items: Array<{
    descriptor: UploadDescriptor;
    audioMeta: { download_url: string; created: string; modified: string };
  }>;
};

export type SentenceItem = {
  sentenceId: number;
  sentenceText: string;
  lang: string;
  transcriptions: Array<{ text: string; script: string; type: string }>;
  translations: Array<{
    id: number;
    lang: string;
    text: string;
    is_direct: boolean;
    audios: Array<{
      audio_id: number;
      author: string;
      license: string;
      download_url: string;
    }>;
  }>;
  audios: Array<{
    descriptor: UploadDescriptor;
    audioMeta: { download_url: string; created: string; modified: string };
  }>;
};

export type SectionB = {
  call: TatoebaCall | null;
  sentences: SentenceItem[];
};

export function ResultSections({
  sectionA,
  sectionB,
}: {
  sectionA: SectionA;
  sectionB: SectionB;
}) {
  const [lastUploadRequest, setLastUploadRequest] =
    useState<UploadDescriptor | null>(null);
  const [lastUploadResponse, setLastUploadResponse] =
    useState<UploadResponse | null>(null);

  function handleUpload(
    descriptor: UploadDescriptor,
    response: UploadResponse,
  ) {
    setLastUploadRequest(descriptor);
    setLastUploadResponse(response);
  }

  const allBDescriptors = sectionB.sentences.flatMap((s) =>
    s.audios.map((a) => a.descriptor),
  );

  return (
    <div className="space-y-6">
      {sectionA.call && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold">
                A — /unstable/audios ({sectionA.items.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Audio-eerst: één rij per opname. Klik ▶ om direct vanaf
                Tatoeba&apos;s CDN af te spelen, of upload naar Supabase.
              </p>
            </div>
            <BulkUpload
              descriptors={sectionA.items.map((i) => i.descriptor)}
              onUpload={handleUpload}
            />
          </header>

          {sectionA.items.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Geen audios gevonden voor deze filtercombinatie.
            </p>
          ) : (
            <ol className="grid gap-2 sm:grid-cols-2">
              {sectionA.items.map((item) => (
                <li key={item.descriptor.audio_id}>
                  <AudioCard
                    descriptor={item.descriptor}
                    audioMeta={item.audioMeta}
                    onUploadComplete={handleUpload}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {sectionB.call && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold">
                B — /v1/sentences?has_audio=yes ({sectionB.sentences.length}{" "}
                zinnen, {allBDescriptors.length} audios)
              </h2>
              <p className="text-xs text-muted-foreground">
                Zin-eerst: brontekst + Nederlandse vertaling + alle
                geassocieerde audios + (lege voor Spaans){" "}
                <code className="font-mono">transcriptions</code> array.
              </p>
            </div>
            <BulkUpload
              descriptors={allBDescriptors}
              onUpload={handleUpload}
            />
          </header>

          {sectionB.sentences.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Geen zinnen met audio gevonden voor deze filters.
            </p>
          ) : (
            <ul className="space-y-3">
              {sectionB.sentences.map((sentence) => (
                <SentenceCard
                  key={sentence.sentenceId}
                  sentence={sentence}
                  onUploadComplete={handleUpload}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <DebugPanels
        audioCall={sectionA.call}
        sentencesCall={sectionB.call}
        lastUploadRequest={lastUploadRequest}
        lastUploadResponse={lastUploadResponse}
      />
    </div>
  );
}

function SentenceCard({
  sentence,
  onUploadComplete,
}: {
  sentence: SentenceItem;
  onUploadComplete: (
    descriptor: UploadDescriptor,
    response: UploadResponse,
  ) => void;
}) {
  return (
    <li className="space-y-3 rounded-md border border-border bg-background p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {sentence.sentenceText}
          <span className="ml-2 font-mono text-[10px] text-muted-foreground">
            #{sentence.sentenceId} · {sentence.lang}
          </span>
        </p>

        {sentence.translations.length > 0 && (
          <ul className="space-y-0.5 border-l-2 border-border pl-3 text-xs text-muted-foreground">
            {sentence.translations.map((t) => (
              <li key={t.id} className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] uppercase">
                  {t.lang}
                </span>
                <span>{t.text}</span>
                {t.is_direct && (
                  <span className="text-[10px] text-accent">direct</span>
                )}
                {t.audios.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/70">
                    + {t.audios.length} audio
                    {t.audios.length === 1 ? "" : "s"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {sentence.transcriptions.length > 0 ? (
          <ul className="space-y-0.5 border-l-2 border-accent/40 pl-3 text-xs text-muted-foreground">
            {sentence.transcriptions.map((t, i) => (
              <li key={i}>
                <span className="font-mono text-[10px] uppercase">
                  {t.script}/{t.type}
                </span>{" "}
                {t.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[10px] text-muted-foreground/60">
            Geen transcriptions (verwacht voor Spaans — alleen Latijns schrift).
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {sentence.audios.map((a) => (
          <AudioCard
            key={a.descriptor.audio_id}
            descriptor={a.descriptor}
            audioMeta={a.audioMeta}
            onUploadComplete={onUploadComplete}
          />
        ))}
      </div>
    </li>
  );
}
