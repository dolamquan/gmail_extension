import { NextFunction, Request, Response } from "express";
import { getLatestGoogleTokens } from "../services/tokenStore";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const fallbackTokens = getLatestGoogleTokens();

  if (!req.session.googleTokens?.access_token && fallbackTokens?.access_token) {
    req.session.googleTokens = fallbackTokens;
  }

  if (!req.session.googleTokens?.access_token) {
    res.status(401).json({ error: "Please connect your Gmail account first." });
    return;
  }

  next();
}
