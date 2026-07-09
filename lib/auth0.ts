import { Auth0Client } from "@auth0/nextjs-auth0/server";

import { beforeSessionSaved } from "@/lib/auth/before-session-saved";
import { getAuth0Domain } from "@/lib/auth/auth0-env";

export const auth0 = new Auth0Client({
  domain: getAuth0Domain(),
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
  appBaseUrl: process.env.APP_BASE_URL,
  beforeSessionSaved,
});
