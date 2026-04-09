import "dotenv/config";
import cors from "cors";
import express from "express";
import session from "express-session";
import authRoutes from "./routes/auth";
import gmailRoutes from "./routes/gmail";
import aiRoutes from "./routes/ai";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));

app.use(
  session({
    name: "inbox-copilot-session",
    secret: getRequiredEnv("SESSION_SECRET"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "none",
      // Required by Chrome for SameSite=None cookies used by extension fetch requests.
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRoutes);
app.use("/gmail", gmailRoutes);
app.use("/ai", aiRoutes);

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled server error:", error);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(port, () => {
  console.log(`Core backend running on http://localhost:${port}`);
});
