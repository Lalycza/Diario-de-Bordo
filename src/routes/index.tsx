import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IMPLANTA — Gestão de Projetos" },
      {
        name: "description",
        content: "Painel gerencial, demandas, cronograma e diário de bordo dos projetos de implantação.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/auth", replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen w-full bg-background" aria-label="Abrindo IMPLANTA" />
  );
}
