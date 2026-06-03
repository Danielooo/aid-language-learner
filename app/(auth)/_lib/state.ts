// Pure type/constant module zonder "use server" — een "use server"
// file mag alleen async functions exporteren, dus de gedeelde state-
// shape woont hier i.p.v. naast de Server Actions.

export type AuthActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"username" | "password", string>>;
};

export const initialAuthState: AuthActionState = { ok: false };
