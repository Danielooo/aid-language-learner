import { getInitials } from "@/lib/auth/get-initials";
import { cn } from "@/lib/utils";

type ProfileAvatarProps = {
  username: string;
  displayName?: string | null;
  className?: string;
};

/** Ronde avatar met initialen (geen foto-upload). */
export function ProfileAvatar({
  username,
  displayName,
  className,
}: ProfileAvatarProps) {
  const initials = getInitials(displayName, username);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex size-16 shrink-0 items-center justify-center rounded-full bg-accent/15 text-lg font-semibold tracking-wide text-accent",
        className,
      )}
    >
      {initials}
    </div>
  );
}
