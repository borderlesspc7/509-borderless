"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/use-user-role";
import { getHomePathForProfile } from "@/lib/rbac";

type AccessDeniedCardProps = {
  title?: string;
  description?: string;
};

export function AccessDeniedCard({
  title = "Acesso restrito",
  description = "Seu perfil não possui permissão para acessar esta área.",
}: AccessDeniedCardProps) {
  const { profile } = useUserRole();
  const homeHref = getHomePathForProfile(profile);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="app-surface-card w-full max-w-md p-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Button
          className="mt-6"
          nativeButton={false}
          render={<Link href={homeHref} />}
        >
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}
