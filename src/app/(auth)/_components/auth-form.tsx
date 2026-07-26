"use client";

import Link from "next/link";
import { useActionState } from "react";

import { initialAuthState } from "@/app/(auth)/_lib/state";

import type { AuthActionState } from "@/app/(auth)/_lib/state";

type AuthFormProps = {
  mode: "signin" | "signup";
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  /** Interne pad-redirect na succesvolle login (uit `?next=`). */
  next?: string;
  /** Toon een foutmelding onder de velden (bijv. gedeactiveerd account). */
  externalError?: string;
};

const COPY = {
  signin: {
    title: "Inloggen",
    submit: "Inloggen",
    submitting: "Bezig…",
    cta: "Nog geen account?",
    ctaLink: "/register",
    ctaLinkLabel: "Registreer een nieuwe user",
    helper: "Je logt in met je gebruikersnaam.",
  },
  signup: {
    title: "Account aanmaken",
    submit: "Registreer",
    submitting: "Aanmaken…",
    cta: "Heb je al een account?",
    ctaLink: "/login",
    ctaLinkLabel: "Naar inloggen",
    helper:
      "Gebruikersnaam = je login + display-naam. 2-32 tekens, [a-z0-9_-].",
  },
} as const;

export function AuthForm({ mode, action, next, externalError }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialAuthState);
  const copy = COPY[mode];
  const formError =
    !state.fieldErrors && (state.error || externalError)
      ? (state.error ?? externalError)
      : null;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          {copy.title}
        </h1>
        <p className="text-muted-foreground text-xs">{copy.helper}</p>
      </header>

      <form action={formAction} className="space-y-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <Field
          id="username"
          name="username"
          label="Gebruikersnaam"
          autoComplete={mode === "signin" ? "username" : "off"}
          error={state.fieldErrors?.username}
        />

        <Field
          id="password"
          name="password"
          type="password"
          label="Wachtwoord"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          error={state.fieldErrors?.password}
        />

        {formError && (
          <div
            role="alert"
            className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? copy.submitting : copy.submit}
        </button>
      </form>

      <p className="text-muted-foreground text-center text-xs">
        {copy.cta}{" "}
        <Link
          href={copy.ctaLink}
          className="text-foreground hover:text-accent font-medium underline underline-offset-2"
        >
          {copy.ctaLinkLabel}
        </Link>
      </p>
    </div>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  autoFocus,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  error?: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="border-input bg-background focus-visible:ring-ring aria-[invalid=true]:border-destructive h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
      />
      {error && (
        <span id={`${id}-error`} className="text-destructive text-xs">
          {error}
        </span>
      )}
    </label>
  );
}
