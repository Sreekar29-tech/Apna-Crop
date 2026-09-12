/**
 * Data Sanitization & Field Masking Utilities
 * Ensures sensitive credentials, hashes, and financial account numbers
 * are never transmitted to client applications in raw form.
 */

export function maskBankAccount(account?: string | null): string | null {
  if (!account || typeof account !== 'string') return null;
  const trimmed = account.trim();
  if (trimmed.length <= 4) return '••••';
  return `••••${trimmed.slice(-4)}`;
}

export function sanitizeUser<T extends Record<string, any>>(user: T | null): T | null {
  if (!user) return null;
  const sanitized: Record<string, any> = { ...user };
  delete sanitized.password_hash;
  delete sanitized.aadhaar_hash;

  if (sanitized.bank_account) {
    sanitized.bank_account = maskBankAccount(sanitized.bank_account);
  }

  return sanitized as T;
}

export function sanitizeBooking<T extends Record<string, any>>(booking: T | null): T | null {
  if (!booking) return null;
  const sanitized: Record<string, any> = { ...booking };
  delete sanitized.password_hash;
  delete sanitized.aadhaar_hash;

  if (sanitized.bank_account) {
    sanitized.bank_account = maskBankAccount(sanitized.bank_account);
  }

  return sanitized as T;
}

export function sanitizeFarmersList<T extends Record<string, any>>(farmers: T[]): T[] {
  return farmers.map((f) => sanitizeUser(f) as T);
}
