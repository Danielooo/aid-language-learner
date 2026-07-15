import { AdminUsersTable } from "@/app/_components/features/admin/admin-users-table";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gebruikers" };

export const dynamic = "force-dynamic";

export default function AdminGebruikersPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Admin"
        title="Gebruikers"
        description="Rollen, AI-toegang en deactiveren. Laatste admin kan niet gedegradeerd/gedeactiveerd worden."
      />
      <AdminUsersTable />
    </div>
  );
}
