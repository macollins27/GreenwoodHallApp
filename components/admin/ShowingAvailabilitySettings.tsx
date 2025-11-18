"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type TimeWindow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
};

type ShowingConfig = {
  defaultDurationMinutes: number;
  maxSlotsPerWindow: number;
};

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function ShowingAvailabilitySettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<ShowingConfig>({
    defaultDurationMinutes: 30,
    maxSlotsPerWindow: 999,
  });
  const [availability, setAvailability] = useState<TimeWindow[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/showing-availability");
      if (!response.ok) throw new Error("Failed to fetch settings");
      
      const data = await response.json();
      setConfig(data.config || { defaultDurationMinutes: 30, maxSlotsPerWindow: 999 });
      setAvailability(data.availability || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setMessage("Error loading settings");
    } finally {
      setLoading(false);
    }
  }

  async function initializeDefaults() {
    try {
      const response = await fetch("/api/admin/showing-availability/initialize", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to initialize");
      
      setMessage("Initialized with default Thursday 3pm-6pm schedule");
      fetchSettings();
    } catch (error) {
      console.error("Error initializing:", error);
      setMessage("Error initializing defaults");
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch("/api/admin/showing-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          availability,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");
      
      setMessage("Settings saved successfully");
      router.refresh();
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage("Error saving settings");
    } finally {
      setSaving(false);
    }
  }

  function addTimeWindow(dayOfWeek: number) {
    setAvailability([
      ...availability,
      {
        dayOfWeek,
        startTime: "15:00",
        endTime: "18:00",
        enabled: true,
      },
    ]);
  }

  function removeTimeWindow(index: number) {
    setAvailability(availability.filter((_, i) => i !== index));
  }

  function updateTimeWindow(index: number, field: keyof TimeWindow, value: any) {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    setAvailability(updated);
  }

  function getDayLabel(dayOfWeek: number) {
    return DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label || "";
  }

  const groupedByDay = DAYS_OF_WEEK.map((day) => ({
    ...day,
    windows: availability.filter((w) => w.dayOfWeek === day.value),
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back to dashboard
        </button>
        <div className="rounded-3xl bg-white p-12 shadow-card text-center">
          <p className="text-slate-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/admin")}
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← Back to dashboard
      </button>

      <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Admin Settings
          </p>
          <h1 className="text-2xl font-semibold text-textMain">
            Showing Availability Configuration
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Configure when customers can book free hall showings. Events are not affected by these settings.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-primary/20 bg-primaryLight/40 p-4 text-sm font-semibold text-primary">
            {message}
          </div>
        )}

        {/* Global Config */}
        <div className="mb-8 rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-textMain">Global Settings</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Appointment Duration (minutes)
              </label>
              <input
                type="number"
                min={15}
                max={120}
                step={15}
                value={config.defaultDurationMinutes}
                onChange={(e) =>
                  setConfig({ ...config, defaultDurationMinutes: parseInt(e.target.value) || 30 })
                }
                className="w-full rounded-2xl border border-primary/20 px-4 py-3 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                How long each showing appointment lasts
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Max Showings Per Slot
              </label>
              <input
                type="number"
                min={1}
                max={999}
                value={config.maxSlotsPerWindow}
                onChange={(e) =>
                  setConfig({ ...config, maxSlotsPerWindow: parseInt(e.target.value) || 999 })
                }
                className="w-full rounded-2xl border border-primary/20 px-4 py-3 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                999 = unlimited (multiple showings can overlap)
              </p>
            </div>
          </div>
        </div>

        {/* Day-by-Day Schedule */}
        <div className="mb-6 rounded-2xl border border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-textMain">Weekly Schedule</h2>
          <p className="mb-4 text-sm text-slate-600">
            Add time windows for each day when showings are available.
          </p>

          <div className="space-y-4">
            {groupedByDay.map((day) => (
              <div key={day.value} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{day.label}</h3>
                  <button
                    type="button"
                    onClick={() => addTimeWindow(day.value)}
                    className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition hover:bg-primary/90"
                  >
                    + Add Time Window
                  </button>
                </div>

                {day.windows.length === 0 ? (
                  <p className="text-sm text-slate-500">No showings available on {day.label}s</p>
                ) : (
                  <div className="space-y-2">
                    {availability.map((window, index) => {
                      if (window.dayOfWeek !== day.value) return null;
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"
                        >
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={window.startTime}
                              onChange={(e) =>
                                updateTimeWindow(index, "startTime", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              End Time
                            </label>
                            <input
                              type="time"
                              value={window.endTime}
                              onChange={(e) =>
                                updateTimeWindow(index, "endTime", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="pt-6">
                            <button
                              type="button"
                              onClick={() => removeTimeWindow(index)}
                              className="rounded-lg border border-danger px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {availability.length > 0 && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="mb-2 text-sm font-semibold text-blue-900">Current Schedule Summary:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              {groupedByDay
                .filter((day) => day.windows.length > 0)
                .map((day) => (
                  <li key={day.value}>
                    <strong>{day.label}:</strong>{" "}
                    {day.windows
                      .map((w) => `${w.startTime}–${w.endTime}`)
                      .join(", ")}
                  </li>
                ))}
            </ul>
            <p className="mt-2 text-xs text-blue-700">
              {config.defaultDurationMinutes}-minute appointments,{" "}
              {config.maxSlotsPerWindow === 999 ? "unlimited" : config.maxSlotsPerWindow} per slot
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {availability.length === 0 && (
            <button
              type="button"
              onClick={initializeDefaults}
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Load Default Schedule (Thu 3pm-6pm)
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
