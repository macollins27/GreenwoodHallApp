"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTimeForDisplay, getBusinessDate } from "@/lib/datetime";

type CalendarBooking = {
  id: string;
  bookingType: string;
  status: string;
  contactName: string;
  contactEmail: string;
  eventType: string;
  guestCount: number | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  totalCents: number;
  amountPaidCents: number;
  stripePaymentStatus: string | null;
  paymentMethod: string | null;
  contractAccepted: boolean;
};

type BlockedDate = {
  id: string;
  date: string;
  reason: string;
};

type CalendarData = {
  bookings: CalendarBooking[];
  blockedDates: BlockedDate[];
};

type ViewMode = "month" | "week";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getBusinessDay(isoString: string): Date {
  const date = getBusinessDate(isoString);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Days from previous month to fill the grid
  const prevMonthDays: Date[] = [];
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    prevMonthDays.push(date);
  }

  // Days in current month
  const currentMonthDays: Date[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push(new Date(year, month, i));
  }

  // Days from next month to complete the grid
  const nextMonthDays: Date[] = [];
  const totalCells = Math.ceil((prevMonthDays.length + currentMonthDays.length) / 7) * 7;
  const remainingCells = totalCells - prevMonthDays.length - currentMonthDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    nextMonthDays.push(new Date(year, month + 1, i));
  }

  return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
}

function getWeekDays(date: Date) {
  const dayOfWeek = date.getDay();
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - dayOfWeek);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
}

export default function AdminCalendar() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});
  const [showEvents, setShowEvents] = useState(true);
  const [showShowings, setShowShowings] = useState(true);
  const [showBlocked, setShowBlocked] = useState(true);

  const today = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === "month") {
        // Get first and last day of the month, plus padding for grid
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startPadding = firstDay.getDay();
        const endPadding = 6 - lastDay.getDay();

        startDate = new Date(currentYear, currentMonth, 1 - startPadding);
        endDate = new Date(currentYear, currentMonth + 1, endPadding);
      } else {
        // Week view
        const weekDays = getWeekDays(currentDate);
        startDate = weekDays[0];
        endDate = weekDays[6];
      }

      const response = await fetch(
        `/api/admin/calendar?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch calendar data");
      }

      const data = await response.json();
      setCalendarData(data);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, currentMonth, currentYear, viewMode]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  function goToToday() {
    setCurrentDate(new Date());
  }

  function goToPreviousMonth() {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  }

  function goToNextMonth() {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  }

  function goToPreviousWeek() {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  }

  function goToNextWeek() {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  }

  function getBookingsForDay(day: Date): CalendarBooking[] {
    if (!calendarData) return [];
    return calendarData.bookings.filter((booking) => {
      const bookingDate = getBusinessDay(booking.eventDate);
      return isSameDay(bookingDate, day);
    });
  }

  function getBlockedDateForDay(day: Date): BlockedDate | null {
    if (!calendarData) return null;
    return (
      calendarData.blockedDates.find((blocked) => {
        const blockedDate = getBusinessDay(blocked.date);
        return isSameDay(blockedDate, day);
      }) || null
    );
  }

  function getPaymentStatus(booking: CalendarBooking): string {
    if (booking.bookingType === "SHOWING") return "";
    if (booking.amountPaidCents >= booking.totalCents) return "paid";
    if (booking.amountPaidCents > 0) return "partial";
    return "unpaid";
  }

  function renderBookingItem(booking: CalendarBooking, isCompact: boolean = false) {
    const paymentStatus = getPaymentStatus(booking);
    const isEvent = booking.bookingType === "EVENT";

    function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
      setHoveredBooking(booking.id);
      
      // Calculate tooltip position
      const rect = e.currentTarget.getBoundingClientRect();
      const tooltipWidth = 256; // w-64 = 16rem = 256px
      const tooltipHeight = 200; // approximate height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const position: { top?: number; bottom?: number; left?: number; right?: number } = {};
      
      // Horizontal positioning
      if (rect.left + tooltipWidth > viewportWidth - 20) {
        // Too close to right edge, position on left
        position.right = viewportWidth - rect.right;
      } else {
        // Position on left side (default)
        position.left = rect.left;
      }
      
      // Vertical positioning
      if (rect.bottom + tooltipHeight > viewportHeight - 20) {
        // Too close to bottom, position above
        position.bottom = viewportHeight - rect.top;
      } else {
        // Position below (default)
        position.top = rect.bottom + 4;
      }
      
      setTooltipPosition(position);
    }

    return (
      <div
        key={booking.id}
        className={`group relative cursor-pointer rounded px-1.5 py-0.5 text-xs transition ${
          isEvent
            ? booking.status === "CANCELLED"
              ? "bg-slate-200 text-slate-500 line-through"
              : "bg-primary/90 text-white hover:bg-primary"
            : booking.status === "CANCELLED"
            ? "bg-slate-100 text-slate-400 line-through"
            : "bg-blue-100 text-blue-800 hover:bg-blue-200"
        } ${isCompact ? "mb-0.5" : "mb-1"}`}
        onClick={() => router.push(`/admin/bookings/${booking.id}?view=calendar`)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHoveredBooking(null)}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-semibold">
            {isEvent
              ? `Event ${formatTimeForDisplay(booking.startTime)}`
              : `Showing ${formatTimeForDisplay(booking.startTime)}`}
          </span>
          <div className="flex items-center gap-1">
            {booking.status === "PENDING" && (
              <span className="text-[10px] opacity-75">⏳</span>
            )}
            {booking.status === "CONFIRMED" && (
              <span className="text-[10px] opacity-75">✓</span>
            )}
            {isEvent && paymentStatus === "paid" && (
              <span className="text-[10px] opacity-75">💰</span>
            )}
            {isEvent && paymentStatus === "partial" && (
              <span className="text-[10px] opacity-75">💵</span>
            )}
          </div>
        </div>

        {/* Hover tooltip */}
        {hoveredBooking === booking.id && (
          <div 
            className="fixed z-50 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
            style={tooltipPosition}
          >
            <div className="space-y-1 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">
                {isEvent ? "Event" : "Showing"}
              </p>
              <p>
                <strong>{isEvent ? "Time:" : "Appointment:"}</strong>{" "}
                {isEvent
                  ? `${formatTimeForDisplay(booking.startTime)} – ${formatTimeForDisplay(booking.endTime)}`
                  : formatTimeForDisplay(booking.startTime)}
              </p>
              <p>
                <strong>Contact:</strong> {booking.contactName}
              </p>
              <p>
                <strong>Type:</strong> {booking.eventType}
              </p>
              {booking.guestCount && (
                <p>
                  <strong>Guests:</strong> {booking.guestCount}
                </p>
              )}
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`font-semibold ${
                    booking.status === "CONFIRMED"
                      ? "text-green-600"
                      : booking.status === "CANCELLED"
                      ? "text-red-600"
                      : "text-amber-600"
                  }`}
                >
                  {booking.status}
                </span>
              </p>
              {isEvent && (
                <>
                  <p>
                    <strong>Total:</strong> {formatCurrency(booking.totalCents)}
                  </p>
                  <p>
                    <strong>Paid:</strong>{" "}
                    {formatCurrency(booking.amountPaidCents)}
                    {paymentStatus === "paid" && (
                      <span className="ml-1 text-green-600">✓ Full</span>
                    )}
                    {paymentStatus === "partial" && (
                      <span className="ml-1 text-amber-600">Partial</span>
                    )}
                    {paymentStatus === "unpaid" && (
                      <span className="ml-1 text-red-600">Unpaid</span>
                    )}
                  </p>
                  <p>
                    <strong>Payment:</strong>{" "}
                    {booking.paymentMethod || "Stripe"}
                  </p>
                </>
              )}
              <p className="pt-1 text-[10px] text-slate-500">
                Click to view details →
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderDayCell(day: Date, isCurrentMonth: boolean) {
    const bookings = getBookingsForDay(day);
    const blockedDate = getBlockedDateForDay(day);
    const isToday = isSameDay(day, today);
    const isPast = day < today && !isToday;

    const filteredBookings = bookings.filter((booking) => {
      if (booking.bookingType === "EVENT" && !showEvents) return false;
      if (booking.bookingType === "SHOWING" && !showShowings) return false;
      return true;
    });

    const visibleBookings = filteredBookings.slice(0, 3);
    const moreCount = filteredBookings.length - visibleBookings.length;

    return (
      <div
        key={day.toISOString()}
        className={`min-h-[120px] border border-slate-200 p-2 ${
          !isCurrentMonth ? "bg-slate-50" : "bg-white"
        } ${isToday ? "ring-2 ring-primary ring-inset" : ""} ${
          isPast && isCurrentMonth ? "opacity-75" : ""
        } ${
          blockedDate && showBlocked
            ? "bg-gradient-to-br from-red-50 to-red-100"
            : ""
        }`}
      >
        <div className="mb-1 flex items-center justify-between">
          <span
            className={`text-sm font-semibold ${
              isToday
                ? "text-primary"
                : !isCurrentMonth
                ? "text-slate-400"
                : "text-slate-700"
            }`}
          >
            {day.getDate()}
          </span>
          {isToday && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
              Today
            </span>
          )}
        </div>

        <div className="space-y-0.5">
          {blockedDate && showBlocked && (
            <div
              className="mb-1 rounded bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white"
              title={blockedDate.reason || "Blocked"}
            >
              🚫 Blocked
              {blockedDate.reason && (
                <div className="text-[10px] opacity-90">{blockedDate.reason}</div>
              )}
            </div>
          )}

          {visibleBookings.map((booking) => renderBookingItem(booking, true))}

          {moreCount > 0 && (
            <div className="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
              +{moreCount} more
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderMonthView() {
    const days = getMonthDays(currentYear, currentMonth);
    const isCurrentMonth = (day: Date) => day.getMonth() === currentMonth;

    return (
      <div className="grid grid-cols-7 gap-0 rounded-lg border border-slate-300 overflow-hidden">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="bg-slate-100 border-b border-slate-300 px-2 py-3 text-center text-sm font-semibold text-slate-700"
          >
            {day}
          </div>
        ))}
        {days.map((day) => renderDayCell(day, isCurrentMonth(day)))}
      </div>
    );
  }

  function renderWeekView() {
    const days = getWeekDays(currentDate);

    return (
      <div className="grid grid-cols-7 gap-0 rounded-lg border border-slate-300 overflow-hidden">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className="border-r border-slate-200 last:border-r-0">
              <div
                className={`border-b border-slate-300 px-2 py-3 text-center ${
                  isToday ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                <div className="text-xs font-semibold">
                  {DAYS_OF_WEEK[day.getDay()]}
                </div>
                <div className="text-lg font-bold">{day.getDate()}</div>
              </div>
              <div className="min-h-[400px] p-2">{renderDayCell(day, true)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={viewMode === "month" ? goToPreviousMonth : goToPreviousWeek}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            Today
          </button>
          <button
            type="button"
            onClick={viewMode === "month" ? goToNextMonth : goToNextWeek}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Next →
          </button>
          <span className="ml-2 text-lg font-semibold text-slate-900">
            {monthName}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-4 py-2 text-sm font-semibold transition ${
                viewMode === "month"
                  ? "bg-primary text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-4 py-2 text-sm font-semibold transition ${
                viewMode === "week"
                  ? "bg-primary text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Week
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 border-l border-slate-300 pl-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showEvents}
                onChange={(e) => setShowEvents(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="font-semibold text-slate-700">Events</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showShowings}
                onChange={(e) => setShowShowings(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="font-semibold text-slate-700">Showings</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showBlocked}
                onChange={(e) => setShowBlocked(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="font-semibold text-slate-700">Blocked</span>
            </label>
          </div>
        </div>
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl bg-white p-12 shadow-sm">
          <p className="text-slate-500">Loading calendar...</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          {viewMode === "month" ? renderMonthView() : renderWeekView()}
        </div>
      )}

      {/* Legend */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">Legend:</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-primary"></div>
            <span>Event (Rental)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-blue-100 border border-blue-300"></div>
            <span>Showing (Tour)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-100 border border-red-300"></div>
            <span>Blocked Day</span>
          </div>
          <div className="flex items-center gap-2">
            <span>⏳ Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✓ Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <span>💰 Paid</span>
          </div>
          <div className="flex items-center gap-2">
            <span>💵 Partial</span>
          </div>
        </div>
      </div>
    </div>
  );
}
