import AdminShowingForm from "@/components/admin/AdminShowingForm";

export default function AdminCreateShowingPage() {
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
      <AdminShowingForm />
    </div>
  );
}
