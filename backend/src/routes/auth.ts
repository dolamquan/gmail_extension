import { Router } from "express";
import { exchangeCodeForTokens, getGoogleAuthUrl } from "../services/googleOAuth";
import { getLatestGoogleTokens, setLatestGoogleTokens } from "../services/tokenStore";

const router = Router();

router.get("/google", (_req, res) => {
  const url = getGoogleAuthUrl();
  res.redirect(url);
});

router.get("/google/callback", async (req, res) => {
  const code = req.query.code;

  if (!code || typeof code !== "string") {
    res.status(400).send("Missing OAuth code.");
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    req.session.googleTokens = tokens;
    setLatestGoogleTokens(tokens);

    res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 24px;">
          <h2>Inbox Copilot</h2>
          <p>Gmail connected successfully. You can close this tab and return to the extension.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send("Google authentication failed.");
  }
});

router.get("/status", (req, res) => {
  const tokens = req.session.googleTokens ?? getLatestGoogleTokens() ?? undefined;

  res.json({
    authenticated: Boolean(tokens?.access_token)
  });
});

export default router;
