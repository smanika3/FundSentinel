export function describe(e: unknown): string {
  const s = `${(e as any)?.name ?? ""} ${(e as any)?.message ?? e}`;
  if (/ExpiredToken|expired|CredentialsProviderError|Could not load credentials|UnrecognizedClient|InvalidSignature/i.test(s)) return "login";
  return String((e as any)?.message ?? e);
}
