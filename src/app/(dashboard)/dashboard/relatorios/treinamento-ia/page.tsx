import { redirect } from "next/navigation";

/** Assistência de IA removida do produto — redireciona para relatórios. */
export default function AiReportTrainingPage() {
  redirect("/dashboard/relatorios");
}
