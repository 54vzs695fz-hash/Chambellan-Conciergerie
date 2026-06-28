import { formatGridDayDate } from "@/lib/planner-utils";
import type { BookingStatus } from "@/lib/types";

const BOOKING_REQUEST_MESSAGE_STATUSES = new Set<BookingStatus>([
  "to_request",
  "request_sent",
  "waiting_confirmation",
]);

export function showsBookingRequestMessage(status: BookingStatus): boolean {
  return BOOKING_REQUEST_MESSAGE_STATUSES.has(status);
}

export function formatBookingRequestTime(time: string): string {
  const trimmed = time.trim();
  if (!trimmed) return "—";

  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = String(Number(match[1]));
    return `${hours}h${match[2]}`;
  }

  return trimmed;
}

export function formatBookingRequestPax(guestCount: string | null | undefined): string {
  const trimmed = String(guestCount ?? "").trim();
  if (!trimmed) return "— pax";

  const leadingNumber = trimmed.match(/^(\d+)/);
  if (leadingNumber) {
    return `${leadingNumber[1]} pax`;
  }

  return trimmed.replace(/\bguests?\b/gi, "pax");
}

export function formatBookingRequestContactPhone(phone: string): string {
  if (!phone.trim() || phone === "Missing phone") {
    return "Phone missing";
  }
  return phone.trim();
}

export function formatBookingRequestContactEmail(email: string): string {
  if (!email.trim() || email === "Missing email") {
    return "Email missing";
  }
  return email.trim();
}

export interface BookingRequestMessageInput {
  establishmentName: string;
  date: string;
  time: string;
  clientName: string;
  guestCount: string | null;
  clientPhone: string;
  clientEmail: string;
}

export interface BeachClubBookingRequestMessageInput {
  establishmentName: string;
  date: string;
  sunbedsTime?: string | null;
  lunchTime?: string | null;
  clientName: string;
  guestCount: string | null;
  clientPhone: string;
  clientEmail: string;
}

function formatBeachClubTimeLine(time: string): string {
  const trimmed = time.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
  }
  return trimmed;
}

export function buildBeachClubBookingRequestMessage(
  input: BeachClubBookingRequestMessageInput
): string {
  const datePart = formatGridDayDate(input.date) || "—";
  const lines = [
    input.establishmentName.trim() || "Beach Club",
    datePart,
  ];

  const sunbedsTime = formatBeachClubTimeLine(String(input.sunbedsTime ?? ""));
  const lunchTime = formatBeachClubTimeLine(String(input.lunchTime ?? ""));

  if (sunbedsTime) lines.push(`Sunbeds: ${sunbedsTime}`);
  if (lunchTime) lines.push(`Lunch: ${lunchTime}`);

  lines.push(
    input.clientName.trim() || "Client",
    formatBookingRequestPax(input.guestCount),
    formatBookingRequestContactPhone(input.clientPhone),
    formatBookingRequestContactEmail(input.clientEmail)
  );

  return lines.join("\n");
}

export function buildBookingRequestMessage(
  input: BookingRequestMessageInput
): string {
  const datePart = formatGridDayDate(input.date) || "—";
  const timePart = formatBookingRequestTime(input.time);

  return [
    input.establishmentName.trim() || "Establishment",
    `${datePart} à ${timePart}`,
    input.clientName.trim() || "Client",
    formatBookingRequestPax(input.guestCount),
    formatBookingRequestContactPhone(input.clientPhone),
    formatBookingRequestContactEmail(input.clientEmail),
  ].join("\n");
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand for Safari and older browsers.
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}
