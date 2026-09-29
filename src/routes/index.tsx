import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CalendarRange, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestão de Projetos de Implantação" },
      {
        name: "description",
        content:
          "Acompanhe cronogramas, módulos homologados e o diário de bordo dos treinamentos de cada projeto de implantação.",
      },
      { property: "og:title", content: "Gestão de Projetos de Implantação" },
      {
        property: "og:description",
        content:
          "Cronograma, painel de módulos homologados e diário de bordo das sessões de treinamento em um só lugar.",
      },
    ],
  }),
  component: Home,
});

const areas = [
  {
    icon: CalendarRange,
    title: "Cronograma",
    text: "Etapas, responsáveis, datas e status com destaque para o que está atrasado.",
  },
  {
    icon: LayoutGrid,
    title: "Módulos homologados",
    text: "Painel com filtros por status e responsável de cada módulo do projeto.",
  },
  {
    icon: BookOpen,
    title: "Diário de bordo",
    text: "Registro de cada sessão: pauta, participantes, tarefas e próximo treinamento.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Implantação Hpro
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight">
          Gestão de projetos de implantação
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Um só lugar para acompanhar o cronograma de cada cliente, o status dos módulos
          homologados e o histórico das sessões de treinamento.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Entrar no sistema</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {areas.map((area) => (
            <div key={area.title} className="rounded-lg border bg-card p-5">
              <area.icon className="size-5 text-primary" />
              <h2 className="mt-3 text-sm font-semibold">{area.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{area.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
