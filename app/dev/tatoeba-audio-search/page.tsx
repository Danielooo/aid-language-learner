// /dev/tatoeba-audio-search — records ophalen, zoeken op onderwerp,
// verrijken en audio-oefeningen persisten naar Supabase.

import { AudioSearchPage } from "./_components/audio-search-page";

export const dynamic = "force-dynamic";

export default function TatoebaAudioSearchPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Audio files ophalen
      </h1>

      <AudioSearchPage />
    </div>
  );
}
