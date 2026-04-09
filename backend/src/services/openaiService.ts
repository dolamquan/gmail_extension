import OpenAI from "openai";
import { ThreadAnalysis } from "../types/ai";

const REQUIRED_KEYS: Array<keyof ThreadAnalysis> = [
  "summary",
  "sender_intent",
  "action_items",
  "deadlines",
  "suggested_reply"
];

function extractJsonObject(text: string): string {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");

  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Model response did not include a JSON object.");
  }

  return text.slice(first, last + 1);
}

function validateAnalysis(data: unknown): ThreadAnalysis {
  if (!data || typeof data !== "object") {
    throw new Error("AI response was not an object.");
  }

  const record = data as Record<string, unknown>;

  for (const key of REQUIRED_KEYS) {
    if (!(key in record)) {
      throw new Error(`AI response is missing required field: ${key}`);
    }
  }

  if (typeof record.summary !== "string" || typeof record.sender_intent !== "string" || typeof record.suggested_reply !== "string") {
    throw new Error("AI response has invalid string fields.");
  }

  if (!Array.isArray(record.action_items) || !record.action_items.every((item) => typeof item === "string")) {
    throw new Error("AI response has invalid action_items field.");
  }

  if (!Array.isArray(record.deadlines) || !record.deadlines.every((item) => typeof item === "string")) {
    throw new Error("AI response has invalid deadlines field.");
  }

  return {
    summary: record.summary,
    sender_intent: record.sender_intent,
    action_items: record.action_items,
    deadlines: record.deadlines,
    suggested_reply: record.suggested_reply
  };
}

export async function analyzeThreadWithOpenAI(cleanedThreadText: string, replyPreference?: string): Promise<ThreadAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = [
    "Analyze the following Gmail thread and return only strict JSON.",
    "The JSON schema must be:",
    JSON.stringify(
      {
        summary: "string",
        sender_intent: "string",
        action_items: ["string"],
        deadlines: ["string"],
        suggested_reply: "string"
      },
      null,
      2
    ),
    "Rules:",
    "- Do not include markdown.",
    "- Do not include code fences.",
    "- If no deadlines exist, return an empty array.",
    "- Keep suggested_reply concise and professional."
  ].join("\n");

  const replyPreferenceSection = replyPreference?.trim()
    ? `\n\nUser reply preference:\n${replyPreference.trim()}\nFollow this preference when generating suggested_reply.`
    : "";

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: "You are an assistant that outputs strict JSON only."
      },
      {
        role: "user",
        content: `${prompt}${replyPreferenceSection}\n\nThread:\n${cleanedThreadText}`
      }
    ],
    temperature: 0.1
  });

  const outputText = (response.output_text || "").trim();
  if (!outputText) {
    throw new Error("OpenAI returned an empty response.");
  }

  const parsed = JSON.parse(extractJsonObject(outputText));
  return validateAnalysis(parsed);
}
