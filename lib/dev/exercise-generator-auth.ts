// TIJDELIJK was dit `false` tijdens early Auth-integratie.
// Productie: auth verplicht voor /dev exercise-tool API's die mock-user
// als fallback hadden. Corpus-admin routes gebruiken assertAdmin apart.
export const DEV_EXERCISE_TOOLS_REQUIRE_AUTH = true;
