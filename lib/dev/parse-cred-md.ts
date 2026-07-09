export type CredField = {
  label: string;
  value: string;
};

export type CredUser = {
  username: string;
  fields: CredField[];
};

export type ParsedCredMd = {
  title: string;
  introLines: string[];
  users: CredUser[];
};

const FIELD_LINE = /^- (.+?): (?:`([^`]+)`|(.+))$/;
const USER_HEADING = /^## (.+)$/;

/**
 * Parseert CRED.md uit het seed-script naar gestructureerde credentials.
 */
export function parseCredMd(content: string): ParsedCredMd {
  const lines = content.split(/\r?\n/);
  const title = lines[0]?.replace(/^#\s*/, "").trim() ?? "Test credentials";
  const introLines: string[] = [];
  const users: CredUser[] = [];

  let currentUser: CredUser | null = null;

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith(">")) {
      introLines.push(trimmed.replace(/^>\s?/, ""));
      continue;
    }

    const userMatch = trimmed.match(USER_HEADING);
    if (userMatch) {
      currentUser = { username: userMatch[1], fields: [] };
      users.push(currentUser);
      continue;
    }

    const fieldMatch = trimmed.match(FIELD_LINE);
    if (fieldMatch && currentUser) {
      currentUser.fields.push({
        label: fieldMatch[1],
        value: fieldMatch[2] ?? fieldMatch[3] ?? "",
      });
      continue;
    }

    if (!trimmed.startsWith("#") && !trimmed.startsWith("-")) {
      introLines.push(trimmed);
    }
  }

  return { title, introLines, users };
}

export function formatUserCredentials(user: CredUser): string {
  return user.fields.map((field) => `${field.label}: ${field.value}`).join("\n");
}
