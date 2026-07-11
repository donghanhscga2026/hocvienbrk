/**
 * Phone number normalization utilities.
 *
 * Convention: all phone numbers are stored as E.164-like format for VN:
 *   +84XXXXXXXXX  (9-10 digits after +84)
 *
 * Non-VN numbers are stored as: +{countryCode}{nationalNumber}
 */

const VN_COUNTRY_CODE = '84';
const VN_NATIONAL_MIN = 9;
const VN_NATIONAL_MAX = 10;

/**
 * Normalize a phone number to E.164 format.
 *
 * Handles:
 *   - Missing "+" prefix
 *   - Leading "0" (local VN format)
 *   - Doubled country code (e.g. +8484..., 8484...)
 *   - IDD prefix "00"
 *   - Special characters (dots, spaces, dashes)
 *   - Non-VN numbers (passed through with "+")
 *
 * Returns null if the phone is invalid or empty.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone || !phone.trim()) return null;

  const hasPlus = phone.trim().startsWith('+');
  let digits = phone.replace(/[^\d]/g, '');

  if (digits.length < 8 || digits.length > 15) return null;

  // ── Has "+" prefix ──
  if (hasPlus) {
    // VN country code
    if (digits.startsWith(VN_COUNTRY_CODE)) {
      let national = digits.slice(VN_COUNTRY_CODE.length);

      // Strip doubled 84 (data corruption: +8484XXXXXXXX)
      while (national.startsWith(VN_COUNTRY_CODE) && national.length > VN_NATIONAL_MAX) {
        national = national.slice(VN_COUNTRY_CODE.length);
      }

      // Strip leading 0
      if (national.startsWith('0')) national = national.slice(1);

      if (national.length >= VN_NATIONAL_MIN && national.length <= VN_NATIONAL_MAX) {
        return `+${VN_COUNTRY_CODE}${national}`;
      }
    }

    // Non-VN — return as-is
    return `+${digits}`;
  }

  // ── No "+" prefix ──

  // Handle IDD "00" prefix
  if (digits.startsWith('00')) {
    const afterIDD = digits.slice(2);
    if (afterIDD.startsWith(VN_COUNTRY_CODE)) {
      let national = afterIDD.slice(VN_COUNTRY_CODE.length);
      if (national.startsWith('0')) national = national.slice(1);
      if (national.length >= VN_NATIONAL_MIN && national.length <= VN_NATIONAL_MAX) {
        return `+${VN_COUNTRY_CODE}${national}`;
      }
    }
    return `+${afterIDD}`;
  }

  // Handle "84" country code without "+"
  if (digits.startsWith(VN_COUNTRY_CODE) && digits.length >= VN_NATIONAL_MIN + 2) {
    let national = digits.slice(VN_COUNTRY_CODE.length);

    // Strip doubled 84
    while (national.startsWith(VN_COUNTRY_CODE) && national.length > VN_NATIONAL_MAX) {
      national = national.slice(VN_COUNTRY_CODE.length);
    }

    if (national.startsWith('0')) national = national.slice(1);

    if (national.length >= VN_NATIONAL_MIN && national.length <= VN_NATIONAL_MAX) {
      return `+${VN_COUNTRY_CODE}${national}`;
    }
  }

  // Handle leading "0" (local VN format: 0xxx...)
  if (digits.startsWith('0') && digits.length >= VN_NATIONAL_MIN + 1) {
    const national = digits.slice(1);
    if (national.length >= VN_NATIONAL_MIN && national.length <= VN_NATIONAL_MAX) {
      return `+${VN_COUNTRY_CODE}${national}`;
    }
  }

  // Plain 9-10 digits — assume VN national number
  if (digits.length >= VN_NATIONAL_MIN && digits.length <= VN_NATIONAL_MAX) {
    if (digits.length === VN_NATIONAL_MAX && digits.startsWith('0')) {
      return `+${VN_COUNTRY_CODE}${digits.slice(1)}`;
    }
    return `+${VN_COUNTRY_CODE}${digits}`;
  }

  // International numbers without "+" prefix (e.g. 16476311919 → +16476311919)
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Get all possible phone variants for DB lookup (for matching users).
 * Useful when the DB may contain phones in different legacy formats.
 */
export function getAllPhoneVariants(fullPhone: string): string[] {
  const normalized = normalizePhone(fullPhone);
  if (!normalized) return [];

  const variants = new Set<string>([normalized]);

  if (normalized.startsWith('+84')) {
    const rawNumber = normalized.slice(3);
    variants.add('0' + rawNumber);
    variants.add('84' + rawNumber);
    variants.add(rawNumber);
    variants.add('+84' + rawNumber);
  } else if (normalized.startsWith('+')) {
    const withoutPlus = normalized.slice(1);
    variants.add(withoutPlus);
    if (withoutPlus.startsWith('84')) {
      const rawNumber = withoutPlus.slice(2);
      variants.add('0' + rawNumber);
      variants.add(rawNumber);
    }
  } else {
    variants.add('+' + normalized);
  }

  // Strip all prefixes to bare national number for legacy data matching
  let clean = normalized.replace(/\s/g, '');
  while (true) {
    if (clean.startsWith('+84')) clean = clean.slice(3);
    else if (clean.startsWith('84')) clean = clean.slice(2);
    else if (clean.startsWith('0')) clean = clean.slice(1);
    else if (clean.startsWith('+')) clean = clean.slice(1);
    else break;
  }
  if (clean) {
    variants.add(clean);
    variants.add('0' + clean);
    variants.add('84' + clean);
    variants.add('+84' + clean);
  }

  return [...variants];
}

/**
 * Format phone for display (masked).
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length <= 4) return cleaned;
  return cleaned.slice(0, 4) + '***';
}
