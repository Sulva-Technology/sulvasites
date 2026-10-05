export const MIN_PASSWORD_LENGTH = 10;

/**
 * Returns an error message for an unacceptable new password, or null if it is fine.
 * `defaultPassword` is the shared first-login password that must never be kept.
 */
export function validateNewPassword(
  password: string,
  defaultPassword?: string,
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (defaultPassword && password === defaultPassword) {
    return "Choose a password different from the default one.";
  }
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}
