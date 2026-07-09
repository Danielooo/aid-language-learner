export const PASSWORD_REALM_GRANT =
  "http://auth0.com/oauth/grant-type/password-realm";

export type Auth0TokenResponse = {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};
