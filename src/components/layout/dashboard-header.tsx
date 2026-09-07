"use client";

import { Menu } from "lucide-react";

import { NotificationCenter } from "@/components/internal-communication/notification-center";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  onMenuClick?: () => void;
};

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { fullName, displayRole } = useUserRole();

  return (
    <header className="app-header-bar sticky top-0 z-40">
      <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("app-header-icon-btn shrink-0 lg:hidden")}
          onClick={onMenuClick}
          aria-label="Abrir menu de navegação"
        >
          <Menu className="size-5" />
        </Button>

        <div className="min-w-0 flex-1 lg:hidden">
          <p className="truncate text-sm font-semibold">{fullName}</p>
          <p className="truncate text-xs text-primary-foreground/80">
            {displayRole}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeToggle inverse />
          <NotificationCenter inverse />

          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-medium">{fullName}</p>
            <p className="truncate text-xs text-primary-foreground/80">
              {displayRole}
            </p>
          </div>

          <UserMenu inverse />
        </div>
      </div>
    </header>
  );
}
