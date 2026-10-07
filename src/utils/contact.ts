// Helpers for the contact details the admin enters on the Settings page.

/** Digits with an Indian country code, e.g. "98765 43210" -> "+919876543210". */
export const toE164India = (raw?: string | null): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  return `+${digits}`;
};

export const telHref = (raw?: string | null): string | null => {
  const phone = toE164India(raw);
  return phone ? `tel:${phone}` : null;
};

export const whatsappHref = (raw?: string | null, text?: string): string | null => {
  const phone = toE164India(raw);
  if (!phone) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${phone.slice(1)}${query}`;
};
