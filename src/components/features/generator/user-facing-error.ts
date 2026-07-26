/**
 * Vertaalt technische fouten naar korte NL-copy voor eindgebruikers.
 * Geen HTTP-codes, stack traces of developer-jargon.
 */

const GENERIC_CHAT_ERROR =
  "Er ging iets mis bij het genereren. Probeer het zo opnieuw.";

const GENERIC_SAVE_ERROR =
  "Opslaan is niet gelukt. Controleer je verbinding en probeer opnieuw.";

const GENERIC_LOAD_ERROR = "Laden is niet gelukt. Probeer het opnieuw.";

/** Chat / stream-fouten (o.a. useChat `error`). */
export function toUserFacingChatError(error: unknown): string {
  const raw = extractRawMessage(error);
  if (!raw) return GENERIC_CHAT_ERROR;

  const lower = raw.toLowerCase();

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("load failed")
  ) {
    return "Geen verbinding. Controleer je internet en probeer opnieuw.";
  }

  if (
    lower.includes("niet ingelogd") ||
    lower.includes("unauthorized") ||
    lower.includes("401")
  ) {
    return "Je bent niet ingelogd. Log opnieuw in en probeer het nog eens.";
  }

  if (
    lower.includes("daglimiet") ||
    lower.includes("429") ||
    lower.includes("too many")
  ) {
    return "Je daglimiet voor AI is bereikt. Probeer het morgen opnieuw.";
  }

  if (
    lower.includes("ai-generatie is uitgeschakeld") ||
    lower.includes("ai_disabled")
  ) {
    return "AI-generatie staat uit voor jouw account.";
  }

  if (looksTechnical(raw)) return GENERIC_CHAT_ERROR;

  return raw;
}

/** Opslaan van voorstel (persist). */
export function toUserFacingPersistError(
  message: string | null | undefined,
  httpStatus?: number,
): string {
  if (httpStatus === 401) {
    return "Je bent niet ingelogd. Log opnieuw in en probeer het nog eens.";
  }
  if (httpStatus === 429) {
    return "Je daglimiet is bereikt. Probeer het later opnieuw.";
  }
  if (httpStatus !== undefined && httpStatus >= 500) {
    return GENERIC_SAVE_ERROR;
  }

  const raw = (message ?? "").trim();
  if (!raw || looksTechnical(raw) || /^HTTP\s*\d+/i.test(raw)) {
    return GENERIC_SAVE_ERROR;
  }

  return raw;
}

/** Laden van topic/leden e.d. */
export function toUserFacingLoadError(error: unknown): string {
  const raw = extractRawMessage(error);
  if (!raw || looksTechnical(raw)) return GENERIC_LOAD_ERROR;
  return raw;
}

function extractRawMessage(error: unknown): string {
  if (typeof error === "string") return error.trim();
  if (error instanceof Error) return error.message.trim();
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message.trim();
  }
  return "";
}

function looksTechnical(message: string): boolean {
  if (/^HTTP\s*\d+/i.test(message)) return true;
  if (/\b(ECONN|ENOTFOUND|ETIMEDOUT|TypeError|SyntaxError)\b/i.test(message)) {
    return true;
  }
  if (/[{}[\]]/.test(message) && message.includes(":")) return true;
  if (/at\s+\S+\s+\(/.test(message)) return true;
  if (/\/api\//i.test(message)) return true;
  if (/\bstatus\s*[:=]\s*\d+/i.test(message)) return true;
  return false;
}
