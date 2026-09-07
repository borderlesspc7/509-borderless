"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calculator, Loader2, Save, AlertTriangle } from "lucide-react";

import {
  calculateSensoryProfileAction,
  saveSensoryProfileEvaluationAction,
} from "@/app/actions/sensory-profile-actions";
import { SensoryAnswerGrid } from "@/components/assessments/sensory-profile/sensory-answer-grid";
import { SensoryScoreResults } from "@/components/assessments/sensory-profile/sensory-score-results";
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
import { calculateExactAgeInMonths } from "@/lib/pedi/age";
import {
  createEmptySensoryAnswers,
  isSensoryAgeBand,
  SENSORY_AGE_BAND_LABELS,
  SENSORY_AGE_BANDS,
  SENSORY_SECTION_LABELS,
  SENSORY_SECTIONS,
  suggestSensoryAgeBand,
  type SensoryAgeBand,
  type SensoryLikert,
  type SensoryProfileScoreResult,
  type SensorySection,
} from "@/lib/sensory-profile";

type SensoryProfileApplicationPageViewProps = {
  patients: ClinicalPatient[];
};

export function SensoryProfileApplicationPageView({
  patients,
}: SensoryProfileApplicationPageViewProps) {
  const { userName, displayRole } = useUserRole();
  const toast = useAppToast();

  const activePatients = patients.filter((patient) => patient.id);
  const patientSelectItems = activePatients.map((patient) => ({
    label: patient.name,
    value: patient.id,
  }));

  const [patientId, setPatientId] = useState(activePatients[0]?.id ?? "");
  const [evaluationDate, setEvaluationDate] = useState(toDateKey(new Date()));
  const [ageBand, setAgeBand] = useState<SensoryAgeBand>("child_3_14y");
  const [activeSection, setActiveSection] = useState<SensorySection>("auditory");
  const [items, setItems] = useState<Record<string, SensoryLikert>>(
    createEmptySensoryAnswers
  );
  const [scores, setScores] = useState<SensoryProfileScoreResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedPatient = getClinicalPatient(activePatients, patientId);

  useEffect(() => {
    if (!selectedPatient?.birthDate) {
      return;
    }

    try {
      const ageMonths = calculateExactAgeInMonths(
        selectedPatient.birthDate,
        evaluationDate
      );
      setAgeBand(suggestSensoryAgeBand(ageMonths));
    } catch {
      // mantém faixa selecionada manualmente
    }
  }, [selectedPatient?.birthDate, evaluationDate]);

  const sectionProgress = useMemo(() => {
    return SENSORY_SECTIONS.map((section) => {
      const sectionItems = Object.entries(items).filter(([id]) =>
        id.startsWith(
          section === "auditory"
            ? "AUD"
            : section === "visual"
              ? "VIS"
              : section === "touch"
                ? "TAT"
                : "MOV"
        )
      );
      return { section, filled: sectionItems.length };
    });
  }, [items]);

  function handleItemChange(itemId: string, value: SensoryLikert) {
    setItems((current) => ({ ...current, [itemId]: value }));
    setScores(null);
  }

  async function handleCalculate() {
    setIsCalculating(true);
    try {
      const result = await calculateSensoryProfileAction({
        ageBand,
        birthDate: selectedPatient?.birthDate,
        evaluationDate,
        items,
      });

      if (!result.success || !result.data) {
        toast.error({
          title: "Falha no cálculo",
          description: result.error ?? "Não foi possível calcular o perfil.",
        });
        return;
      }

      setScores(result.data);
      toast.success({ title: "Perfil Sensorial II calculado." });
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleSave(status: "draft" | "finalized") {
    if (!selectedPatient) {
      toast.error({ title: "Selecione um paciente." });
      return;
    }

    if (!scores) {
      toast.error({ title: "Calcule o perfil antes de salvar." });
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveSensoryProfileEvaluationAction({
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        birthDate: selectedPatient.birthDate,
        evaluationDate,
        ageBand,
        items,
        scores,
        professionalName: userName || "Profissional",
        professionalRole: displayRole || "T.O.",
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
            ? "Perfil Sensorial II finalizado."
            : "Rascunho salvo.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageContainer size="wide" className="space-y-6">
      <DashboardPageHeader
        title="Perfil Sensorial II"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Evolução" },
          { label: "Avaliações", href: "/dashboard/avaliacoes/aplicar" },
          { label: "Perfil Sensorial II" },
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

      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="space-y-1 text-amber-950 dark:text-amber-100">
            <p className="font-medium">Validação clínica em andamento</p>
            <p className="text-amber-900/90 dark:text-amber-200/90">
              A equipe de Terapia Ocupacional solicitou enunciados idênticos ao
              manual oficial, pois a tabela de pontuação usa numeração fixa dos
              itens. Enquanto a revisão completa dos 86 itens não é concluída,
              utilize o preenchimento manual ou o site Avalia TO para
              aplicações que exijam cálculo normativo fidedigno.
            </p>
          </div>
        </div>
      </section>

      <div className="app-surface-card space-y-4 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="sp-patient">Paciente</Label>
            <Select
              value={patientId}
              items={patientSelectItems}
              onValueChange={(value) => {
                setPatientId((value as string) ?? "");
                setScores(null);
              }}
            >
              <SelectTrigger id="sp-patient" className="h-11 w-full">
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
            <Label htmlFor="sp-date">Data da avaliação</Label>
            <Input
              id="sp-date"
              type="date"
              value={evaluationDate}
              onChange={(event) => {
                setEvaluationDate(event.target.value);
                setScores(null);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sp-age-band">Faixa etária</Label>
            <Select
              value={ageBand}
              items={SENSORY_AGE_BANDS.map((band) => ({
                label: SENSORY_AGE_BAND_LABELS[band],
                value: band,
              }))}
              onValueChange={(value) => {
                if (isSensoryAgeBand(value as string)) {
                  setAgeBand(value as SensoryAgeBand);
                  setScores(null);
                }
              }}
            >
              <SelectTrigger id="sp-age-band" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SENSORY_AGE_BANDS.map((band) => (
                    <SelectItem key={band} value={band}>
                      {SENSORY_AGE_BAND_LABELS[band]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SENSORY_SECTIONS.map((section) => (
            <Button
              key={section}
              type="button"
              size="sm"
              variant={activeSection === section ? "default" : "outline"}
              onClick={() => setActiveSection(section)}
            >
              {SENSORY_SECTION_LABELS[section]}
              <span className="ml-1.5 text-[0.65rem] opacity-70">
                ({sectionProgress.find((s) => s.section === section)?.filled ?? 0})
              </span>
            </Button>
          ))}
        </div>
      </div>

      <SensoryAnswerGrid
        section={activeSection}
        items={items}
        onChange={handleItemChange}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleCalculate} disabled={isCalculating}>
          {isCalculating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Calculator className="size-4" aria-hidden />
          )}
          Calcular perfil
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
      </div>

      {scores ? <SensoryScoreResults scores={scores} /> : null}
    </PageContainer>
  );
}
