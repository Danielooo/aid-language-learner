import "server-only";

export function mcpJsonText(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function mcpErrorText(message: string) {
  return mcpJsonText({ ok: false, error: message });
}
