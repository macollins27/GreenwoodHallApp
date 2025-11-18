import AdminBookingForm from "@/components/admin/AdminBookingForm";

export default function AdminCreateBookingPage() {
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
      <AdminBookingForm />
    </div>
  );
}
