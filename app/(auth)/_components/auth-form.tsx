"use client";

import Link from "next/link";
import { useActionState } from "react";

import { initialAuthState } from "@/app/(auth)/_lib/state";
import { APP_ROUTES } from "@/lib/routes";

import type { AuthActionState } from "@/app/(auth)/_lib/state";

type AuthFormProps = {
  mode: "signin" | "signup";
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  /** Interne pad-redirect na succesvolle login (uit `?next=`). */
  next?: string;
  /** Toon een foutmelding boven het formulier (bijv. mislukte OAuth). */
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

export function AuthForm({ mode, action, next, externalError }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialAuthState);
  const copy = COPY[mode];
  const returnTo = encodeURIComponent(next ?? APP_ROUTES.oefenen);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {copy.title}
        </h1>
        <p className="text-xs text-muted-foreground">{copy.helper}</p>
      </header>

      {externalError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {externalError}
        </div>
      )}

      <OAuthButtons returnTo={returnTo} />

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">of met username</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <Field
          id="username"
          name="username"
          label="Username"
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
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {copy.cta}{" "}
        <Link
          href={copy.ctaLink}
          className="font-medium text-foreground underline underline-offset-2 hover:text-accent"
        >
          {copy.ctaLinkLabel}
        </Link>
      </p>
    </div>
  );
}

const OAUTH_PROVIDERS = [
  { connection: "google-oauth2", label: "Verder met Google" },
  { connection: "github", label: "Verder met GitHub" },
] as const;

function OAuthButtons({ returnTo }: { returnTo: string }) {
  return (
    <div className="grid gap-2">
      {OAUTH_PROVIDERS.map((provider) => (
        <a
          key={provider.connection}
          href={`/auth/login?connection=${provider.connection}&returnTo=${returnTo}`}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {provider.connection === "google-oauth2" ? (
            <GoogleIcon />
          ) : (
            <GitHubIcon />
          )}
          {provider.label}
        </a>
      ))}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.63h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.93-2.92l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.97 11.97 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.02 11.02 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.35.77 1.05.77 2.12v3.14c0 .3.21.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
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
