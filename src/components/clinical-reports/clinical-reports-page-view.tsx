"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { GitCompareArrows, LineChart as LineChartIcon, TrendingDown, TrendingUp } from "lucide-react";

import {
  getClinicalReportsDataAction,
  type ClinicalReportsQuery,
} from "@/app/actions/clinical-reports-actions";
import { useAppToast } from "@/hooks/use-app-toast";
import { ReassessmentAlertsPanel } from "@/components/clinical-reports/reassessment-alerts-panel";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClinicalReportsData } from "@/app/actions/clinical-reports-actions";

const EvaluationComparisonChart = dynamic(
  () =>
    import("@/components/clinical-reports/evaluation-comparison-chart").then(
      (mod) => ({ default: mod.EvaluationComparisonChart })
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 animate-pulse rounded-lg bg-muted/60" aria-hidden />
    ),
  }
);

const EvaluationEvolutionChart = dynamic(
  () =>
    import("@/components/clinical-reports/evaluation-evolution-chart").then(
      (mod) => ({ default: mod.EvaluationEvolutionChart })
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 animate-pulse rounded-lg bg-muted/60" aria-hidden />
    ),
  }
);

const filterFieldClassName = "min-w-0 space-y-2";
const filterControlClassName = "!h-11 w-full min-w-0";

const emptyData: ClinicalReportsData = {
  patients: [{ id: "all", label: "Todos os aprendizes" }],
  instruments: [{ value: "all", label: "Todos os instrumentos" }],
  evaluations: [],
  evolutionPoints: [],
  comparisonSeries: [],
  reassessmentAlerts: [],
  summary: {
    totalEvaluations: 0,
    averageScore: null,
    scoreTrend: null,
    pendingReassessments: 0,
  },
};

function formatTrendLabel(trend: number | null) {
  if (trend === null) {
    return "—";
  }

  const prefix = trend > 0 ? "+" : "";
  return `${prefix}${trend} pts`;
}

export function ClinicalReportsPageView() {
  const toast = useAppToast();
  const [patientId, setPatientId] = useState("all");
  const [instrument, setInstrument] = useState("all");
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonEvaluationIds, setComparisonEvaluationIds] = useState<
    [string | null, string | null]
  >([null, null]);
  const [data, setData] = useState<ClinicalReportsData>(emptyData);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();

  const comparisonOptions = useMemo(() => {
    if (patientId === "all") {
      return data.evaluations;
    }

    return data.evaluations.filter(
      (evaluation) => evaluation.patientId === patientId
    );
  }, [data.evaluations, patientId]);

  useEffect(() => {
    if (patientId === "all") {
      setComparisonEnabled(false);
      setComparisonEvaluationIds([null, null]);
    }
  }, [patientId]);

  useEffect(() => {
    startTransition(async () => {
      const query: ClinicalReportsQuery = {
        patientId,
        instrument,
        comparisonEnabled,
        comparisonEvaluationIds,
      };

      const result = await getClinicalReportsDataAction(query);

      if (!result.success) {
        setError(result.error);
        toast.error({
          title: "Falha ao carregar",
          description:
            result.error ?? "Não foi possível carregar os relatórios clínicos.",
        });
        return;
      }

      setError(null);
      setData(result.data);
    });
  }, [patientId, instrument, comparisonEnabled, comparisonEvaluationIds]);

  const trendIcon =
    data.summary.scoreTrend === null
      ? "programs"
      : data.summary.scoreTrend >= 0
        ? "independence"
        : "attempts";

  return (
    <PageContainer size="wide" className="space-y-6">
      <DashboardPageHeader
        title="Indicadores Clínicos"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Relatórios" },
        ]}
      />

      <section className="app-surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-sm font-medium text-foreground">
            Biblioteca de modelos
          </p>
          <p className="text-sm text-muted-foreground">
            Modelos de relatório e documentos usados na evolução e exportações.
          </p>
        </div>
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/dashboard/modelos" />}
        >
          Abrir biblioteca de modelos
        </Button>
      </section>

      <Card className="app-surface-card">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle>Filtros analíticos</CardTitle>
          <CardDescription>
            Selecione o aprendiz e o instrumento para acompanhar a evolução das
            pontuações ao longo do tempo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className={filterFieldClassName}>
            <Label htmlFor="reports-patient">Aprendiz</Label>
            <Select
              value={patientId}
              items={data.patients.map((patient) => ({
                label: patient.label,
                value: patient.id,
              }))}
              onValueChange={(value) => setPatientId(value as string)}
            >
              <SelectTrigger id="reports-patient" className={filterControlClassName}>
                <SelectValue placeholder="Selecione o aprendiz" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {data.patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className={filterFieldClassName}>
            <Label htmlFor="reports-instrument">Instrumento</Label>
            <Select
              value={instrument}
              items={data.instruments.map((item) => ({
                label: item.label,
                value: item.value,
              }))}
              onValueChange={(value) => setInstrument(value as string)}
            >
              <SelectTrigger
                id="reports-instrument"
                className={filterControlClassName}
              >
                <SelectValue placeholder="Selecione o instrumento" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {data.instruments.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className={`${filterFieldClassName} sm:col-span-2 xl:col-span-2`}>
            <Label>Comparação de períodos</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant={comparisonEnabled ? "default" : "outline"}
                className="h-11 shrink-0"
                disabled={patientId === "all"}
                onClick={() => {
                  setComparisonEnabled((current) => !current);
                  if (comparisonEnabled) {
                    setComparisonEvaluationIds([null, null]);
                  }
                }}
              >
                <GitCompareArrows className="size-4" aria-hidden />
                {comparisonEnabled ? "Comparação ativa" : "Comparar avaliações"}
              </Button>

              {comparisonEnabled ? (
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select
                    value={comparisonEvaluationIds[0] ?? ""}
                    items={comparisonOptions.map((evaluation) => ({
                      label: evaluation.label,
                      value: evaluation.id,
                    }))}
                    onValueChange={(value) =>
                      setComparisonEvaluationIds(([_, second]) => [
                        value as string,
                        second,
                      ])
                    }
                  >
                    <SelectTrigger className={filterControlClassName}>
                      <SelectValue placeholder="Avaliação A" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {comparisonOptions.map((evaluation) => (
                          <SelectItem key={evaluation.id} value={evaluation.id}>
                            {evaluation.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Select
                    value={comparisonEvaluationIds[1] ?? ""}
                    items={comparisonOptions
                      .filter(
                        (evaluation) => evaluation.id !== comparisonEvaluationIds[0]
                      )
                      .map((evaluation) => ({
                        label: evaluation.label,
                        value: evaluation.id,
                      }))}
                    onValueChange={(value) =>
                      setComparisonEvaluationIds(([first]) => [
                        first,
                        value as string,
                      ])
                    }
                  >
                    <SelectTrigger className={filterControlClassName}>
                      <SelectValue placeholder="Avaliação B" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {comparisonOptions
                          .filter(
                            (evaluation) =>
                              evaluation.id !== comparisonEvaluationIds[0]
                          )
                          .map((evaluation) => (
                            <SelectItem key={evaluation.id} value={evaluation.id}>
                              {evaluation.label}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            {patientId === "all" ? (
              <p className="text-xs text-muted-foreground">
                Selecione um aprendiz para habilitar a comparação entre duas
                avaliações.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando indicadores...</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          label="Avaliações no filtro"
          value={String(data.summary.totalEvaluations)}
          icon="programs"
        />
        <DashboardMetricCard
          label="Pontuação média"
          value={
            data.summary.averageScore !== null
              ? `${data.summary.averageScore} pts`
              : "—"
          }
          icon="attempts"
        />
        <DashboardMetricCard
          label="Variação no período"
          value={formatTrendLabel(data.summary.scoreTrend)}
          icon={trendIcon}
        />
        <DashboardMetricCard
          label="Reavaliações pendentes"
          value={String(data.summary.pendingReassessments)}
          icon="sessions"
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Card className="app-surface-card">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LineChartIcon className="size-5" aria-hidden />
                </div>
                <div className="space-y-1">
                  <CardTitle>
                    {comparisonEnabled
                      ? "Comparação de avaliações"
                      : "Evolução da pontuação"}
                  </CardTitle>
                  <CardDescription>
                    {comparisonEnabled
                      ? "Duas avaliações plotadas no mesmo gráfico para análise supervisória."
                      : "Eixo X: data da avaliação. Eixo Y: pontuação obtida."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-6">
              {comparisonEnabled ? (
                <EvaluationComparisonChart series={data.comparisonSeries} />
              ) : (
                <EvaluationEvolutionChart points={data.evolutionPoints} />
              )}
            </CardContent>
          </Card>

          {data.summary.scoreTrend !== null ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              {data.summary.scoreTrend >= 0 ? (
                <TrendingUp className="size-4 text-clinical-success" aria-hidden />
              ) : (
                <TrendingDown className="size-4 text-destructive" aria-hidden />
              )}
              <span>
                {data.summary.scoreTrend >= 0 ? "Progresso" : "Queda"} de{" "}
                <strong className="text-foreground">
                  {Math.abs(data.summary.scoreTrend)} pontos
                </strong>{" "}
                entre a primeira e a última avaliação do filtro atual.
              </span>
            </div>
          ) : null}
        </div>

        <ReassessmentAlertsPanel alerts={data.reassessmentAlerts} />
      </div>
    </PageContainer>
  );
}
