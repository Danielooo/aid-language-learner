import "server-only";

import { hkdf } from "@panva/hkdf";
import { decodeJwt, EncryptJWT, type JWTPayload } from "jose";
import { cookies as getCookies } from "next/headers";

import { filterDefaultIdTokenClaims } from "@auth0/nextjs-auth0/server";

import {
  getAuth0ClientId,
  getAuth0ClientSecret,
  getAuth0Domain,
  rethrowAuth0FetchError,
} from "@/lib/auth/auth0-env";
import { beforeSessionSaved } from "@/lib/auth/before-session-saved";
import { AUTH0_DATABASE_CONNECTION } from "@/lib/auth/username";

import type { SessionData } from "@auth0/nextjs-auth0/types";

import { PASSWORD_REALM_GRANT } from "@/lib/auth/auth0-constants";
import type { Auth0TokenResponse } from "@/lib/auth/auth0-constants";

export type { Auth0TokenResponse } from "@/lib/auth/auth0-constants";

const SESSION_COOKIE_NAME = "__session";
const ABSOLUTE_DURATION_SEC = 60 * 60 * 24 * 3;
const INACTIVITY_DURATION_SEC = 60 * 60 * 24;
const MAX_CHUNK_SIZE = 3500;
const CHUNK_PREFIX = "__";

type CookieStore = Awaited<ReturnType<typeof getCookies>>;

async function encryptSessionPayload(
  payload: JWTPayload,
  secret: string,
  expiration: number,
): Promise<string> {
  const encryptionSecret = await hkdf(
    "sha256",
    secret,
    "",
    "JWE CEK",
    32,
  );
  return new EncryptJWT(payload)
    .setProtectedHeader({ enc: "A256GCM", alg: "dir" })
    .setExpirationTime(expiration)
    .encrypt(encryptionSecret);
}

function calculateMaxAge(createdAt: number): number {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = Math.min(
    now + INACTIVITY_DURATION_SEC,
    createdAt + ABSOLUTE_DURATION_SEC,
  );
  const maxAge = expiresAt - now;
  return maxAge > 0 ? maxAge : 0;
}

function setChunkedSessionCookie(
  name: string,
  value: string,
  maxAge: number,
  reqCookies: CookieStore,
  resCookies: CookieStore,
): void {
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      process.env.APP_BASE_URL?.startsWith("https://") ||
      process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };

  if (new TextEncoder().encode(value).length <= MAX_CHUNK_SIZE) {
    resCookies.set(name, value, options);
    reqCookies.set(name, value);
    return;
  }

  let position = 0;
  let chunkIndex = 0;
  while (position < value.length) {
    const chunk = value.slice(position, position + MAX_CHUNK_SIZE);
    const chunkName = `${name}${CHUNK_PREFIX}${chunkIndex}`;
    resCookies.set(chunkName, chunk, options);
    reqCookies.set(chunkName, chunk);
    position += MAX_CHUNK_SIZE;
    chunkIndex += 1;
  }
}

async function finalizeSession(
  session: SessionData,
  idToken: string | null,
): Promise<SessionData> {
  const updated = await beforeSessionSaved(session, idToken);
  return {
    ...updated,
    internal: session.internal,
    user: updated.user ?? filterDefaultIdTokenClaims(session.user),
  };
}

async function saveAuth0Session(session: SessionData): Promise<void> {
  const secret = process.env.AUTH0_SECRET;
  if (!secret) {
    throw new Error("AUTH0_SECRET ontbreekt in .env.local.");
  }

  const maxAge = calculateMaxAge(session.internal.createdAt);
  const expiration = Math.floor(Date.now() / 1000) + maxAge;
  const { connectionTokenSets, ...sessionPayload } = session;
  void connectionTokenSets;
  const encrypted = await encryptSessionPayload(
    sessionPayload as JWTPayload,
    secret,
    expiration,
  );

  const cookiesLib = await getCookies();
  setChunkedSessionCookie(
    SESSION_COOKIE_NAME,
    encrypted,
    maxAge,
    cookiesLib,
    cookiesLib,
  );
}

/** Password-realm grant voor het custom username/wachtwoord-formulier. */
export async function fetchPasswordRealmTokens(
  email: string,
  password: string,
): Promise<Auth0TokenResponse> {
  const domain = getAuth0Domain();
  const clientId = getAuth0ClientId();
  const clientSecret = getAuth0ClientSecret();

  let res: Response;
  try {
    res = await fetch(`https://${domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: PASSWORD_REALM_GRANT,
        username: email,
        password,
        realm: AUTH0_DATABASE_CONNECTION,
        client_id: clientId,
        client_secret: clientSecret,
        scope: "openid profile email offline_access",
      }),
    });
  } catch (error) {
    rethrowAuth0FetchError(error, "Auth0 password-realm login");
  }

  return (await res.json()) as Auth0TokenResponse;
}

/** Zet Auth0-sessiecookies na een geslaagde token-exchange. */
export async function establishAuth0SessionFromTokens(
  tokenResponse: Auth0TokenResponse,
): Promise<void> {
  if (!tokenResponse.id_token) {
    throw new Error("Geen id_token in Auth0-antwoord (controleer openid-scope).");
  }

  const claims = decodeJwt(tokenResponse.id_token);
  let session: SessionData = {
    user: claims as SessionData["user"],
    tokenSet: {
      accessToken: tokenResponse.access_token,
      idToken: tokenResponse.id_token,
      scope: tokenResponse.scope,
      refreshToken: tokenResponse.refresh_token,
      expiresAt:
        Math.floor(Date.now() / 1000) + Number(tokenResponse.expires_in),
      token_type: tokenResponse.token_type,
    },
    internal: {
      sid: typeof claims.sid === "string" ? claims.sid : "",
      createdAt: Math.floor(Date.now() / 1000),
    },
  };

  session = await finalizeSession(session, tokenResponse.id_token);
  await saveAuth0Session(session);
}
