import { AdminCreateAdminForm } from "@/components/features/admin/admin-create-admin-form";
import { AppPageHeader } from "@/components/ui/app-page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin aanmaken" };

export const dynamic = "force-dynamic";

export default function AdminCreateAdminPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Admin aanmaken"
        description="Maakt een apart admin-account aan. Je blijft zelf ingelogd."
      />
      <AdminCreateAdminForm />
    </div>
  );
}
