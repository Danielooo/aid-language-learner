import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { notFound } from "next/navigation";

import { CredentialsViewer } from "@/app/dev/credentials/_components/credentials-viewer";
import { parseCredMd } from "@/lib/dev/parse-cred-md";

function readCredFile(): string | null {
  const credPath = resolve(process.cwd(), "CRED.md");
  if (!existsSync(credPath)) {
    return null;
  }

  return readFileSync(credPath, "utf8");
}

export default function DevCredentialsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const content = readCredFile();

  if (!content) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Test credentials
        </h1>
        <p className="text-sm text-muted-foreground">
          <code className="font-mono text-xs">CRED.md</code> niet gevonden. Voer{" "}
          <code className="font-mono text-xs">npm run seed:users</code> uit.
        </p>
      </div>
    );
  }

  const parsed = parseCredMd(content);

  return <CredentialsViewer parsed={parsed} />;
}
