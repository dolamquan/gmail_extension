export function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const withPadding = padding ? normalized + "=".repeat(4 - padding) : normalized;
  return Buffer.from(withPadding, "base64").toString("utf8");
}
