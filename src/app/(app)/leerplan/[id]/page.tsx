import { LeerplanGroupEditPage } from "@/components/features/topics/leerplan-group-edit-page";
import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/lib/routes";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Oefeningengroep bewerken" };

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeerplanGroupEditRoutePage({
  params,
}: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    redirect(APP_ROUTES.leerplan);
  }
  return <LeerplanGroupEditPage groupId={id} />;
}
