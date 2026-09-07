"use client";

import Link from "next/link";
import { ExternalLink, Monitor } from "lucide-react";

import { DailyAgenda } from "@/components/dashboard/daily-agenda";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/use-user-role";
import type { CareType } from "@/lib/supabase/database.types";

type AgendaPageViewProps = {
  careType?: CareType;
};

export function AgendaPageView({ careType = "ABA" }: AgendaPageViewProps) {
  const title =
    careType === "CONVENTIONAL" ? "Agenda Convencional" : "Agenda ABA";
  const { canManageAgenda } = useUserRole();

  return (
    <PageContainer size="wide" className="space-y-4">
      <DashboardPageHeader
        title={title}
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: title },
        ]}
        actions={
          canManageAgenda ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              nativeButton={false}
              render={
                <Link
                  href="/painel-chamada"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <Monitor className="size-3.5" aria-hidden />
              Abrir painel da recepção
              <ExternalLink className="size-3 opacity-60" aria-hidden />
            </Button>
          ) : undefined
        }
      />

      <DailyAgenda careType={careType} />
    </PageContainer>
  );
}
