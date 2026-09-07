"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";

import { DocumentTemplateList } from "@/components/document-templates/document-template-list";
import { ProtectedComponent } from "@/components/auth/protected-component";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/rbac";
import type { DocumentTemplateRow } from "@/lib/supabase/database.types";

type DocumentTemplatesPageViewProps = {
  templates: DocumentTemplateRow[];
  error?: string;
};

export function DocumentTemplatesPageView({
  templates: initialTemplates,
  error,
}: DocumentTemplatesPageViewProps) {
  const [templates, setTemplates] = useState(initialTemplates);

  return (
    <PageContainer size="wide" className="space-y-6">
      <DashboardPageHeader
        title="Biblioteca de Modelos"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Atendimento" },
          { label: "Biblioteca de Modelos" },
        ]}
        actions={
          <ProtectedComponent permission={PERMISSIONS.DOCUMENT_TEMPLATES_MANAGE}>
            <Button
              size="lg"
              className="gap-2"
              nativeButton={false}
              render={<Link href="/dashboard/modelos/novo" />}
            >
              <Plus className="size-4" aria-hidden />
              Incluir modelo
            </Button>
          </ProtectedComponent>
        }
      />

      <section className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
        Gerencie modelos narrativos reutilizáveis para evolução clínica,
        anamnese, parecer e relatórios. Use <strong>Incluir modelo</strong> para
        cadastrar um novo texto e disponibilizá-lo no editor de evolução.
      </section>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <DocumentTemplateList
          templates={templates}
          onTemplatesChange={setTemplates}
        />
      )}
    </PageContainer>
  );
}
