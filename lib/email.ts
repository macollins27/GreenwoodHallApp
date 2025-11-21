import { ServerClient } from "postmark";
import type { AddOn, Booking, BookingAddOn } from "@prisma/client";
import { formatDateForDisplay, formatTimeForDisplay } from "./datetime";

export type BookingWithExtras = Booking & {
  addOns?: Array<
    BookingAddOn & {
      addOn?: AddOn | null;
    }
  >;
};

const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN ?? "";
const POSTMARK_FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL ?? "";
const ADMIN_EMAIL =
  process.env.POSTMARK_ADMIN_EMAIL ??
  process.env.ADMIN_EMAIL ??
  POSTMARK_FROM_EMAIL;

const emailEnabled = Boolean(POSTMARK_SERVER_TOKEN && POSTMARK_FROM_EMAIL);
const postmarkClient = emailEnabled
  ? new ServerClient(POSTMARK_SERVER_TOKEN)
  : null;
let warnedDisabled = false;

function ensureEmailEnabled() {
  if (emailEnabled && postmarkClient) return true;
  if (!warnedDisabled) {
    console.warn(
      "[email] Postmark not configured. Skipping email send. Set POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL."
    );
    warnedDisabled = true;
  }
  return false;
}

const fmtMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

const describeAddOns = (booking: BookingWithExtras) =>
  booking.addOns && booking.addOns.length > 0
    ? booking.addOns
        .map((addon) => {
          const name = addon.addOn?.name ?? "Add-on";
          const qty = addon.quantity ?? 0;
          const price = addon.priceAtBooking ?? 0;
          return `• ${name} x${qty} (${fmtMoney(price * qty)})`;
        })
        .join("\n")
    : "None";

const describeSetup = (booking: BookingWithExtras) => {
  const parts: string[] = [];
  if (booking.rectTablesRequested)
    parts.push(`Rectangular tables: ${booking.rectTablesRequested}`);
  if (booking.roundTablesRequested)
    parts.push(`Round tables: ${booking.roundTablesRequested}`);
  if (booking.chairsRequested)
    parts.push(`Chairs: ${booking.chairsRequested}`);
  if (booking.setupNotes) parts.push(`Setup notes: ${booking.setupNotes}`);
  return parts.length > 0 ? parts.join("\n") : "No setup preferences provided.";
};

const formatDateTimeRange = (booking: Booking) =>
  `${formatDateForDisplay(booking.eventDate)} ${formatTimeForDisplay(
    booking.startTime
  )} – ${formatTimeForDisplay(booking.endTime)}`;

const manageLink = (booking: BookingWithExtras) =>
  booking.managementToken
    ? `/manage/booking/${booking.managementToken}`
    : "If you need updates, contact us.";

async function sendEmail(to: string, subject: string, body: string) {
  if (!ensureEmailEnabled()) return;
  try {
    await postmarkClient!.sendEmail({
      From: POSTMARK_FROM_EMAIL,
      To: to,
      Subject: subject,
      TextBody: body,
      MessageStream: "outbound",
    });
  } catch (error) {
    console.error("[email] Failed to send email", { to, subject, error });
  }
}

export async function sendAdminEventNotification(
  booking: BookingWithExtras
) {
  await sendEmail(
    ADMIN_EMAIL,
    `New Event booking – ${formatDateForDisplay(booking.eventDate)}`,
    [
      "New EVENT booking received.",
      "",
      `Date/time: ${formatDateTimeRange(booking)}`,
      `Contact: ${booking.contactName} (${booking.contactEmail}${
        booking.contactPhone ? `, ${booking.contactPhone}` : ""
      })`,
      `Event type: ${booking.eventType ?? "N/A"}`,
      `Guests: ${booking.guestCount ?? "N/A"}`,
      `Amount paid: ${fmtMoney(booking.amountPaidCents)} / ${fmtMoney(
        booking.totalCents
      )}`,
      "",
      "Setup:",
      describeSetup(booking),
      "",
      "Add-ons:",
      describeAddOns(booking),
      "",
      booking.notes ? `Customer notes:\n${booking.notes}\n` : "",
      `Booking ID: ${booking.id}`,
    ].join("\n")
  );
}

export async function sendAdminShowingNotification(
  booking: BookingWithExtras
) {
  await sendEmail(
    ADMIN_EMAIL,
    `New Showing booked – ${formatDateForDisplay(booking.eventDate)}`,
    [
      "New SHOWING booking received.",
      "",
      `Date/time: ${formatDateTimeRange(booking)}`,
      `Contact: ${booking.contactName} (${booking.contactEmail}${
        booking.contactPhone ? `, ${booking.contactPhone}` : ""
      })`,
      booking.notes ? `Notes:\n${booking.notes}` : "No notes",
      "",
      `Booking ID: ${booking.id}`,
    ].join("\n")
  );
}

export async function sendAdminCancellationNotification(
  booking: BookingWithExtras
) {
  await sendEmail(
    ADMIN_EMAIL,
    `${booking.bookingType} booking cancelled – ${formatDateForDisplay(
      booking.eventDate
    )}`,
    [
      `${booking.bookingType} was cancelled.`,
      `Date/time: ${formatDateTimeRange(booking)}`,
      `Contact: ${booking.contactName} (${booking.contactEmail}${
        booking.contactPhone ? `, ${booking.contactPhone}` : ""
      })`,
      `Status: ${booking.status}`,
      "",
      `Booking ID: ${booking.id}`,
    ].join("\n")
  );
}

export async function sendCustomerEventConfirmation(
  booking: BookingWithExtras
) {
  await sendEmail(
    booking.contactEmail,
    `Your Greenwood Hall Event is Confirmed – ${formatDateForDisplay(
      booking.eventDate
    )}`,
    [
      `Hi ${booking.contactName},`,
      "",
      "Your event is confirmed.",
      `Date/time: ${formatDateTimeRange(booking)}`,
      `Event type: ${booking.eventType ?? "N/A"}`,
      `Guests: ${booking.guestCount ?? "N/A"}`,
      "",
      "Payment:",
      `Paid: ${fmtMoney(booking.amountPaidCents)}`,
      `Total: ${fmtMoney(booking.totalCents)}`,
      `Remaining: ${fmtMoney(
        Math.max(booking.totalCents - booking.amountPaidCents, 0)
      )}`,
      "",
      "Setup:",
      describeSetup(booking),
      "",
      "Add-ons:",
      describeAddOns(booking),
      "",
      `Manage your booking: ${manageLink(booking)}`,
      "",
      "Hall notes: 2 hours free setup, no food or drink provided.",
      "Questions? Reply to this email.",
    ].join("\n")
  );
}

export async function sendCustomerEventUpdated(
  booking: BookingWithExtras
) {
  await sendEmail(
    booking.contactEmail,
    "Your Greenwood Hall Event Details Have Been Updated",
    [
      `Hi ${booking.contactName},`,
      "",
      "Your event details were updated.",
      `Current schedule: ${formatDateTimeRange(booking)}`,
      "",
      "Contact:",
      `${booking.contactName} (${booking.contactEmail}${
        booking.contactPhone ? `, ${booking.contactPhone}` : ""
      })`,
      "",
      "Setup:",
      describeSetup(booking),
      "",
      "Add-ons:",
      describeAddOns(booking),
      "",
      `Manage your booking: ${manageLink(booking)}`,
      "",
      "If these changes look unfamiliar, please contact us.",
    ].join("\n")
  );
}

export async function sendCustomerEventCancelled(
  booking: BookingWithExtras
) {
  await sendEmail(
    booking.contactEmail,
    "Your Greenwood Hall Event Has Been Cancelled",
    [
      `Hi ${booking.contactName},`,
      "",
      "Your event has been cancelled.",
      `Original schedule: ${formatDateTimeRange(booking)}`,
      "Note: Deposits may be non-refundable within 30 days of the event.",
      "If you have questions or want to reschedule, please contact us.",
    ].join("\n")
  );
}

export async function sendCustomerPaymentReceipt(
  booking: BookingWithExtras,
  amountCents: number,
  isRemainingBalance: boolean
) {
  const remaining = Math.max(booking.totalCents - booking.amountPaidCents, 0);
  await sendEmail(
    booking.contactEmail,
    isRemainingBalance
      ? "Remaining balance paid for your Greenwood Hall event"
      : "Payment received for your Greenwood Hall event",
    [
      `Hi ${booking.contactName},`,
      "",
      `We received a payment of ${fmtMoney(amountCents)}.`,
      `Event: ${formatDateTimeRange(booking)}`,
      `Total paid: ${fmtMoney(booking.amountPaidCents)}`,
      `Total due: ${fmtMoney(booking.totalCents)}`,
      `Remaining balance: ${fmtMoney(remaining)}`,
      isRemainingBalance && remaining === 0
        ? "Your event is now paid in full. Thank you!"
        : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
}

export async function sendCustomerShowingConfirmation(
  booking: BookingWithExtras
) {
  await sendEmail(
    booking.contactEmail,
    "Your Greenwood Hall Hall Tour is Confirmed",
    [
      `Hi ${booking.contactName},`,
      "",
      "Your hall tour is confirmed.",
      `Date/time: ${formatDateTimeRange(booking)}`,
      "This tour is free. Parking is available on-site.",
      "If you need to change anything, reply to this email.",
    ].join("\n")
  );
}

export async function sendCustomerShowingUpdated(
  booking: BookingWithExtras
) {
  await sendEmail(
    booking.contactEmail,
    "Your Greenwood Hall Hall Tour Details Have Been Updated",
    [
      `Hi ${booking.contactName},`,
      "",
      "Your hall tour details were updated.",
      `Schedule: ${formatDateTimeRange(booking)}`,
      booking.notes ? `Notes: ${booking.notes}` : "",
      `Manage link: ${manageLink(booking)}`,
      "If this was unexpected, please contact us.",
    ]
      .filter(Boolean)
      .join("\n")
  );
}

export async function sendCustomerShowingCancelled(
  booking: BookingWithExtras
) {
  await sendEmail(
    booking.contactEmail,
    "Your Greenwood Hall Hall Tour Has Been Cancelled",
    [
      `Hi ${booking.contactName},`,
      "",
      "Your hall tour has been cancelled.",
      `Original schedule: ${formatDateTimeRange(booking)}`,
      "To reschedule, please reply to this email or visit our site.",
    ].join("\n")
  );
}
