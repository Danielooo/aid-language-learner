// Placeholder voor latere admin-autorisatie op /dev/exercises-admin routes.
// Nu een no-op zodat alle dev-routes open blijven; later hier bijv.
// rol-check of allowlist op user-id.

export async function assertAdmin(): Promise<void> {
  // TODO: beveiliging — alleen admin-users toestaan
}
