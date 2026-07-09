import "server-only";

import {
  getAuth0Domain,
  getAuth0ManagementClientId,
  getAuth0ManagementClientSecret,
  rethrowAuth0FetchError,
} from "@/lib/auth/auth0-env";
import { AUTH0_DATABASE_CONNECTION } from "@/lib/auth/username";

const MANAGEMENT_AUDIENCE = (domain: string) => `https://${domain}/api/v2/`;

type ManagementTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export type Auth0ManagementUser = {
  user_id: string;
  email?: string;
  name?: string;
  nickname?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

function requireAuth0Env(): {
  domain: string;
  managementClientId: string;
  managementClientSecret: string;
} {
  return {
    domain: getAuth0Domain(),
    managementClientId: getAuth0ManagementClientId(),
    managementClientSecret: getAuth0ManagementClientSecret(),
  };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Haalt een M2M access token op voor de Auth0 Management API. */
export async function getManagementApiToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const { domain, managementClientId, managementClientSecret } =
    requireAuth0Env();

  let res: Response;
  try {
    res = await fetch(`https://${domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: managementClientId,
        client_secret: managementClientSecret,
        audience: MANAGEMENT_AUDIENCE(domain),
        grant_type: "client_credentials",
      }),
    });
  } catch (error) {
    rethrowAuth0FetchError(error, "Auth0 Management token");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth0 Management token mislukt: ${res.status} ${body}`);
  }

  const data = (await res.json()) as ManagementTokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function managementFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const { domain } = requireAuth0Env();
  const token = await getManagementApiToken();
  return fetch(`https://${domain}/api/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export async function getAuth0UserById(
  userId: string,
): Promise<Auth0ManagementUser | null> {
  const res = await managementFetch(
    `/users/${encodeURIComponent(userId)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth0 user ophalen mislukt: ${res.status} ${body}`);
  }
  return (await res.json()) as Auth0ManagementUser;
}

export async function findAuth0UserByEmail(
  email: string,
): Promise<Auth0ManagementUser | null> {
  const res = await managementFetch(
    `/users-by-email?email=${encodeURIComponent(email)}`,
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth0 users-by-email mislukt: ${res.status} ${body}`);
  }
  const users = (await res.json()) as Auth0ManagementUser[];
  return users[0] ?? null;
}

export type CreateAuth0UserInput = {
  email: string;
  password: string;
  username: string;
  connection?: string;
};

export async function createAuth0User(
  input: CreateAuth0UserInput,
): Promise<Auth0ManagementUser> {
  const res = await managementFetch("/users", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      connection: input.connection ?? AUTH0_DATABASE_CONNECTION,
      email_verified: true,
      user_metadata: { username: input.username },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.message === "string"
        ? body.message
        : `Auth0 user aanmaken mislukt (${res.status})`;
    throw new Error(message);
  }

  return (await res.json()) as Auth0ManagementUser;
}

export async function updateAuth0UserAppMetadata(
  userId: string,
  appMetadata: Record<string, unknown>,
): Promise<void> {
  const res = await managementFetch(`/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ app_metadata: appMetadata }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth0 app_metadata bijwerken mislukt: ${res.status} ${body}`);
  }
}

export async function assignAuth0Role(
  userId: string,
  roleId: string,
): Promise<void> {
  const res = await managementFetch(`/users/${encodeURIComponent(userId)}/roles`, {
    method: "POST",
    body: JSON.stringify({ roles: [roleId] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth0 rol toewijzen mislukt: ${res.status} ${body}`);
  }
}

export async function findAuth0RoleByName(
  name: string,
): Promise<{ id: string; name: string } | null> {
  const res = await managementFetch(`/roles?name_filter=${encodeURIComponent(name)}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth0 rollen ophalen mislukt: ${res.status} ${body}`);
  }
  const roles = (await res.json()) as Array<{ id: string; name: string }>;
  return roles.find((r) => r.name === name) ?? null;
}
