"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AccessDeniedBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(searchParams.get("acesso") === "negado");
  }, [searchParams]);

  if (!isVisible) {
    return null;
  }

  function handleDismiss() {
    setIsVisible(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("acesso");
    const nextUrl = params.size > 0 ? `${pathname}?${params}` : pathname;
    router.replace(nextUrl);
  }

  return (
    <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-3 sm:px-6">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Acesso negado para o seu perfil.
          </p>
          <p className="text-xs text-muted-foreground">
            Você foi redirecionado para uma área permitida. Solicite permissão ao
            administrador se precisar desta funcionalidade.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Fechar aviso"
          onClick={handleDismiss}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
