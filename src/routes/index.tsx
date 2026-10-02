import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IMPLANTA — Gestão de Projetos" },
      {
        name: "description",
        content:
          "Painel gerencial, demandas, cronograma e diário de bordo dos projetos de implantação.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/auth", replace: true });
  },
  component: () => null,
});
