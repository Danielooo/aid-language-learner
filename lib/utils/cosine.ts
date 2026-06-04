// Cosine similarity tussen twee vectors van gelijke lengte.
//
// OpenAI's `text-embedding-3-*`-modellen geven niet-genormaliseerde
// vectors terug, dus we delen door de norms — kost ~3 sqrt-calls extra
// per call, maar is robuust onafhankelijk van model-keuze.
//
// Bewust niet via `cosineSimilarity` uit het `ai`-package: dat is
// server-leaning en zou onnodige bytes in de client-bundle drukken.
// 9 regels code is geen abstractie waard.

export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `cosineSim: vector-lengtes verschillen (${a.length} vs ${b.length}).`,
    );
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  // Epsilon-guard tegen zero-vectors zodat we nooit NaN returnen.
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-12);
}
