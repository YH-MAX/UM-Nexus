export function formatOAuthRedirectError(
  errorCode: string,
  errorDescription: string | null | undefined,
): string {
  const normalizedCode = errorCode.trim().toLowerCase();
  const decoded =
    errorDescription && errorDescription.length > 0
      ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
      : "";

  if (normalizedCode === "access_denied") {
    return "Google sign-in was cancelled. Try again when you are ready.";
  }

  if (decoded) {
    return decoded.length > 200 ? `${decoded.slice(0, 197)}…` : decoded;
  }

  return "Google sign-in failed. Please try again.";
}
