"use client";

import { useActionState, useState } from "react";

import {
  changePassword,
  deleteAccount,
  updateProfile,
} from "@/app/(app)/profiel/actions";
import { initialProfileState } from "@/app/(app)/profiel/_lib/state";
import { ProfileAvatar } from "@/app/_components/features/profile/profile-avatar";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";
import { cn } from "@/lib/utils";

import type { ProfileActionState } from "@/app/(app)/profiel/_lib/state";

export type ProfilePageContentProps = {
  username: string;
  displayName: string | null;
  bio: string | null;
  email: string | null;
  emailHelper: string;
  canChangePassword: boolean;
  canDeleteAccount: boolean;
};

export function ProfilePageContent({
  username,
  displayName,
  bio,
  email,
  emailHelper,
  canChangePassword,
  canDeleteAccount,
}: ProfilePageContentProps) {
  const [avatarName, setAvatarName] = useState(displayName ?? "");
  const [avatarUsername, setAvatarUsername] = useState(username);

  const heroName = avatarName.trim() || avatarUsername || username;

  return (
    <div className="mx-auto w-full max-w-xl space-y-10">
      <AppPageHeader
        eyebrow="Account"
        title="Profiel"
        description="Bekijk en wijzig je accountgegevens."
      />

      <section className="flex items-center gap-4" aria-label="Avatar">
        <ProfileAvatar username={avatarUsername || username} displayName={avatarName} />
        <div className="min-w-0 space-y-1">
          <p className="truncate text-lg font-semibold text-foreground">{heroName}</p>
          <p className="text-sm text-muted-foreground">
            @{avatarUsername || username}
          </p>
          <p className="text-xs text-muted-foreground">
            Avatar toont initialen — foto uploaden is niet beschikbaar.
          </p>
        </div>
      </section>

      <ProfileDetailsForm
        username={username}
        displayName={displayName}
        bio={bio}
        onPreviewChange={({ displayName: nextName, username: nextUser }) => {
          setAvatarName(nextName);
          setAvatarUsername(nextUser);
        }}
      />

      <AccountSection
        email={email}
        emailHelper={emailHelper}
        canChangePassword={canChangePassword}
      />

      {canDeleteAccount ? (
        <DangerZone username={username} />
      ) : (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          Admin-accounts kunnen niet via deze pagina worden verwijderd.
        </div>
      )}
    </div>
  );
}

function ProfileDetailsForm({
  username,
  displayName,
  bio,
  onPreviewChange,
}: {
  username: string;
  displayName: string | null;
  bio: string | null;
  onPreviewChange: (values: { displayName: string; username: string }) => void;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialProfileState);

  return (
    <section className="space-y-4" aria-labelledby="profile-details-heading">
      <SectionHeading id="profile-details-heading" title="Profielgegevens" />

      <form action={formAction} className="space-y-4" noValidate>
        <Field
          id="displayName"
          name="displayName"
          label="Naam"
          defaultValue={displayName ?? ""}
          error={state.fieldErrors?.displayName}
          onChange={(value) =>
            onPreviewChange({ displayName: value, username: readInputValue("username") || username })
          }
        />
        <Field
          id="username"
          name="username"
          label="Gebruikersnaam"
          defaultValue={username}
          autoComplete="username"
          error={state.fieldErrors?.username}
          helper="2–32 tekens; letters, cijfers, _ en -."
          onChange={(value) =>
            onPreviewChange({
              displayName: readInputValue("displayName"),
              username: value,
            })
          }
        />
        <TextAreaField
          id="bio"
          name="bio"
          label="Bio"
          defaultValue={bio ?? ""}
          error={state.fieldErrors?.bio}
          helper="Maximaal 500 tekens."
          rows={4}
        />

        <FormFeedback state={state} />

        <button
          type="submit"
          disabled={pending}
          className={primaryButtonClass}
        >
          {pending ? "Opslaan…" : "Profiel opslaan"}
        </button>
      </form>
    </section>
  );
}

function AccountSection({
  email,
  emailHelper,
  canChangePassword,
}: {
  email: string | null;
  emailHelper: string;
  canChangePassword: boolean;
}) {
  return (
    <section className="space-y-6" aria-labelledby="account-heading">
      <SectionHeading id="account-heading" title="Account" />

      <div className="space-y-4">
        <Field
          id="email"
          name="email"
          label="E-mail"
          defaultValue={email ?? ""}
          disabled
          helper={emailHelper}
        />

        {canChangePassword ? (
          <PasswordForm />
        ) : (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
            Wachtwoord wijzigen is niet beschikbaar bij SSO-login
            (Google/GitHub).
          </div>
        )}
      </div>
    </section>
  );
}

function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialProfileState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field
        id="currentPassword"
        name="currentPassword"
        type="password"
        label="Huidig wachtwoord"
        autoComplete="current-password"
        error={state.fieldErrors?.currentPassword}
      />
      <Field
        id="newPassword"
        name="newPassword"
        type="password"
        label="Nieuw wachtwoord"
        autoComplete="new-password"
        error={state.fieldErrors?.newPassword}
      />

      <FormFeedback state={state} />

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Wijzigen…" : "Wachtwoord wijzigen"}
      </button>
    </form>
  );
}

function DangerZone({ username }: { username: string }) {
  const [state, formAction, pending] = useActionState(deleteAccount, initialProfileState);
  const [confirm, setConfirm] = useState("");
  const matches = confirm === username;

  return (
    <section
      className="space-y-4 rounded-md border border-destructive/40 p-4"
      aria-labelledby="danger-heading"
    >
      <SectionHeading
        id="danger-heading"
        title="Account verwijderen"
        tone="danger"
      />
      <p className="text-sm text-muted-foreground">
        Dit verwijdert je account en bijbehorende gegevens permanent. Typ{" "}
        <span className="font-medium text-foreground">{username}</span> om te
        bevestigen.
      </p>

      <form action={formAction} className="space-y-4" noValidate>
        <label htmlFor="confirm" className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Bevestiging
          </span>
          <input
            id="confirm"
            name="confirm"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="off"
            aria-invalid={state.fieldErrors?.confirm ? true : undefined}
            aria-describedby={
              state.fieldErrors?.confirm ? "confirm-error" : undefined
            }
            className={inputClass}
          />
          {state.fieldErrors?.confirm && (
            <span id="confirm-error" className="text-xs text-destructive">
              {state.fieldErrors.confirm}
            </span>
          )}
        </label>

        <FormFeedback state={state} />

        <button
          type="submit"
          disabled={pending || !matches}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-destructive bg-destructive px-4 text-sm font-medium text-white transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Verwijderen…" : "Account permanent verwijderen"}
        </button>
      </form>
    </section>
  );
}

function FormFeedback({ state }: { state: ProfileActionState }) {
  if (state.error && !state.fieldErrors) {
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {state.error}
      </div>
    );
  }

  if (state.ok && state.message) {
    return (
      <div
        role="status"
        className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-foreground"
      >
        {state.message}
      </div>
    );
  }

  return null;
}

function SectionHeading({
  id,
  title,
  tone = "default",
}: {
  id: string;
  title: string;
  tone?: "default" | "danger";
}) {
  return (
    <h2
      id={id}
      className={cn(
        "text-base font-semibold tracking-tight",
        tone === "danger" ? "text-destructive" : "text-foreground",
      )}
    >
      {title}
    </h2>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  defaultValue,
  autoComplete,
  disabled,
  helper,
  error,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  disabled?: boolean;
  helper?: string;
  error?: string;
  onChange?: (value: string) => void;
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
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${id}-error` : helper ? `${id}-helper` : undefined
        }
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        className={cn(inputClass, disabled && "cursor-not-allowed opacity-70")}
      />
      {helper && !error && (
        <span id={`${id}-helper`} className="text-xs text-muted-foreground">
          {helper}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

function TextAreaField({
  id,
  name,
  label,
  defaultValue,
  helper,
  error,
  rows,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  helper?: string;
  error?: string;
  rows?: number;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <textarea
        id={id}
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${id}-error` : helper ? `${id}-helper` : undefined
        }
        className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
      />
      {helper && !error && (
        <span id={`${id}-helper`} className="text-xs text-muted-foreground">
          {helper}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

function readInputValue(id: string): string {
  if (typeof document === "undefined") return "";
  const element = document.getElementById(id);
  if (element instanceof HTMLInputElement) return element.value;
  return "";
}

const inputClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive disabled:bg-muted";

const primaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50";
