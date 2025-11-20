"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminCalendar from "./AdminCalendar";
import {
  formatDateForDisplay,
  formatTimeForDisplay,
  getBusinessDate,
} from "@/lib/datetime";

function getBusinessDay(isoString: string): Date {
  const date = getBusinessDate(isoString);
  date.setHours(0, 0, 0, 0);
  return date;
}

type BookingRow = {
  id: string;
  bookingType: string;
  status: string;
  contactName: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  totalCents: number;
};

type BlockedDateRow = {
  id: string;
  date: string;
  reason: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export default function DashboardClient({
  initialBookings,
  initialBlockedDates,
}: {
  initialBookings: BookingRow[];
  initialBlockedDates: BlockedDateRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [blockedDate, setBlockedDate] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const viewParam = searchParams.get("view");
  const dashboardView: "list" | "calendar" =
    viewParam === "list" || viewParam === "calendar" ? viewParam : "calendar";

  useEffect(() => {
    if (viewParam === "list" || viewParam === "calendar") {
      if (typeof window !== "undefined") {
        localStorage.setItem("adminDashboardView", viewParam);
      }
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const saved = localStorage.getItem("adminDashboardView");
    const fallback =
      saved === "list" || saved === "calendar" ? saved : "calendar";
    router.replace(`/admin?view=${fallback}`);
  }, [router, viewParam]);

  const handleDashboardViewChange = (nextView: "list" | "calendar") => {
    if (nextView === dashboardView) {
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("adminDashboardView", nextView);
    }
    router.replace(`/admin?view=${nextView}`);
  };
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<"date" | "type" | "status" | "created">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Filtering state
  const [filterType, setFilterType] = useState<"all" | "events" | "showings">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | string>("all");
  const [filterDateRange, setFilterDateRange] = useState<"all-upcoming" | "today" | "this-week" | "next-7-days" | "this-month">("all-upcoming");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("adminPageSize");
      return saved ? parseInt(saved, 10) : 15;
    }
    return 15;
  });
  
  // Persist page size
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("adminPageSize", pageSize.toString());
    }
  }, [pageSize]);
  
  // Apply filters, sorting, and pagination
  const getFilteredAndSortedBookings = () => {
    let filtered = [...initialBookings];
    
    // Apply type filter
    if (filterType === "events") {
      filtered = filtered.filter(b => b.bookingType === "EVENT");
    } else if (filterType === "showings") {
      filtered = filtered.filter(b => b.bookingType === "SHOWING");
    }
    
    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(b => b.status.toUpperCase() === filterStatus.toUpperCase());
    }
    
    // Apply date range filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (filterDateRange === "today") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = filtered.filter(b => {
        const bookingDate = getBusinessDay(b.eventDate);
        return bookingDate >= today && bookingDate < tomorrow;
      });
    } else if (filterDateRange === "this-week") {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      filtered = filtered.filter(b => {
        const bookingDate = getBusinessDay(b.eventDate);
        return bookingDate >= today && bookingDate <= endOfWeek;
      });
    } else if (filterDateRange === "next-7-days") {
      const next7 = new Date(today);
      next7.setDate(next7.getDate() + 7);
      filtered = filtered.filter(b => {
        const bookingDate = getBusinessDay(b.eventDate);
        return bookingDate >= today && bookingDate < next7;
      });
    } else if (filterDateRange === "this-month") {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      filtered = filtered.filter(b => {
        const bookingDate = getBusinessDay(b.eventDate);
        return bookingDate >= today && bookingDate <= endOfMonth;
      });
    }
    // "all-upcoming" is default - already handled by server query (eventDate >= today)
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortColumn === "date") {
        comparison = getBusinessDay(a.eventDate).getTime() - getBusinessDay(b.eventDate).getTime();
      } else if (sortColumn === "type") {
        comparison = a.bookingType.localeCompare(b.bookingType);
      } else if (sortColumn === "status") {
        comparison = a.status.localeCompare(b.status);
      } else if (sortColumn === "created") {
        // We don't have createdAt in the data, use eventDate as fallback
        comparison = getBusinessDay(a.eventDate).getTime() - getBusinessDay(b.eventDate).getTime();
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  };
  
  const filteredBookings = getFilteredAndSortedBookings();
  const totalPages = Math.ceil(filteredBookings.length / pageSize);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterStatus, filterDateRange, sortColumn, sortDirection]);
  
  const handleSort = (column: "date" | "type" | "status" | "created") => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };
  
  const clearFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
    setFilterDateRange("all-upcoming");
    setSortColumn("date");
    setSortDirection("asc");
  };
  
  const hasActiveFilters = filterType !== "all" || filterStatus !== "all" || filterDateRange !== "all-upcoming";

  async function addBlockedDate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);
    if (!blockedDate) {
      setFormMessage("Please select a date to block.");
      return;
    }
    const response = await fetch("/api/admin/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: blockedDate, reason: blockedReason }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setFormMessage(payload?.error ?? "Unable to save blocked date.");
      return;
    }
    setBlockedDate("");
    setBlockedReason("");
    router.refresh();
  }

  async function removeBlockedDate(id: string) {
    setFormMessage(null);
    const response = await fetch(`/api/admin/blocked-dates/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setFormMessage(payload?.error ?? "Unable to remove blocked date.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border border-slate-300 overflow-hidden bg-white shadow-sm">
          <button
            type="button"
            onClick={() => handleDashboardViewChange("calendar")}
            className={`px-6 py-3 text-sm font-semibold transition ${
              dashboardView === "calendar"
                ? "bg-primary text-white"
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            📅 Calendar View
          </button>
          <button
            type="button"
            onClick={() => handleDashboardViewChange("list")}
            className={`px-6 py-3 text-sm font-semibold transition ${
              dashboardView === "list"
                ? "bg-primary text-white"
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            📋 List View
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {dashboardView === "calendar" && <AdminCalendar />}

      {/* List View */}
      {dashboardView === "list" && (
        <>
          <section className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Bookings
            </p>
            <h2 className="text-xl font-semibold text-textMain">
              Events &amp; Showings
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push("/admin/events/create")}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                + Event Booking
              </button>
              <button
                type="button"
                onClick={() => router.push("/admin/showings/create")}
                className="rounded-full border-2 border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
              >
                + Hall Showing
              </button>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="events">Events Only</option>
                <option value="showings">Showings Only</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Date Range</label>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value as typeof filterDateRange)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="all-upcoming">All Upcoming</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="next-7-days">Next 7 Days</option>
                <option value="this-month">This Month</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Page Size</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
          
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-600">
                <span className="font-semibold">Active filters:</span> {
                  [
                    filterType !== "all" && `Type: ${filterType}`,
                    filterStatus !== "all" && `Status: ${filterStatus}`,
                    filterDateRange !== "all-upcoming" && `Range: ${filterDateRange.replace(/-/g, " ")}`
                  ].filter(Boolean).join(", ")
                } • Showing {filteredBookings.length} result{filteredBookings.length !== 1 ? "s" : ""}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-slate-700">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">
                  <button
                    type="button"
                    onClick={() => handleSort("date")}
                    className="flex items-center gap-1 hover:text-primary transition"
                  >
                    Date
                    {sortColumn === "date" && (
                      <span className="text-primary">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">
                  <button
                    type="button"
                    onClick={() => handleSort("type")}
                    className="flex items-center gap-1 hover:text-primary transition"
                  >
                    Type
                    {sortColumn === "type" && (
                      <span className="text-primary">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
                <th className="py-2 pr-4">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-1 hover:text-primary transition"
                  >
                    Status
                    {sortColumn === "status" && (
                      <span className="text-primary">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    {hasActiveFilters ? "No bookings match your filters." : "No upcoming bookings yet."}
                  </td>
                </tr>
              )}
              {paginatedBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-slate-100 last:border-none hover:bg-slate-50 transition"
                >
                  <td className="py-3 pr-4 font-medium text-textMain">
                    {formatDateForDisplay(booking.eventDate ?? booking.startTime, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="py-3 pr-4">
                    {booking.startTime && booking.endTime
                      ? `${formatTimeForDisplay(booking.startTime)} – ${formatTimeForDisplay(booking.endTime)}`
                      : "Time not set"}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      booking.bookingType === "EVENT" 
                        ? "bg-purple-100 text-purple-700" 
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {booking.bookingType}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      booking.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                      booking.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                      booking.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{booking.contactName}</td>
                  <td className="py-3 pr-4">{booking.eventType}</td>
                  <td className="py-3 pr-4 font-semibold text-textMain">
                    {booking.bookingType === "EVENT"
                      ? formatCurrency(booking.totalCents)
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/bookings/${booking.id}?view=${dashboardView}`)
                      }
                      className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/5"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-600">
              Page {currentPage} of {totalPages} • {filteredBookings.length} total result{filteredBookings.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Blocked Dates
            </p>
            <h2 className="text-xl font-semibold text-textMain">
              Hold or blackout days
            </h2>
          </div>
          {formMessage && (
            <p className="text-sm text-danger">{formMessage}</p>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {initialBlockedDates.length === 0 && (
            <p className="rounded-2xl border border-dashed border-primary/30 bg-primaryLight/20 p-4 text-sm text-slate-600">
              No blocked dates. Add one below to prevent bookings on specific days.
            </p>
          )}
          {initialBlockedDates.map((blocked) => (
            <div
              key={blocked.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-semibold text-textMain">
                  {formatDateForDisplay(blocked.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                {blocked.reason && (
                  <p className="text-xs text-slate-600">{blocked.reason}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeBlockedDate(blocked.id)}
                className="rounded-full border border-danger px-3 py-1 text-xs font-semibold text-danger transition hover:bg-danger/10"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addBlockedDate} className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="blocked-date" className="text-sm font-semibold text-textMain">
              Block date
            </label>
            <input
              id="blocked-date"
              type="date"
              value={blockedDate}
              onChange={(event) => setBlockedDate(event.target.value)}
              required
              className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="blocked-reason" className="text-sm font-semibold text-textMain">
              Reason (optional)
            </label>
            <textarea
              id="blocked-reason"
              rows={2}
              value={blockedReason}
              onChange={(event) => setBlockedReason(event.target.value)}
              placeholder="Maintenance, holiday, etc."
              className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            Block this date
          </button>
        </form>
      </section>
        </>
      )}
    </div>
  );
}

