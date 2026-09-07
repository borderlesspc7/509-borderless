"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import {
  calculateDemucaScoreAction,
  listDemucaEvaluationHistoryAction,
  saveDemucaEvaluationAction,
} from "@/app/actions/demuca-actions";
import { DemucaAnswerGrid } from "@/components/assessments/demuca/demuca-answer-grid";
import { DemucaScoreCard } from "@/components/assessments/demuca/demuca-score-card";
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
  calculateDemucaScore,
  countAnsweredDemucaItems,
  createEmptyDemucaAnswers,
  DEMUCA_ITEM_COUNT,
  type DemucaEvaluationHistoryItem,
  type DemucaRating,
  type DemucaScoreResult,
} from "@/lib/demuca";
import { cn } from "@/lib/utils";

type DemucaApplicationPageViewProps = {
  patients: ClinicalPatient[];
};

export function DemucaApplicationPageView({
  patients,
}: DemucaApplicationPageViewProps) {
  const { userName, displayRole } = useUserRole();
  const toast = useAppToast();
  const calculateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const historyRequestRef = useRef(0);

  const activePatients = patients.filter((patient) => patient.id);
  const patientSelectItems = activePatients.map((patient) => ({
    label: patient.name,
    value: patient.id,
  }));

  const [patientId, setPatientId] = useState(activePatients[0]?.id ?? "");
  const [evaluationDate, setEvaluationDate] = useState(toDateKey(new Date()));
  const [allowPartial, setAllowPartial] = useState(false);
  const [items, setItems] = useState<Record<string, DemucaRating | undefined>>(
    createEmptyDemucaAnswers
  );
  const [scores, setScores] = useState<DemucaScoreResult | null>(null);
  const [history, setHistory] = useState<DemucaEvaluationHistoryItem[]>([]);
  const [currentEvaluationId, setCurrentEvaluationId] = useState<string | null>(
    null
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedPatient = getClinicalPatient(activePatients, patientId);
  const answeredCount = countAnsweredDemucaItems(items);

  const loadHistory = useCallback(async (nextPatientId: string) => {
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;

    if (!nextPatientId) {
      setHistory([]);
      return;
    }

    const result = await listDemucaEvaluationHistoryAction(nextPatientId);
    if (historyRequestRef.current !== requestId) {
      return;
    }

    setHistory(
      result.success && result.data ? result.data.evaluations : []
    );
  }, []);

  const runCalculation = useCallback(
    async (
      nextItems: Record<string, DemucaRating | undefined>,
      nextAllowPartial: boolean
    ) => {
      const answered = countAnsweredDemucaItems(nextItems);
      const canCalculate = nextAllowPartial
        ? answered > 0
        : answered >= DEMUCA_ITEM_COUNT;

      if (!canCalculate) {
        setScores(null);
        return;
      }

      setIsCalculating(true);
      try {
        const result = await calculateDemucaScoreAction({
          items: nextItems,
          allowPartial: nextAllowPartial,
        });

        if (!result.success || !result.data) {
          toast.error({
            title: "Falha no cálculo",
            description: result.error ?? "Não foi possível calcular o escore.",
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

  useEffect(() => {
    if (!patientId) {
      return;
    }

    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;

    void listDemucaEvaluationHistoryAction(patientId).then((result) => {
      if (historyRequestRef.current !== requestId) {
        return;
      }

      setHistory(
        result.success && result.data ? result.data.evaluations : []
      );
    });
  }, [patientId]);

  function scheduleCalculation(
    nextItems: Record<string, DemucaRating | undefined>,
    nextAllowPartial: boolean
  ) {
    if (calculateTimeoutRef.current) {
      clearTimeout(calculateTimeoutRef.current);
    }

    // Preview local imediato enquanto aguarda a action
    const answered = countAnsweredDemucaItems(nextItems);
    const canPreview = nextAllowPartial
      ? answered > 0
      : answered >= DEMUCA_ITEM_COUNT;

    if (canPreview) {
      setScores(
        calculateDemucaScore({
          items: nextItems,
          allowPartial: nextAllowPartial,
        })
      );
    } else {
      setScores(null);
    }

    calculateTimeoutRef.current = setTimeout(() => {
      void runCalculation(nextItems, nextAllowPartial);
    }, 350);
  }

  function handleItemChange(itemId: string, value: DemucaRating) {
    const nextItems = { ...items, [itemId]: value };
    setItems(nextItems);
    scheduleCalculation(nextItems, allowPartial);
  }

  function handleAllowPartialChange(checked: boolean) {
    setAllowPartial(checked);
    scheduleCalculation(items, checked);
  }

  async function handleSave(status: "draft" | "finalized") {
    if (!selectedPatient) {
      toast.error({ title: "Selecione um paciente." });
      return;
    }

    if (!scores?.isComplete) {
      toast.error({
        title: allowPartial
          ? "Responda ao menos um item"
          : "Preencha todos os itens",
        description: "O escore precisa estar calculado antes de salvar.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveDemucaEvaluationAction({
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        evaluationDate,
        items,
        allowPartial,
        professionalName: userName || "Profissional",
        professionalRole: displayRole || "Musicoterapia",
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
          status === "finalized"
            ? "DEMUCA finalizada."
            : "Rascunho DEMUCA salvo.",
      });
      setCurrentEvaluationId(result.data?.evaluation.id ?? null);
      await loadHistory(selectedPatient.id);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageContainer size="wide" className="space-y-6">
      <DashboardPageHeader
        title="Escala DEMUCA 2.0"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Evolução" },
          { label: "Avaliações", href: "/dashboard/avaliacoes/aplicar" },
          { label: "DEMUCA" },
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

      <div className="app-surface-card grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="demuca-patient">Paciente</Label>
          <Select
            value={patientId}
            items={patientSelectItems}
            onValueChange={(value) => {
              setPatientId((value as string) ?? "");
              setItems(createEmptyDemucaAnswers());
              setAllowPartial(false);
              setScores(null);
              setHistory([]);
              setCurrentEvaluationId(null);
            }}
          >
            <SelectTrigger id="demuca-patient" className="h-11 w-full">
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
          <Label htmlFor="demuca-date">Data da avaliação</Label>
          <Input
            id="demuca-date"
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
              {answeredCount}/{DEMUCA_ITEM_COUNT}
            </strong>
            {isCalculating ? (
              <Loader2 className="ml-2 size-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="demuca-partial">Avaliação parcial</Label>
          <button
            id="demuca-partial"
            type="button"
            role="switch"
            aria-checked={allowPartial}
            onClick={() => handleAllowPartialChange(!allowPartial)}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-lg border border-border/60 px-3 text-sm transition-colors",
              allowPartial
                ? "bg-primary/10 text-foreground"
                : "bg-muted/20 text-muted-foreground"
            )}
          >
            <span>{allowPartial ? "Permitida" : "Não permitida"}</span>
            <span
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                allowPartial ? "bg-primary" : "bg-muted-foreground/40"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-4 rounded-full bg-background transition-transform",
                  allowPartial ? "left-4" : "left-0.5"
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {scores ? (
        <DemucaScoreCard
          scores={scores}
          history={history.filter(
            (evaluation) => evaluation.id !== currentEvaluationId
          )}
        />
      ) : (
        <section className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-4 text-sm text-muted-foreground">
          Preencha os itens da escala para calcular o escore e gerar os
          gráficos. Se quiser visualizar o gráfico antes de concluir todos os
          itens, ative <strong>Avaliação parcial</strong>.
        </section>
      )}

      <DemucaAnswerGrid items={items} onChange={handleItemChange} />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSave("draft")}
          disabled={isSaving || !scores?.isComplete}
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
          disabled={isSaving || !scores?.isComplete}
        >
          Finalizar
        </Button>
      </div>
    </PageContainer>
  );
}
