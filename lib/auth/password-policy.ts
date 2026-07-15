import { z } from "zod";

/**
 * Strikte wachtwoordvalidatie aan/uit via env.
 * Tijdelijk uit: zet `AUTH_STRICT_PASSWORD=false` in `.env.local`.
 * Later weer aan: verwijder de regel of zet `AUTH_STRICT_PASSWORD=true`.
 */
export function isStrictPasswordPolicyEnabled(): boolean {
  const raw = process.env.AUTH_STRICT_PASSWORD?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") {
    return false;
  }
  return true;
}

const STRICT_MIN_LENGTH = 6;
const RELAXED_MIN_LENGTH = 1;

export function getPasswordMinLength(): number {
  return isStrictPasswordPolicyEnabled()
    ? STRICT_MIN_LENGTH
    : RELAXED_MIN_LENGTH;
}

export function getPasswordSchema() {
  const minLength = getPasswordMinLength();
  const message =
    minLength === STRICT_MIN_LENGTH
      ? `Minimaal ${STRICT_MIN_LENGTH} tekens`
      : "Vul een wachtwoord in";

  return z.string().min(minLength, message);
}
