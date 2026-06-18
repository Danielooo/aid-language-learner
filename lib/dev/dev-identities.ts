// Vaste dev-identities voor route-gebaseerd testen zonder echte login.
// UUIDs moeten overeenkomen met supabase/seed-users.ts (npm run seed:users).
// owner_id op exercises verwijst naar auth.users — deze ids moeten bestaan.

export const DEV_MOCK_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEV_MOCK_ADMIN_ID = "00000000-0000-4000-8000-000000000002";
export const DEV_MOCK_USER_USERNAME = "dev-user";
export const DEV_MOCK_ADMIN_USERNAME = "dev-admin";

export const DEV_MOCK_USER_EMAIL = "dev-user@aid.local";
export const DEV_MOCK_ADMIN_EMAIL = "dev-admin@aid.local";
