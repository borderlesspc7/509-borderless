import Image from "next/image";
import { Activity, HeartPulse, LockKeyhole } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="app-auth-shell h-full overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[minmax(340px,0.88fr)_minmax(560px,1.12fr)]">
      <section className="auth-brand-panel relative hidden min-h-full overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white text-[oklch(0.44_0.11_225)] shadow-sm">
            <HeartPulse className="size-6" strokeWidth={1.8} aria-hidden />
          </div>
          <div>
            <p className="text-lg font-semibold">Nurse Care</p>
            <p className="text-xs text-white/65">Soluções em Saúde</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg pb-6">
          <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase text-[oklch(0.79_0.1_215)]">
            <Activity className="size-4" aria-hidden />
            Cuidado conectado
          </p>
          <h2 className="max-w-md text-4xl font-semibold leading-[1.12] xl:text-5xl">
            A rotina clínica, organizada para cuidar melhor.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-white/70">
            Prontuários, agenda e equipe em um ambiente seguro, claro e feito
            para o trabalho multidisciplinar.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/15 bg-white/15">
            <div className="bg-[oklch(0.25_0.055_235)] p-4">
              <p className="text-2xl font-semibold">360°</p>
              <p className="mt-1 text-xs leading-5 text-white/60">Visão integrada do cuidado</p>
            </div>
            <div className="bg-[oklch(0.25_0.055_235)] p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <LockKeyhole className="size-4 text-[oklch(0.79_0.1_215)]" aria-hidden />
                Dados protegidos
              </p>
              <p className="mt-2 text-xs leading-5 text-white/60">Acesso seguro para sua equipe</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/45">© 2026 Nurse Care</p>
      </section>

      <section className="flex min-h-full flex-col bg-background">
        <header className="flex items-center justify-center border-b border-border/60 px-5 py-4 lg:hidden">
          <Image
            src="/brand/logo-nurse-care-sm.png"
            alt="Nurse Care - Soluções em Saúde"
            width={160}
            height={52}
            className="h-10 w-auto object-contain dark:hidden"
            priority
          />
          <div className="hidden items-center gap-2.5 dark:flex">
            <Image
              src="/brand/logo-icon.png"
              alt=""
              width={36}
              height={36}
              className="size-9 object-contain"
              priority
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">Nurse Care</p>
              <p className="text-[0.65rem] font-medium text-sky-600 dark:text-sky-300">
                Soluções em Saúde
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 lg:px-12 lg:py-10 xl:px-20">
          <div className="w-full max-w-[500px]">{children}</div>
        </div>

        <footer className="px-5 pb-5 text-center text-xs text-muted-foreground lg:pb-7">
          Plataforma segura para gestão de equipes multidisciplinares
        </footer>
      </section>
    </main>
  );
}
