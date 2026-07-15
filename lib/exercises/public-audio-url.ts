const BUCKET = "tatoeba-audio";

export function getPublicAudioUrl(
  supabase: {
    storage: {
      from: (bucket: string) => {
        getPublicUrl: (path: string) => { data: { publicUrl: string } };
      };
    };
  },
  path: string,
): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
