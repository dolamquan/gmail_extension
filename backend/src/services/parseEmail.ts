import { ParsedThread } from "../types/gmail";

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeQuotedText(text: string): string {
  const lines = text.split("\n");
  const cleaned: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith(">")) {
      continue;
    }

    if (/^On .+ wrote:$/i.test(trimmed)) {
      break;
    }

    cleaned.push(line);
  }

  return cleaned.join("\n").trim();
}

export function cleanThreadText(thread: ParsedThread): string {
  const parts = thread.messages.map((message) => {
    const cleanedBody = normalizeWhitespace(removeQuotedText(message.bodyText || message.snippet || ""));

    return [
      `From: ${message.from || "Unknown"}`,
      `Date: ${message.date || "Unknown"}`,
      `Subject: ${message.subject || "(No Subject)"}`,
      "Body:",
      cleanedBody || "(No content)",
      ""
    ].join("\n");
  });

  return normalizeWhitespace(parts.join("\n"));
}
