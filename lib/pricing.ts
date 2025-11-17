import { BUSINESS_HOURS, PRICING_DETAILS } from "./constants";

export type DayType = "weekday" | "weekend";
export type BookingType = "EVENT" | "SHOWING";

export interface PricingInput {
  eventDate: Date;
  startTime: Date;
  endTime: Date;
  extraSetupHours: number;
  bookingType: BookingType;
}

export interface PricingBreakdown {
  dayType: DayType;
  hourlyRateCents: number;
  eventHours: number;
  baseAmountCents: number;
  extraSetupHours: number;
  extraSetupCents: number;
  depositCents: number;
  totalCents: number;
}

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

export function getDayType(date: Date): DayType {
  const day = date.getDay();
  if (day >= 1 && day <= 4) {
    return "weekday";
  }
  return "weekend";
}

export function validateAndCalculatePricing(
  input: PricingInput
): PricingBreakdown {
  const {
    eventDate,
    startTime,
    endTime,
    extraSetupHours,
    bookingType,
  } = input;

  if (!(eventDate instanceof Date) || Number.isNaN(eventDate.getTime())) {
    throw new PricingError("Invalid event date.");
  }

  if (!(startTime instanceof Date) || Number.isNaN(startTime.getTime())) {
    throw new PricingError("Invalid event start time.");
  }

  if (!(endTime instanceof Date) || Number.isNaN(endTime.getTime())) {
    throw new PricingError("Invalid event end time.");
  }

  if (endTime <= startTime) {
    throw new PricingError("Event end time must be after start time.");
  }

  const sameDay =
    eventDate.getFullYear() === startTime.getFullYear() &&
    eventDate.getMonth() === startTime.getMonth() &&
    eventDate.getDate() === startTime.getDate() &&
    eventDate.getFullYear() === endTime.getFullYear() &&
    eventDate.getMonth() === endTime.getMonth() &&
    eventDate.getDate() === endTime.getDate();
  const midnightEnd =
    endTime.getFullYear() === eventDate.getFullYear() &&
    endTime.getMonth() === eventDate.getMonth() &&
    endTime.getDate() === eventDate.getDate() + 1 &&
    endTime.getHours() === 0 &&
    endTime.getMinutes() === 0 &&
    endTime.getSeconds() === 0 &&
    endTime.getMilliseconds() === 0;

  if (!sameDay && !midnightEnd) {
    throw new PricingError(
      "Event date, start time, and end time must be on the same day."
    );
  }

  const startHour = startTime.getHours();
  const rawEndHour = endTime.getHours();
  const normalizedEndHour = midnightEnd ? 24 : rawEndHour;

  if (
    startHour < BUSINESS_HOURS.openHour ||
    normalizedEndHour > BUSINESS_HOURS.closeHour
  ) {
    throw new PricingError(
      "Event time must be within operating hours (8:00–24:00)."
    );
  }

  const diffMs = endTime.getTime() - startTime.getTime();
  const hours = diffMs / (1000 * 60 * 60);

  if (!Number.isInteger(hours) || hours <= 0) {
    throw new PricingError(
      "Event duration must be a positive whole number of hours."
    );
  }

  const dayType = getDayType(eventDate);

  if (bookingType === "SHOWING") {
    if (extraSetupHours !== 0) {
      throw new PricingError(
        "Extra setup hours are not applicable for showings."
      );
    }

    return {
      dayType,
      hourlyRateCents: 0,
      eventHours: hours,
      baseAmountCents: 0,
      extraSetupHours: 0,
      extraSetupCents: 0,
      depositCents: 0,
      totalCents: 0,
    };
  }

  const hourlyRateCents =
    dayType === "weekday"
      ? PRICING_DETAILS.weekdayRate * 100
      : PRICING_DETAILS.weekendRate * 100;

  if (
    dayType === "weekend" &&
    hours < PRICING_DETAILS.weekendMinimumHours
  ) {
    throw new PricingError(
      `Weekend bookings require at least ${PRICING_DETAILS.weekendMinimumHours} event hours.`
    );
  }

  if (
    !Number.isInteger(extraSetupHours) ||
    extraSetupHours < 0
  ) {
    throw new PricingError(
      "Extra setup hours must be a non-negative integer."
    );
  }

  const baseAmountCents = hours * hourlyRateCents;
  const extraSetupCents =
    extraSetupHours * (PRICING_DETAILS.extraSetupHourly * 100);
  const depositCents = PRICING_DETAILS.securityDeposit * 100;
  const totalCents = baseAmountCents + extraSetupCents + depositCents;

  return {
    dayType,
    hourlyRateCents,
    eventHours: hours,
    baseAmountCents,
    extraSetupHours,
    extraSetupCents,
    depositCents,
    totalCents,
  };
}

