export function normalizeWhatsAppDigits(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return digits || null;
}

export function buildClientWhatsAppUrl(phone: string, message = ""): string | null {
  const digits = normalizeWhatsAppDigits(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (!message.trim()) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
