"use client";

import Image from "next/image";
import Link from "next/link";

import { useUserRole } from "@/hooks/use-user-role";
import { APP_NAME } from "@/lib/app-brand";
import { getHomePathForProfile } from "@/lib/rbac";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  variant?: "default" | "compact";
  linkToHome?: boolean;
};

const logoSources = {
  default: {
    src: "/brand/logo-nurse-care.png",
    width: 220,
    height: 72,
  },
  compact: {
    src: "/brand/logo-nurse-care-sm.png",
    width: 160,
    height: 52,
  },
} as const;

export function AppLogo({
  className,
  variant = "default",
  linkToHome = false,
}: AppLogoProps) {
  const logo = logoSources[variant];
  const { profile } = useUserRole();
  const homeHref = getHomePathForProfile(profile);

  const content = (
    <div className={cn("flex items-center", className)}>
      {/* Modo claro: logo completa (fundo transparente) */}
      <Image
        src={logo.src}
        alt={APP_NAME}
        width={logo.width}
        height={logo.height}
        className="h-auto max-h-12 w-auto max-w-full object-contain dark:hidden"
        priority
      />

      {/* Modo escuro: ícone transparente + tipografia legível */}
      <div className="hidden items-center gap-2.5 dark:flex">
        <Image
          src="/brand/logo-icon.png"
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 object-contain"
          priority
        />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[0.95rem] font-semibold tracking-tight text-sidebar-foreground">
            Nurse Care
          </p>
          <p className="truncate text-[0.65rem] font-medium text-sky-300/90">
            Soluções em Saúde
          </p>
        </div>
      </div>
    </div>
  );

  if (linkToHome) {
    return (
      <Link
        href={homeHref}
        className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={APP_NAME}
      >
        {content}
      </Link>
    );
  }

  return content;
}
