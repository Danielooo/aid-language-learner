// Pure type/constant module zonder "use server".

export type ProfileActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Partial<
    Record<"username" | "displayName" | "bio" | "currentPassword" | "newPassword" | "confirm", string>
  >;
};

export const initialProfileState: ProfileActionState = { ok: false };
