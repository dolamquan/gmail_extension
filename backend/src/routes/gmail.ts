import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { createDraft, getThreadById, getUserProfile } from "../services/gmailService";
import { cleanThreadText } from "../services/parseEmail";

const router = Router();

router.get("/profile", requireAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.session.googleTokens!);
    res.json(profile);
  } catch (error) {
    console.error("Failed to fetch Gmail profile:", error);
    res.status(500).json({ error: "Unable to load Gmail profile." });
  }
});

router.get("/thread/:threadId", requireAuth, async (req, res) => {
  const { threadId } = req.params;

  if (!threadId) {
    res.status(400).json({ error: "Thread ID is required." });
    return;
  }

  try {
    const thread = await getThreadById(req.session.googleTokens!, threadId);
    const cleanedThreadText = cleanThreadText(thread);

    res.json({
      thread,
      cleanedThreadText
    });
  } catch (error) {
    console.error("Failed to fetch Gmail thread:", error);
    res.status(500).json({ error: "Unable to load Gmail thread." });
  }
});

router.post("/draft", requireAuth, async (req, res) => {
  const { to, subject, body } = req.body as { to?: string; subject?: string; body?: string };

  if (!to || !subject || !body) {
    res.status(400).json({ error: "Fields to, subject, and body are required." });
    return;
  }

  try {
    const draft = await createDraft(req.session.googleTokens!, to, subject, body);
    res.json({ success: true, draft });
  } catch (error) {
    console.error("Failed to create draft:", error);
    res.status(500).json({ error: "Unable to create Gmail draft." });
  }
});

export default router;
