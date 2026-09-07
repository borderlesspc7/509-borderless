import type { Metadata } from "next";

import { AgendaWorkloadSettingsView } from "@/components/dashboard/agenda-workload-settings-view";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Configurações da Agenda",
  description:
    "Defina a duração dos horários e a disponibilidade semanal para agendamentos.",
};

export default async function AgendaConfiguracoesPage() {
  await requirePermission(PERMISSIONS.AGENDA_MANAGE);

  return <AgendaWorkloadSettingsView />;
}
