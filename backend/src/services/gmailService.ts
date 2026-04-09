import { Credentials } from "google-auth-library";
import { gmail_v1, google } from "googleapis";
import { ParsedMessage, ParsedThread } from "../types/gmail";
import { decodeBase64Url } from "../utils/decodeBase64Url";
import { stripHtml } from "../utils/stripHtml";

function getGmailClient(tokens: Credentials): gmail_v1.Gmail {
  const auth = new google.auth.OAuth2();
  auth.setCredentials(tokens);
  return google.gmail({ version: "v1", auth });
}

function getHeaderValue(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  const match = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return match?.value ?? "";
}

function collectBodiesFromPayload(payload?: gmail_v1.Schema$MessagePart): { plainText: string[]; htmlText: string[] } {
  const plainText: string[] = [];
  const htmlText: string[] = [];

  const walk = (part?: gmail_v1.Schema$MessagePart) => {
    if (!part) {
      return;
    }

    const mimeType = part.mimeType ?? "";
    const data = part.body?.data ? decodeBase64Url(part.body.data) : "";

    if (mimeType.includes("text/plain") && data.trim()) {
      plainText.push(data);
    } else if (mimeType.includes("text/html") && data.trim()) {
      htmlText.push(data);
    }

    if (part.parts?.length) {
      part.parts.forEach((subPart) => walk(subPart));
    }
  };

  walk(payload);

  return { plainText, htmlText };
}

function extractBodyText(payload?: gmail_v1.Schema$MessagePart): string {
  if (!payload) {
    return "";
  }

  const { plainText, htmlText } = collectBodiesFromPayload(payload);

  if (plainText.length > 0) {
    return plainText.join("\n\n").trim();
  }

  if (htmlText.length > 0) {
    return stripHtml(htmlText.join("\n\n")).trim();
  }

  if (payload.body?.data) {
    const fallback = decodeBase64Url(payload.body.data);
    return payload.mimeType?.includes("text/html") ? stripHtml(fallback) : fallback;
  }

  return "";
}

function mapMessage(message: gmail_v1.Schema$Message): ParsedMessage {
  const payload = message.payload;
  const headers = payload?.headers;

  return {
    id: message.id ?? "",
    threadId: message.threadId ?? "",
    from: getHeaderValue(headers, "From"),
    subject: getHeaderValue(headers, "Subject"),
    date: getHeaderValue(headers, "Date"),
    snippet: message.snippet ?? "",
    bodyText: extractBodyText(payload) || (message.snippet ?? "")
  };
}

export async function getUserProfile(tokens: Credentials) {
  const gmail = getGmailClient(tokens);
  const response = await gmail.users.getProfile({ userId: "me" });

  return {
    emailAddress: response.data.emailAddress ?? "",
    messagesTotal: response.data.messagesTotal ?? 0,
    threadsTotal: response.data.threadsTotal ?? 0
  };
}

export async function getThreadById(tokens: Credentials, threadId: string): Promise<ParsedThread> {
  const gmail = getGmailClient(tokens);
  const response = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full"
  });

  const messages = (response.data.messages ?? []).map(mapMessage);

  return {
    id: response.data.id ?? threadId,
    messages
  };
}

export async function createDraft(tokens: Credentials, to: string, subject: string, body: string) {
  const gmail = getGmailClient(tokens);

  const rawMessage = [
    `To: ${to}`,
    "Content-Type: text/plain; charset=\"UTF-8\"",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    body
  ].join("\r\n");

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const response = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        raw: encodedMessage
      }
    }
  });

  return {
    id: response.data.id,
    messageId: response.data.message?.id
  };
}
