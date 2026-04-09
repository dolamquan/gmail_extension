import { Credentials } from "google-auth-library";

let latestGoogleTokens: Credentials | null = null;

export function setLatestGoogleTokens(tokens: Credentials): void {
  latestGoogleTokens = tokens;
}

export function getLatestGoogleTokens(): Credentials | null {
  return latestGoogleTokens;
}
