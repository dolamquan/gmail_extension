import { Router } from "express";
import { AnalyzeThreadRequest } from "../types/ai";
import { requireAuth } from "../middleware/requireAuth";
import { getThreadById } from "../services/gmailService";
import { cleanThreadText } from "../services/parseEmail";
import { analyzeThreadWithOpenAI } from "../services/openaiService";

const router = Router();

function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  if (match?.[1]) {
    return match[1];
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromHeader.trim())) {
    return fromHeader.trim();
  }

  return "";
}

router.post("/analyze-thread", requireAuth, async (req, res) => {
  const { threadId, cleanedThreadText, replyPreference }: AnalyzeThreadRequest = req.body;

  if (!threadId && !cleanedThreadText) {
    res.status(400).json({ error: "Provide either threadId or cleanedThreadText." });
    return;
  }

  try {
    let textToAnalyze = cleanedThreadText ?? "";
    let subject = "";
    let lastSenderEmail = "";

    if (threadId && !textToAnalyze) {
      const thread = await getThreadById(req.session.googleTokens!, threadId);
      textToAnalyze = cleanThreadText(thread);

      const latestMessage = thread.messages[thread.messages.length - 1];
      subject = latestMessage?.subject ?? "";
      lastSenderEmail = latestMessage ? extractEmailAddress(latestMessage.from) : "";
    }

    const analysis = await analyzeThreadWithOpenAI(textToAnalyze, replyPreference);

    res.json({
      analysis,
      metadata: {
        threadId: threadId ?? null,
        subject,
        suggestedTo: lastSenderEmail
      }
    });
  } catch (error) {
    console.error("Failed to analyze thread:", error);
    res.status(500).json({ error: "Unable to analyze this email thread right now." });
  }
});

export default router;
