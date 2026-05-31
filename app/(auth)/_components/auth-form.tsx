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
};

const COPY = {
  signin: {
    title: "Inloggen",
    submit: "Inloggen",
    submitting: "Bezig…",
    cta: "Nog geen account?",
    ctaLink: "/register",
    ctaLinkLabel: "Registreer een nieuwe user",
    helper: "Synthetisch e-mailadres? Nee: je logt in met je username.",
  },
  signup: {
    title: "Account aanmaken",
    submit: "Registreer",
    submitting: "Aanmaken…",
    cta: "Heb je al een account?",
    ctaLink: "/login",
    ctaLinkLabel: "Naar inloggen",
    helper: "Username = je login + display-naam. 2-32 tekens, [a-z0-9_-].",
  },
} as const;

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialAuthState);
  const copy = COPY[mode];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {copy.title}
        </h1>
        <p className="text-xs text-muted-foreground">{copy.helper}</p>
      </header>

      <Field
        id="username"
        name="username"
        label="Username"
        autoComplete={mode === "signin" ? "username" : "off"}
        error={state.fieldErrors?.username}
        autoFocus
      />

      <Field
        id="password"
        name="password"
        type="password"
        label="Wachtwoord"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        error={state.fieldErrors?.password}
      />

      {state.error && !state.fieldErrors && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? copy.submitting : copy.submit}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        {copy.cta}{" "}
        <Link
          href={copy.ctaLink}
          className="font-medium text-foreground underline underline-offset-2 hover:text-accent"
        >
          {copy.ctaLinkLabel}
        </Link>
      </p>
    </form>
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
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
        className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
      />
      {error && (
        <span id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}
