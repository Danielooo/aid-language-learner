type ExerciseAudioAttributionProps = {
  author?: string | null;
  license?: string | null;
  attributionUrl?: string | null;
};

function hasAttributionData({
  author,
  license,
  attributionUrl,
}: ExerciseAudioAttributionProps): boolean {
  return Boolean(
    (author && author.trim().length > 0) ||
    (license && license.trim().length > 0) ||
    (attributionUrl && attributionUrl.trim().length > 0),
  );
}

function licenseDisplay(license: string): string {
  return license.trim() === "" ? "no-reuse" : license;
}

export function ExerciseAudioAttribution({
  author,
  license,
  attributionUrl,
}: ExerciseAudioAttributionProps) {
  if (!hasAttributionData({ author, license, attributionUrl })) {
    return null;
  }

  const segments: string[] = [];
  if (license?.trim()) segments.push(licenseDisplay(license));
  if (author?.trim()) segments.push(`@${author.trim()}`);

  const label = segments.join(" · ");

  if (attributionUrl?.trim()) {
    return (
      <p className="text-muted-foreground/70 text-[10px]">
        Audio:{" "}
        <a
          href={attributionUrl.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="decoration-muted-foreground/40 hover:text-foreground underline underline-offset-2"
        >
          {label}
        </a>
      </p>
    );
  }

  return <p className="text-muted-foreground/70 text-[10px]">Audio: {label}</p>;
}
