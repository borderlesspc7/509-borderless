"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import {
  calculateEbaiScoreAction,
  saveEbaiEvaluationAction,
} from "@/app/actions/ebai-actions";
import { EbaiAnswerGrid } from "@/components/assessments/ebai/ebai-answer-grid";
import { EbaiSeverityCard } from "@/components/assessments/ebai/ebai-severity-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
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
import { useAppToast } from "@/hooks/use-app-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { toDateKey } from "@/lib/calendar-utils";
import {
  getClinicalPatient,
  type ClinicalPatient,
} from "@/lib/clinical-evolution-data";
import {
  countAnsweredEbaiItems,
  createEmptyEbaiAnswers,
  EBAI_ITEM_COUNT,
  type EbaiLikert,
  type EbaiScoreResult,
} from "@/lib/ebai";

type EbaiApplicationPageViewProps = {
  patients: ClinicalPatient[];
};

export function EbaiApplicationPageView({
  patients,
}: EbaiApplicationPageViewProps) {
  const { userName, displayRole } = useUserRole();
  const toast = useAppToast();
  const calculateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const activePatients = patients.filter((patient) => patient.id);
  const patientSelectItems = activePatients.map((patient) => ({
    label: patient.name,
    value: patient.id,
  }));

  const [patientId, setPatientId] = useState(activePatients[0]?.id ?? "");
  const [evaluationDate, setEvaluationDate] = useState(toDateKey(new Date()));
  const [items, setItems] = useState<Record<string, EbaiLikert>>(
    createEmptyEbaiAnswers
  );
  const [scores, setScores] = useState<EbaiScoreResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedPatient = getClinicalPatient(activePatients, patientId);
  const answeredCount = countAnsweredEbaiItems(items);
  const isComplete = answeredCount >= EBAI_ITEM_COUNT;

  const runCalculation = useCallback(
    async (nextItems: Record<string, EbaiLikert>) => {
      if (countAnsweredEbaiItems(nextItems) < EBAI_ITEM_COUNT) {
        setScores(null);
        return;
      }

      setIsCalculating(true);
      try {
        const result = await calculateEbaiScoreAction({ items: nextItems });

        if (!result.success || !result.data) {
          toast.error({
            title: "Falha na conversão",
            description: result.error ?? "Não foi possível converter o escore.",
          });
          setScores(null);
          return;
        }

        setScores(result.data);
      } finally {
        setIsCalculating(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    return () => {
      if (calculateTimeoutRef.current) {
        clearTimeout(calculateTimeoutRef.current);
      }
    };
  }, []);

  function handleItemChange(itemId: string, value: EbaiLikert) {
    const nextItems = { ...items, [itemId]: value };
    setItems(nextItems);

    if (calculateTimeoutRef.current) {
      clearTimeout(calculateTimeoutRef.current);
    }

    calculateTimeoutRef.current = setTimeout(() => {
      void runCalculation(nextItems);
    }, 400);
  }

  async function handleSave(status: "draft" | "finalized") {
    if (!selectedPatient) {
      toast.error({ title: "Selecione um paciente." });
      return;
    }

    if (!scores) {
      toast.error({
        title: "Preencha todos os itens",
        description: "A conversão é exibida após o preenchimento completo.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveEbaiEvaluationAction({
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        evaluationDate,
        items,
        scores,
        professionalName: userName || "Profissional",
        professionalRole: displayRole || "Psicologia",
        status,
      });

      if (!result.success) {
        toast.error({
          title: "Falha ao salvar",
          description: result.error ?? "Não foi possível salvar a avaliação.",
        });
        return;
      }

      toast.success({
        title:
          status === "finalized" ? "EBAI finalizada." : "Rascunho EBAI salvo.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageContainer size="wide" className="space-y-6">
      <DashboardPageHeader
        title="Escala EBAI"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Evolução" },
          { label: "Avaliações", href: "/dashboard/avaliacoes/aplicar" },
          { label: "EBAI" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/avaliacoes/aplicar" />}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar
          </Button>
        }
      />

      <div className="app-surface-card grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="ebai-patient">Paciente</Label>
          <Select
            value={patientId}
            items={patientSelectItems}
            onValueChange={(value) => {
              setPatientId((value as string) ?? "");
              setScores(null);
            }}
          >
            <SelectTrigger id="ebai-patient" className="h-11 w-full">
              <SelectValue placeholder="Selecione o paciente" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {activePatients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ebai-date">Data da avaliação</Label>
          <Input
            id="ebai-date"
            type="date"
            value={evaluationDate}
            onChange={(event) => setEvaluationDate(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Progresso</Label>
          <div className="flex h-10 items-center rounded-lg border border-border/60 bg-muted/20 px-3 text-sm">
            <span className="text-muted-foreground">Itens: </span>
            <strong className="ml-1 text-foreground">
              {answeredCount}/{EBAI_ITEM_COUNT}
            </strong>
            {isCalculating ? (
              <Loader2 className="ml-2 size-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </div>
      </div>

      {scores ? <EbaiSeverityCard scores={scores} /> : null}

      <EbaiAnswerGrid items={items} onChange={handleItemChange} />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSave("draft")}
          disabled={isSaving || !scores}
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          Salvar rascunho
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSave("finalized")}
          disabled={isSaving || !scores}
        >
          Finalizar
        </Button>
      </div>
    </PageContainer>
  );
}
