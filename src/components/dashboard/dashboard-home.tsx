"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, HeartPulse, UsersRound } from "lucide-react";

import { LearnerDashboardPanel } from "@/components/dashboard/learner-dashboard-panel";
import { ProfessionalDashboardPanel } from "@/components/dashboard/professional-dashboard-panel";
import { useUserRole } from "@/hooks/use-user-role";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDefaultDateRange } from "@/lib/dashboard-analytics-types";
import { PageContainer } from "@/components/layout/page-container";
import { PERMISSIONS } from "@/lib/rbac";

export function DashboardHome() {
  const { fullName, displayRole, canViewPatients, hasPermission } = useUserRole();
  const canViewAgenda = hasPermission(PERMISSIONS.AGENDA_VIEW);
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [activePanel, setActivePanel] = useState("learner");

  return (
    <PageContainer size="wide" className="space-y-6">
      <section className="dashboard-welcome-panel relative overflow-hidden rounded-xl px-5 py-6 text-white sm:px-7 sm:py-7 lg:flex lg:items-end lg:justify-between lg:gap-8">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-[oklch(0.79_0.1_215)]">
            <HeartPulse className="size-4" aria-hidden />
            Visão clínica
          </p>
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
            Olá, {fullName.split(" ")[0] || "profissional"}.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
            Acompanhe os indicadores da clínica e acesse rapidamente as rotinas do dia.
          </p>
          <p className="mt-4 text-xs font-medium text-white/50">{displayRole}</p>
        </div>

        {canViewAgenda || canViewPatients ? (
          <div className="relative z-10 mt-6 grid gap-2 sm:grid-cols-2 lg:mt-0 lg:w-[390px]">
            {canViewAgenda ? (
              <Link
                href="/agenda"
                className="group flex min-h-20 items-center gap-3 rounded-xl border border-white/15 bg-white/8 px-4 py-3 outline-none transition-colors hover:bg-white/14 focus-visible:ring-3 focus-visible:ring-white/40"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[oklch(0.44_0.11_225)]">
                  <CalendarDays className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Abrir agenda</span>
                  <span className="mt-0.5 block text-xs text-white/55">Consultas e horários</span>
                </span>
                <ArrowRight className="size-4 text-white/45 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            ) : null}
            {canViewPatients ? (
              <Link
                href="/dashboard/pacientes"
                className="group flex min-h-20 items-center gap-3 rounded-xl border border-white/15 bg-white/8 px-4 py-3 outline-none transition-colors hover:bg-white/14 focus-visible:ring-3 focus-visible:ring-white/40"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.72_0.11_350)] text-white">
                  <UsersRound className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Aprendizes</span>
                  <span className="mt-0.5 block text-xs text-white/55">Cadastros e prontuários</span>
                </span>
                <ArrowRight className="size-4 text-white/45 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <Tabs
        value={activePanel}
        onValueChange={setActivePanel}
        className="gap-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Indicadores de desempenho</h2>
            <p className="mt-1 text-sm text-muted-foreground">Alterne a perspectiva para analisar os resultados.</p>
          </div>
        <TabsList className="flex !h-11 w-full items-stretch gap-1 rounded-xl bg-muted p-1 sm:w-auto sm:min-w-[420px]">
          <TabsTrigger
            value="learner"
            className="h-full min-h-0 flex-1 rounded-lg border-0 px-4 py-0 text-xs font-semibold data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm sm:text-sm"
          >
            Por aprendiz
          </TabsTrigger>
          <TabsTrigger
            value="professional"
            className="h-full min-h-0 flex-1 rounded-lg border-0 px-4 py-0 text-xs font-semibold data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm sm:text-sm"
          >
            Por profissional
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="learner" className="mt-0">
          <LearnerDashboardPanel
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </TabsContent>

        <TabsContent value="professional" className="mt-0">
          <ProfessionalDashboardPanel
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
