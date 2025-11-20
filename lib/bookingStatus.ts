export const EVENT_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
} as const;

export const SHOWING_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

/**
 * Events only block dates once they are fully confirmed.
 * Public bookings reach CONFIRMED after Stripe payment;
 * admin bookings mark CONFIRMED when staff explicitly approves them.
 */
export const EVENT_BLOCKING_STATUS = EVENT_STATUS.CONFIRMED;

export function isBlockingEventBooking(booking: {
  bookingType: string;
  status: string;
}): boolean {
  return (
    booking.bookingType === "EVENT" &&
    booking.status === EVENT_BLOCKING_STATUS
  );
}
