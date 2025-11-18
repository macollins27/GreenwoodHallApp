import AdminEventForm from "@/components/admin/AdminEventForm";

export default function AdminCreateEventPage() {
  return (
    <div className="space-y-6">
      <div>
        <a
          href="/admin"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back to dashboard
        </a>
      </div>
      <AdminEventForm />
    </div>
  );
}
