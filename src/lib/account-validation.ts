/** Shared account field rules for onboarding + settings. */

export const FULL_NAME_MAX_LENGTH = 80;
export const PASSWORD_MIN_LENGTH = 4;

export function normalizeFullName(raw: unknown) {
  return String(raw ?? "").trim();
}

export function validateFullName(raw: unknown): string | null {
  const fullName = normalizeFullName(raw);
  if (!fullName) {
    return "Please enter your name.";
  }
  if (fullName.length > FULL_NAME_MAX_LENGTH) {
    return `Name must be ${FULL_NAME_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

export function validatePassword(raw: unknown): string | null {
  const password = String(raw ?? "");
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}
