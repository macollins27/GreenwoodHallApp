"use client";

import { useState, useEffect } from "react";

type AddOn = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  active: boolean;
  sortOrder: number;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export default function AddOnsManagementPage() {
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAddOns();
  }, []);

  async function fetchAddOns() {
    try {
      const response = await fetch("/api/admin/addons");
      if (!response.ok) throw new Error("Failed to fetch add-ons");
      const data = await response.json();
      setAddOns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormActive(true);
    setFormMessage(null);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(addOn: AddOn) {
    setFormName(addOn.name);
    setFormDescription(addOn.description || "");
    setFormPrice((addOn.priceCents / 100).toFixed(2));
    setFormActive(addOn.active);
    setEditingId(addOn.id);
    setShowForm(true);
    setFormMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormMessage(null);

    const priceCents = Math.round(parseFloat(formPrice) * 100);

    if (isNaN(priceCents) || priceCents < 0) {
      setFormMessage("Price must be a valid non-negative number");
      return;
    }

    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      priceCents,
      active: formActive,
    };

    try {
      const url = editingId 
        ? `/api/admin/addons/${editingId}` 
        : "/api/admin/addons";
      
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save add-on");
      }

      await fetchAddOns();
      resetForm();
    } catch (err) {
      setFormMessage(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      const response = await fetch(`/api/admin/addons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!response.ok) throw new Error("Failed to update add-on");
      await fetchAddOns();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update add-on");
    }
  }

  async function deleteAddOn(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/admin/addons/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete add-on");
      }

      await fetchAddOns();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete add-on");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Loading add-ons...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-danger">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Event Add-ons
          </p>
          <h1 className="text-2xl font-semibold text-textMain">
            Manage Rental Add-ons
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Configure items customers can add to their event bookings
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          + New Add-on
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <section className="rounded-3xl bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold text-textMain mb-4">
            {editingId ? "Edit Add-on" : "Create New Add-on"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-textMain">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="rounded-2xl border border-primary/20 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="e.g., Whicker Chair"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-textMain">
                  Price <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  required
                  className="rounded-2xl border border-primary/20 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="25.00"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-textMain">
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="rounded-2xl border border-primary/20 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                placeholder="Optional description for customers"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="rounded border-primary/20"
              />
              <label htmlFor="active" className="text-sm text-textMain">
                Active (available for new bookings)
              </label>
            </div>

            {formMessage && (
              <p className="text-sm text-danger">{formMessage}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                {editingId ? "Update" : "Create"} Add-on
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border-2 border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Add-ons List */}
      <section className="rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold text-textMain mb-4">
          Current Add-ons ({addOns.length})
        </h2>

        {addOns.length === 0 ? (
          <p className="text-slate-500 text-center py-6">
            No add-ons configured yet. Create one to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {addOns.map((addOn) => (
              <div
                key={addOn.id}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                  addOn.active 
                    ? "border-slate-200 bg-white" 
                    : "border-slate-300 bg-slate-50"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-textMain">{addOn.name}</p>
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(addOn.priceCents)}
                    </span>
                    {!addOn.active && (
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
                        Inactive
                      </span>
                    )}
                  </div>
                  {addOn.description && (
                    <p className="text-sm text-slate-600 mt-1">{addOn.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(addOn)}
                    className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(addOn.id, addOn.active)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      addOn.active
                        ? "border-slate-300 text-slate-600 hover:bg-slate-50"
                        : "border-primary text-primary hover:bg-primary/5"
                    }`}
                  >
                    {addOn.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAddOn(addOn.id, addOn.name)}
                    className="rounded-full border border-danger px-3 py-1 text-xs font-semibold text-danger transition hover:bg-danger/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
