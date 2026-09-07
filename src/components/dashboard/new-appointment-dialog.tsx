"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  CalendarSearch,
  CheckCircle2,
  Clock3,
  Loader2,
  UserRound,
} from "lucide-react";

import { createAppointmentAction } from "@/app/actions/agenda-availability-actions";
import { useAppToast } from "@/hooks/use-app-toast";
import { listAgendaProfessionalsAction } from "@/app/actions/dashboard-analytics-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AGENDA_APPOINTMENT_TYPE_LABELS,
  AGENDA_APPOINTMENT_TYPES,
  type AgendaAppointmentType,
} from "@/lib/agenda-filter-utils";
import { useUserRole } from "@/hooks/use-user-role";
import {
  getEndTimeOptions,
  getTimeSlotOptions,
  getTodayDateKey,
  resolveDefaultEndTime,
} from "@/lib/agenda-availability";
import { formatFullDate } from "@/lib/calendar-utils";
import type { AppointmentConflictType } from "@/lib/agenda-conflicts";
import type { DailyAppointment } from "@/lib/agenda-types";
import type { ProfessionalRole } from "@/lib/professionals-data";
import type { CareType } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export type NewAppointmentDefaults = {
  professionalName?: string;
  professionalUserId?: string | null;
  professionalRole?: ProfessionalRole;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
};

type NewAppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: NewAppointmentDefaults | null;
  careType?: CareType;
  onCreated?: (appointment: DailyAppointment) => void;
};

function isPrefilledMode(defaults?: NewAppointmentDefaults | null) {
  return Boolean(
    defaults?.professionalName &&
      defaults.eventDate &&
      defaults.startTime &&
      defaults.endTime
  );
}

type AgendaProfessionalOption = {
  id: string;
  fullName: string;
  professionalRole: ProfessionalRole | null;
};

function SummaryRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-col items-end gap-1.5">
        <span className="text-right text-sm font-medium text-foreground">
          {value}
        </span>
        {badge ? (
          <Badge variant="secondary" className="max-w-full truncate">
            {badge}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  defaults,
  careType = "ABA",
  onCreated,
}: NewAppointmentDialogProps) {
  const { canForceAppointment, canSearchAgenda } = useUserRole();
  const toast = useAppToast();
  const prefilled = isPrefilledMode(defaults);

  const [patientName, setPatientName] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [eventDate, setEventDate] = useState(getTodayDateKey());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [error, setError] = useState<string | null>(null);
  const [conflictType, setConflictType] =
    useState<AppointmentConflictType | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [professionals, setProfessionals] = useState<AgendaProfessionalOption[]>(
    []
  );
  const [professionalUserId, setProfessionalUserId] = useState<string | null>(
    null
  );
  const [isLoadingProfessionals, setIsLoadingProfessionals] = useState(false);
  const [appointmentType, setAppointmentType] =
    useState<AgendaAppointmentType>("sessao");

  const startTimeOptions = useMemo(() => getTimeSlotOptions(), []);
  const endTimeOptions = useMemo(
    () => getEndTimeOptions(startTime),
    [startTime]
  );

  const professionalSelectItems = useMemo(
    () =>
      professionals.map((professional) => ({
        label: professional.professionalRole
          ? `${professional.fullName} · ${professional.professionalRole}`
          : professional.fullName,
        value: professional.fullName,
      })),
    [professionals]
  );

  const selectedProfessionalRole =
    defaults?.professionalRole ??
    professionals.find((professional) => professional.fullName === professionalName)
      ?.professionalRole ??
    null;

  const isSubmitDisabled =
    isPending ||
    !patientName.trim() ||
    (!prefilled && !professionalName.trim());

  const showForceAction = Boolean(conflictType && canForceAppointment);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPatientName("");
    setError(null);
    setConflictType(null);
    setSuccessMessage(null);
    setAppointmentType("sessao");
    setProfessionalName(defaults?.professionalName ?? "");
    setProfessionalUserId(defaults?.professionalUserId ?? null);
    setEventDate(defaults?.eventDate ?? getTodayDateKey());
    setStartTime(defaults?.startTime ?? "09:00");
    setEndTime(
      defaults?.endTime ?? resolveDefaultEndTime(defaults?.startTime ?? "09:00")
    );

    setIsLoadingProfessionals(true);
    void listAgendaProfessionalsAction().then((result) => {
      if (result.success && result.data) {
        setProfessionals(result.data.professionals);
      } else {
        setProfessionals([]);
      }

      setIsLoadingProfessionals(false);
    });
  }, [open, defaults]);

  function handleStartTimeChange(value: string) {
    setStartTime(value);
    setEndTime(resolveDefaultEndTime(value));
  }

  function submitAppointment(force = false) {
    const payload = prefilled
      ? {
          patientName,
          professionalName: defaults!.professionalName!,
          professionalUserId: defaults?.professionalUserId,
          eventDate: defaults!.eventDate!,
          startTime: defaults!.startTime!,
          endTime: defaults!.endTime!,
          careType,
          appointmentType,
          force,
        }
      : {
          patientName,
          professionalName,
          professionalUserId,
          eventDate,
          startTime,
          endTime,
          careType,
          appointmentType,
          force,
        };

    if (!payload.professionalName.trim()) {
      const message = "Selecione o profissional.";
      setError(message);
      toast.warning({ title: "Profissional obrigatório", description: message });
      return;
    }

    setError(null);
    setConflictType(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await createAppointmentAction(payload);

      if (!result.success) {
        setError(result.error);
        setConflictType(result.conflictType ?? null);

        if (result.conflictType === "professional_busy") {
          toast.error({
            title: "Conflito detectado",
            description: "O profissional já está alocado neste horário.",
          });
        } else if (result.conflictType === "patient_busy") {
          toast.error({
            title: "Conflito detectado",
            description: "O paciente já possui agendamento neste horário.",
          });
        } else {
          toast.error({
            title: "Falha no agendamento",
            description: result.error ?? "Não foi possível criar o agendamento.",
          });
        }
        return;
      }

      const successText = force
        ? "Agendamento criado com conflito forçado pelo administrador."
        : "Agendamento criado com sucesso.";

      setSuccessMessage(successText);

      if (force) {
        toast.warning({
          title: "Agendamento com conflito",
          description: successText,
        });
      } else {
        toast.success({
          title: "Agendamento criado",
          description: successText,
        });
      }

      if (result.data?.appointment) {
        onCreated?.(result.data.appointment);
      }
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitAppointment(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 overflow-visible p-0 sm:max-w-2xl">
        <DialogHeader className="gap-3 border-b border-border px-6 py-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <CalendarPlus className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1 text-left">
              <DialogTitle className="text-lg">Novo agendamento</DialogTitle>
              <DialogDescription>
                {prefilled
                  ? "Revise o horário selecionado e informe o paciente."
                  : "Informe o paciente e escolha profissional, data e horário."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <Label
                htmlFor="appointment-patient-name"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <UserRound className="size-4 text-muted-foreground" />
                Paciente
              </Label>
              <Input
                id="appointment-patient-name"
                className="h-10"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                placeholder="Nome do paciente ou aprendiz"
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment-type">Tipo de agendamento</Label>
              <Select
                value={appointmentType}
                items={AGENDA_APPOINTMENT_TYPES.map((type) => ({
                  label: AGENDA_APPOINTMENT_TYPE_LABELS[type],
                  value: type,
                }))}
                onValueChange={(value) =>
                  setAppointmentType((value as AgendaAppointmentType) ?? "sessao")
                }
              >
                <SelectTrigger id="appointment-type" className="h-10 w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {AGENDA_APPOINTMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {AGENDA_APPOINTMENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {prefilled ? (
              <section className="rounded-xl border border-border/80 bg-muted/25 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Horário selecionado
                </p>
                <div className="divide-y divide-border/70">
                  <SummaryRow
                    label="Profissional"
                    value={defaults!.professionalName!}
                    badge={defaults?.professionalRole}
                  />
                  <SummaryRow
                    label="Data"
                    value={formatFullDate(defaults!.eventDate!)}
                  />
                  <SummaryRow
                    label="Horário"
                    value={`${defaults!.startTime} – ${defaults!.endTime}`}
                  />
                </div>
              </section>
            ) : (
              <section className="space-y-3 rounded-xl border border-border/80 bg-muted/25 p-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="size-4 text-primary" aria-hidden />
                  <p className="text-sm font-medium text-foreground">
                    Dados do atendimento
                  </p>
                  {selectedProfessionalRole ? (
                    <Badge variant="outline" className="ml-auto hidden sm:inline-flex">
                      {selectedProfessionalRole}
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointment-professional">Profissional</Label>
                  <Select
                    value={professionalName}
                    items={professionalSelectItems}
                    onValueChange={(value) => {
                      const selected = professionals.find(
                        (professional) => professional.fullName === value
                      );
                      setProfessionalName(value as string);
                      setProfessionalUserId(selected?.id ?? null);
                    }}
                    disabled={isLoadingProfessionals}
                  >
                    <SelectTrigger
                      id="appointment-professional"
                      className="h-10 w-full bg-background"
                    >
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {professionals.map((professional) => (
                          <SelectItem
                            key={professional.id}
                            value={professional.fullName}
                          >
                            {professional.professionalRole
                              ? `${professional.fullName} · ${professional.professionalRole}`
                              : professional.fullName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="appointment-date">Data</Label>
                    <Input
                      id="appointment-date"
                      type="date"
                      className="h-10 bg-background"
                      value={eventDate}
                      onChange={(event) => setEventDate(event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appointment-start">Início</Label>
                    <Select
                      value={startTime}
                      items={startTimeOptions}
                      onValueChange={(value) =>
                        handleStartTimeChange(value as string)
                      }
                    >
                      <SelectTrigger
                        id="appointment-start"
                        className="h-10 w-full bg-background"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {startTimeOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appointment-end">Fim</Label>
                    <Select
                      value={endTime}
                      items={endTimeOptions}
                      onValueChange={(value) => setEndTime(value as string)}
                    >
                      <SelectTrigger
                        id="appointment-end"
                        className="h-10 w-full bg-background"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {endTimeOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            )}

            {!prefilled && canSearchAgenda ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/80 bg-background px-4 py-2.5">
                <CalendarSearch
                  className="size-4 shrink-0 text-primary"
                  aria-hidden
                />
                <p className="text-sm text-muted-foreground">
                  Verificar horários livres?{" "}
                  <Link
                    href="/dashboard/busca-agenda"
                    className="font-medium text-primary hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    Abrir busca de agenda
                  </Link>
                </p>
              </div>
            ) : null}

            {error ? (
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-3",
                  conflictType
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-destructive/30 bg-destructive/5"
                )}
                role="alert"
              >
                <AlertTriangle
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    conflictType ? "text-amber-600" : "text-destructive"
                  )}
                />
                <div className="min-w-0 space-y-0.5">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      conflictType
                        ? "text-amber-900 dark:text-amber-100"
                        : "text-destructive"
                    )}
                  >
                    {conflictType ? "Conflito de horário" : "Não foi possível agendar"}
                  </p>
                  <p
                    className={cn(
                      "text-sm",
                      conflictType
                        ? "text-amber-800/90 dark:text-amber-200/90"
                        : "text-destructive/90"
                    )}
                  >
                    {error.replace(/^Conflito Detectado:\s*/i, "")}
                    {showForceAction
                      ? " Como administrador, você pode forçar o agendamento."
                      : ""}
                  </p>
                </div>
              </div>
            ) : null}

            {successMessage ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  {successMessage}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border bg-muted/30 px-6 py-5 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-30"
              onClick={() => onOpenChange(false)}
            >
              {successMessage ? "Fechar" : "Cancelar"}
            </Button>

            {!successMessage ? (
              <>
                {showForceAction ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 min-w-40 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                    disabled={isSubmitDisabled}
                    onClick={() => submitAppointment(true)}
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Forçar agendamento
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  className="h-10 min-w-44"
                  disabled={isSubmitDisabled}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Confirmar agendamento"
                  )}
                </Button>
              </>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
