// Gedeelde types voor de client-componenten van /dev/tatoeba-audio.
// Bewust apart bestand zodat de page (Server Component) deze ook kan
// importeren zonder een client component te triggeren.

export type UploadDescriptor = {
  audio_id: number;
  lang: string;
  sentence_id: number;
  sentence_text: string;
  // Lege string betekent "geen herbruikbare licentie" volgens Tatoeba.
  license: string;
  author: string;
  attribution_url: string;
};

// Het type dat de probe-route teruggeeft per kandidaat-URL.
export type ProbeCandidate = {
  label: string;
  url: string;
  // 0 = network error / DNS failure; -1 = timeout.
  status: number;
  content_type: string | null;
  content_length: number | null;
  content_disposition: string | null;
  final_url: string | null;
  playable: boolean;
  downloadable: boolean;
  reason: string | null;
};

export type ProbeResponse =
  | { ok: true; candidates: ProbeCandidate[] }
  | { ok: false; error: string };

export type UploadSuccess = {
  ok: true;
  path: string;
  public_url: string;
  byte_size: number;
  content_type: string;
  tatoeba_url: string;
  requestBody: UploadDescriptor;
  uploadArgs: unknown;
  supabaseResponse: unknown;
};

export type UploadFailure = {
  ok: false;
  error: string;
  reason?: string;
  requestBody?: UploadDescriptor;
  uploadArgs?: unknown;
  supabaseResponse?: unknown;
  tatoebaUrl?: string;
  tatoebaStatus?: number;
};

export type UploadResponse = UploadSuccess | UploadFailure;

export type PerAudioStatus =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; response: UploadSuccess }
  | { status: "error"; error: string; response?: UploadFailure };
