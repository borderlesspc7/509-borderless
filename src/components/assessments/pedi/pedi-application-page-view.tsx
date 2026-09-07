"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  FileText,
  Loader2,
  Printer,
  Save,
} from "lucide-react";

import {
  calculatePediScoreAction,
  savePediEvaluationAction,
} from "@/app/actions/pedi-actions";
import { PediAnswerGrid } from "@/components/assessments/pedi/pedi-answer-grid";
import { PediCaregiverGrid } from "@/components/assessments/pedi/pedi-caregiver-grid";
import { PediItemMap } from "@/components/assessments/pedi/pedi-item-map";
import { PediScoreResults } from "@/components/assessments/pedi/pedi-score-results";
import { PediSuggestedObjectives } from "@/components/assessments/pedi/pedi-suggested-objectives";
import { PediToReportDialog } from "@/components/assessments/pedi/pedi-to-report-dialog";
import { DocumentPrintHeader } from "@/components/documents/document-print-header";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppToast } from "@/hooks/use-app-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { toDateKey } from "@/lib/calendar-utils";
import {
  getClinicalPatient,
  type ClinicalPatient,
} from "@/lib/clinical-evolution-data";
import {
  createEmptyPediAnswers,
  createEmptyPediCaregiverAnswers,
  PEDI_AREA_LABELS,
  PEDI_AREAS,
  PEDI_MOBILITY_TRANSFER_ITEM_IDS,
  PEDI_TRANSFER_MODE_LABELS,
  PEDI_TRANSFER_MODES,
  type PediArea,
  type PediCapability,
  type PediCaregiverLevel,
  type PediScoreResult,
  type PediTransferMode,
} from "@/lib/pedi";
import { cn } from "@/lib/utils";

type PediApplicationPageViewProps = {
  patients: ClinicalPatient[];
};

export function PediApplicationPageView({
  patients,
}: PediApplicationPageViewProps) {
  const { userName, displayRole } = useUserRole();
  const toast = useAppToast();

  const activePatients = patients.filter((patient) => patient.id);
  const patientSelectItems = activePatients.map((patient) => ({
    label: patient.name,
    value: patient.id,
  }));

  const [patientId, setPatientId] = useState(activePatients[0]?.id ?? "");
  const [evaluationDate, setEvaluationDate] = useState(toDateKey(new Date()));
  const [activePart, setActivePart] = useState<"functional" | "caregiver">(
    "functional"
  );
  const [activeArea, setActiveArea] = useState<PediArea>("self_care");
  const [transferMode, setTransferMode] = useState<PediTransferMode>("car");
  const [items, setItems] = useState<Record<string, PediCapability>>(
    createEmptyPediAnswers
  );
  const [caregiverItems, setCaregiverItems] = useState<
    Record<string, PediCaregiverLevel | null>
  >(createEmptyPediCaregiverAnswers);
  const [scores, setScores] = useState<PediScoreResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const selectedPatient = getClinicalPatient(activePatients, patientId);

  const rawTotals = useMemo(() => {
    return PEDI_AREAS.map((area) => {
      const areaItems = Object.entries(items).filter(([id, value]) => {
        if (value !== 1) {
          return false;
        }
        if (area === "self_care") {
          return id.startsWith("AC-");
        }
        if (area === "mobility") {
          return id.startsWith("MB-");
        }
        return id.startsWith("FS-");
      });
      return { area, total: areaItems.length };
    });
  }, [items]);

  function handleTransferModeChange(mode: PediTransferMode) {
    if (mode === transferMode) {
      return;
    }

    setTransferMode(mode);
    setItems((current) => {
      const next = { ...current };
      for (const itemId of PEDI_MOBILITY_TRANSFER_ITEM_IDS) {
        next[itemId] = 0;
      }
      return next;
    });
    setScores(null);
  }

  function handleItemChange(itemId: string, value: PediCapability) {
    setItems((current) => ({ ...current, [itemId]: value }));
    setScores(null);
  }

  function handleCaregiverChange(itemId: string, value: PediCaregiverLevel) {
    setCaregiverItems((current) => ({ ...current, [itemId]: value }));
    setScores(null);
  }

  async function handleCalculate() {
    if (!selectedPatient?.birthDate) {
      toast.error({
        title: "Paciente incompleto",
        description: "Selecione um paciente com data de nascimento cadastrada.",
      });
      return;
    }

    setIsCalculating(true);
    try {
      const result = await calculatePediScoreAction({
        birthDate: selectedPatient.birthDate,
        evaluationDate,
        items,
        caregiverItems,
      });

      if (!result.success || !result.data) {
        toast.error({
          title: "Falha no cálculo",
          description: result.error ?? "Não foi possível calcular os escores.",
        });
        return;
      }

      setScores(result.data);
      toast.success({ title: "Escores PEDI calculados." });
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleSave(status: "draft" | "finalized") {
    if (!selectedPatient) {
      toast.error({ title: "Selecione um paciente." });
      return;
    }

    if (!selectedPatient.birthDate) {
      toast.error({ title: "Paciente sem data de nascimento." });
      return;
    }

    if (!scores) {
      toast.error({ title: "Calcule os escores antes de salvar." });
      return;
    }

    setIsSaving(true);
    try {
      const result = await savePediEvaluationAction({
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        birthDate: selectedPatient.birthDate,
        evaluationDate,
        items,
        caregiverItems,
        transferMode,
        scores,
        professionalName: userName || "Profissional",
        professionalRole: displayRole || "Clínico",
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
            ? "Avaliação PEDI finalizada."
            : "Rascunho PEDI salvo.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageContainer size="wide" className="space-y-6 print:max-w-none">
      <div className="print:hidden">
        <DashboardPageHeader
          title={`PEDI — ${PEDI_AREA_LABELS[activeArea]}`}
          breadcrumbs={[
            { label: "Home", href: "/dashboard" },
            { label: "Evolução" },
            { label: "Avaliações", href: "/dashboard/avaliacoes/aplicar" },
            { label: "PEDI" },
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
      </div>

      <DocumentPrintHeader
        documentTitle="PEDI — Pediatric Evaluation of Disability Inventory"
        subtitle={
          selectedPatient
            ? `${selectedPatient.name} · ${evaluationDate}`
            : undefined
        }
      />

      <section className="print:hidden rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="space-y-1 text-amber-950 dark:text-amber-100">
            <p className="font-medium">Validação clínica em andamento</p>
            <p className="text-amber-900/90 dark:text-amber-200/90">
              A equipe de Terapia Ocupacional solicitou que os enunciados sigam
              fielmente o manual oficial (folha Avalia TO), pois os números dos
              itens no mapa são fixos. Enquanto a revisão completa não é
              concluída, utilize o preenchimento manual ou o site Avalia TO para
              aplicações que exijam pontuação normativa fidedigna.
            </p>
          </div>
        </div>
      </section>

      <div className="print:hidden app-surface-card space-y-4 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="pedi-patient">Paciente</Label>
            <Select
              value={patientId}
              items={patientSelectItems}
              onValueChange={(value) => {
                setPatientId((value as string) ?? "");
                setScores(null);
              }}
            >
              <SelectTrigger id="pedi-patient" className="h-11 w-full">
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
            {selectedPatient && !selectedPatient.birthDate ? (
              <p className="text-xs text-destructive">
                Paciente sem data de nascimento cadastrada.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pedi-date">Data da avaliação</Label>
            <Input
              id="pedi-date"
              type="date"
              value={evaluationDate}
              onChange={(event) => {
                setEvaluationDate(event.target.value);
                setScores(null);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Resumo bruto (Parte I)</Label>
            <div className="flex h-10 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border/60 bg-muted/20 px-3 text-xs text-muted-foreground">
              {rawTotals.map(({ area, total }) => (
                <span key={area}>
                  {PEDI_AREA_LABELS[area].slice(0, 3)}:{" "}
                  <strong className="text-foreground">{total}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/10 p-4">
          <Label htmlFor="pedi-transfer-mode">
            Transferência — itens 11 a 15 (mobilidade)
          </Label>
          <p className="text-xs text-muted-foreground">
            Escolha apenas o meio de transporte mais utilizado. Carro e ônibus
            não devem ser pontuados simultaneamente.
          </p>
          <Select
            value={transferMode}
            items={PEDI_TRANSFER_MODES.map((mode) => ({
              label: PEDI_TRANSFER_MODE_LABELS[mode],
              value: mode,
            }))}
            onValueChange={(value) =>
              handleTransferModeChange((value as PediTransferMode) ?? "car")
            }
          >
            <SelectTrigger id="pedi-transfer-mode" className="h-11 w-full max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PEDI_TRANSFER_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {PEDI_TRANSFER_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          {PEDI_AREAS.map((area) => (
            <Button
              key={area}
              type="button"
              size="sm"
              variant={activeArea === area ? "default" : "outline"}
              onClick={() => setActiveArea(area)}
            >
              {PEDI_AREA_LABELS[area]}
            </Button>
          ))}
        </div>
      </div>

      <Tabs
        value={activePart}
        onValueChange={(value) =>
          setActivePart(value === "caregiver" ? "caregiver" : "functional")
        }
        className="print:hidden gap-3"
      >
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-2">
          <TabsTrigger
            value="functional"
            className="h-auto justify-center rounded-lg border border-border/70 bg-card px-3 py-2.5 data-active:border-primary/40 data-active:bg-primary/5"
          >
            Parte I — Habilidades funcionais
          </TabsTrigger>
          <TabsTrigger
            value="caregiver"
            className="h-auto justify-center rounded-lg border border-border/70 bg-card px-3 py-2.5 data-active:border-primary/40 data-active:bg-primary/5"
          >
            Parte II — Assistência do cuidador
          </TabsTrigger>
        </TabsList>
        <TabsContent value="functional" className="mt-4">
          <PediAnswerGrid
            area={activeArea}
            items={items}
            onChange={handleItemChange}
            transferMode={transferMode}
          />
        </TabsContent>
        <TabsContent value="caregiver" className="mt-4">
          <PediCaregiverGrid
            area={activeArea}
            items={caregiverItems}
            onChange={handleCaregiverChange}
            transferMode={transferMode}
          />
        </TabsContent>
      </Tabs>

      <div className="print:hidden flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleCalculate}
          disabled={isCalculating || !selectedPatient}
        >
          {isCalculating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Calculator className="size-4" aria-hidden />
          )}
          Calcular escores
        </Button>
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
        <Button
          type="button"
          variant="outline"
          onClick={() => setReportOpen(true)}
          disabled={!scores || !selectedPatient}
        >
          <FileText className="size-4" aria-hidden />
          Relatório TO
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => window.print()}
          className={cn(!scores && "opacity-60")}
        >
          <Printer className="size-4" aria-hidden />
          Imprimir / PDF
        </Button>
      </div>

      {scores ? <PediScoreResults scores={scores} /> : null}

      {scores ? (
        <PediSuggestedObjectives
          items={items}
          scores={scores}
          patientName={selectedPatient?.name}
        />
      ) : null}

      <PediItemMap items={items} />

      {selectedPatient && scores ? (
        <PediToReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          patientName={selectedPatient.name}
          birthDate={selectedPatient.birthDate}
          evaluationDate={evaluationDate}
          items={items}
          scores={scores}
          professionalName={userName || "Profissional"}
          professionalRole={displayRole || "Clínico"}
        />
      ) : null}
    </PageContainer>
  );
}
