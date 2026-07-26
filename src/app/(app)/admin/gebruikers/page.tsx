import { AdminUsersTable } from "@/components/features/admin/admin-users-table";
import { AppPageHeader } from "@/components/ui/app-page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gebruikers beheren" };

export const dynamic = "force-dynamic";

export default function AdminGebruikersPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Gebruikers beheren"
        description="AI-toegang, deactiveren en verwijderen. De laatste admin kan niet weg. Nieuwe admins via Admin aanmaken."
      />
      <AdminUsersTable />
    </div>
  );
}
