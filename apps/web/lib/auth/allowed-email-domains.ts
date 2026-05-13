const DEFAULT_ALLOWED_DOMAINS = ["siswa.um.edu.my"];

export function parseAllowedEmailDomains(value?: string): string[] {
  if (!value) {
    return DEFAULT_ALLOWED_DOMAINS;
  }

  const domains = value
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  return domains.length > 0 ? domains : DEFAULT_ALLOWED_DOMAINS;
}

export function isAllowedEmailDomain(
  email: string,
  allowedDomains: string[],
): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const atIndex = normalizedEmail.lastIndexOf("@");

  if (atIndex === -1) {
    return false;
  }

  const domain = normalizedEmail.slice(atIndex + 1);
  return allowedDomains.includes(domain);
}

export function getAllowedEmailDomainError(
  email: string,
  allowedDomains: string[],
): string | null {
  if (isAllowedEmailDomain(email, allowedDomains)) {
    return null;
  }

  return `Use a University of Malaya email address (${allowedDomains.join(", ")}).`;
}

export function getAllowedEmailDomainsFromEnv(): string[] {
  return parseAllowedEmailDomains(process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS);
}
