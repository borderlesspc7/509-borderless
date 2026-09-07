"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Paperclip,
} from "lucide-react";

import { updatePatientAction } from "@/app/actions/patient-record-actions";
import {
  removePatientAvatarAction,
  uploadPatientAvatarAction,
} from "@/app/actions/entity-avatar-actions";
import { useAppToast } from "@/hooks/use-app-toast";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PageContainer } from "@/components/layout/page-container";
import {
  PatientAdicionaisSection,
  PatientEnderecoSection,
  PatientGeralSection,
  formStateToActionInput,
} from "@/components/patients/patient-form-sections";
import { PatientBodyMapPanel } from "@/components/patients/patient-body-map-panel";
import { PatientResponsibleProfessionalsField } from "@/components/patients/patient-responsible-professionals-field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { patientRowToFormState } from "@/lib/patient-form";
import { formatPatientRegistrationStatus } from "@/lib/patient-format";
import type { PatientRow } from "@/lib/supabase/database.types";

type PatientEditPageViewProps = {
  patient: PatientRow;
  initialResponsibleProfessionalIds?: string[];
};


export function PatientEditPageView({
  patient,
  initialResponsibleProfessionalIds = [],
}: PatientEditPageViewProps) {
  const [values, setValues] = useState(() => patientRowToFormState(patient));
  const [avatarUrl, setAvatarUrl] = useState(patient.avatar_url);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [responsibleProfessionalIds, setResponsibleProfessionalIds] = useState(
    initialResponsibleProfessionalIds
  );
  const toast = useAppToast();
  const [defineAccess, setDefineAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange<K extends keyof typeof values>(
    field: K,
    value: (typeof values)[K]
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleAvatarSelected(file: File | null) {
    if (!file) {
      return;
    }

    setIsAvatarUploading(true);
    const formData = new FormData();
    formData.set("avatar", file);
    const result = await uploadPatientAvatarAction(patient.id, formData);
    setIsAvatarUploading(false);

    if (!result.success || !result.data) {
      toast.error({
        title: "Falha no upload da foto",
        description: result.success ? undefined : result.error,
      });
      return;
    }

    setAvatarUrl(result.data.avatarUrl);
    toast.success({ title: "Foto atualizada" });
  }

  async function handleAvatarRemove() {
    setIsAvatarUploading(true);
    const result = await removePatientAvatarAction(patient.id);
    setIsAvatarUploading(false);

    if (!result.success) {
      toast.error({
        title: "Não foi possível remover a foto",
        description: result.error,
      });
      return;
    }

    setAvatarUrl(null);
    toast.success({ title: "Foto removida" });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await updatePatientAction({
        patientId: patient.id,
        ...formStateToActionInput(values),
        responsibleProfessionalIds,
      });

      if (!result.success) {
        const message = result.error ?? "Não foi possível salvar o aprendiz.";
        setError(message);
        toast.error({ title: "Falha ao salvar", description: message });
        return;
      }

      setSuccessMessage("Dados do aprendiz salvos com sucesso.");
      toast.success({
        title: "Dados salvos",
        description: "As informações do aprendiz foram atualizadas.",
      });
    });
  }

  return (
    <PageContainer size="wide" className="space-y-8">
      <DashboardPageHeader
        title="Editar Aprendiz"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Cadastro" },
          { label: "Aprendizes", href: "/dashboard/pacientes" },
          { label: "Editar" },
        ]}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/pacientes" />}
          >
            Voltar
          </Button>
        }
      />


      <form onSubmit={handleSubmit}>
        <section className="app-surface-card overflow-hidden">
          <Tabs defaultValue="geral" className="gap-0">
            <div className="border-b border-border/60 bg-muted/25 px-6 py-4 sm:px-8">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-5">
                <TabsTrigger
                  value="geral"
                  className="rounded-lg border border-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground data-active:border-transparent data-active:bg-primary data-active:text-primary-foreground sm:text-sm"
                >
                  Geral
                </TabsTrigger>
                <TabsTrigger
                  value="adicionais"
                  className="rounded-lg border border-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground data-active:border-transparent data-active:bg-primary data-active:text-primary-foreground sm:text-sm"
                >
                  Info. Adicionais
                </TabsTrigger>
                <TabsTrigger
                  value="endereco"
                  className="rounded-lg border border-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground data-active:border-transparent data-active:bg-primary data-active:text-primary-foreground sm:text-sm"
                >
                  Endereço
                </TabsTrigger>
                <TabsTrigger
                  value="mapa"
                  className="rounded-lg border border-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground data-active:border-transparent data-active:bg-primary data-active:text-primary-foreground sm:text-sm"
                >
                  Mapa corporal (bonequinho)
                </TabsTrigger>
                <TabsTrigger
                  value="anexos"
                  className="rounded-lg border border-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground data-active:border-transparent data-active:bg-primary data-active:text-primary-foreground sm:text-sm"
                >
                  Anexos
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="geral" className="mt-0 px-6 py-8 sm:px-8">
              <PatientGeralSection
                values={values}
                onChange={handleChange}
                showAvatar
                avatarUrl={avatarUrl}
                onAvatarFileSelected={handleAvatarSelected}
                onAvatarRemove={handleAvatarRemove}
                isAvatarUploading={isAvatarUploading}
                requireFullName
              />

              <div className="mt-8 flex items-center gap-2.5 text-sm text-clinical-success">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                <span>
                  {formatPatientRegistrationStatus(
                    patient.status,
                    patient.created_at
                  )}
                </span>
              </div>

              <div className="mt-8 space-y-4 border-t border-border/60 pt-8">
                <PatientResponsibleProfessionalsField
                  patientId={patient.id}
                  selectedIds={responsibleProfessionalIds}
                  onChange={setResponsibleProfessionalIds}
                  disabled={isPending}
                />
              </div>

              <div className="mt-8 space-y-4 border-t border-border/60 pt-8">
                <h3 className="text-base font-semibold text-foreground">Acesso</h3>
                <label className="flex items-start gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={defineAccess}
                    onChange={(event) => setDefineAccess(event.target.checked)}
                    className="mt-0.5 size-4 rounded border-input accent-primary"
                  />
                  <span>Definir dados de acesso para essa conta</span>
                </label>
                <p className="text-sm text-muted-foreground">
                  Usuário e perfil de acesso serão configurados pelo portal da
                  família em uma próxima versão.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="adicionais" className="mt-0 px-6 py-8 sm:px-8">
              <PatientAdicionaisSection values={values} onChange={handleChange} />
            </TabsContent>

            <TabsContent value="endereco" className="mt-0 px-6 py-8 sm:px-8">
              <PatientEnderecoSection values={values} onChange={handleChange} />
            </TabsContent>

            <TabsContent value="mapa" className="mt-0 px-6 py-8 sm:px-8">
              <PatientBodyMapPanel patientId={patient.id} />
            </TabsContent>

            <TabsContent value="anexos" className="mt-0 px-6 py-8 sm:px-8">
              <EmptyState
                icon={Paperclip}
                title="Nenhum anexo cadastrado"
                description="Os documentos do aprendiz podem ser gerenciados no prontuário."
                action={
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/paciente/${patient.id}/prontuario`} />}
                  >
                    Abrir prontuário
                  </Button>
                }
              />
            </TabsContent>

            {(error || successMessage) && (
              <div className="space-y-3 border-t border-border/60 px-6 py-4 sm:px-8">
                {error ? (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
                {successMessage ? (
                  <div className="rounded-lg border border-clinical-success/20 bg-clinical-success/5 px-4 py-3 text-sm text-clinical-success">
                    {successMessage}
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-border/60 px-6 py-5 sm:px-8">
              <Button
                type="button"
                variant="outline"
                size="lg"
                nativeButton={false}
                render={<Link href="/dashboard/pacientes" />}
              >
                Cancelar
              </Button>
              <Button type="submit" size="lg" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </Tabs>
        </section>
      </form>
    </PageContainer>
  );
}
