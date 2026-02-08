export function normalizeWhatsAppNumber(raw: string, defaultCountryCode = '55'): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';

  // If already looks like E.164 with BR country code
  if (digits.startsWith(defaultCountryCode)) return digits;

  // Common BR national formats: DDD + 8/9 digits
  if (digits.length === 10 || digits.length === 11) {
    return `${defaultCountryCode}${digits}`;
  }

  // Fallback: return digits as-is
  return digits;
}

export function toWaMeUrl(raw: string): string {
  const number = normalizeWhatsAppNumber(raw);
  return `https://wa.me/${number}`;
}
