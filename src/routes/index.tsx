import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IMPLANTA — Gestão de Projetos" },
      {
        name: "description",
        content: "Painel gerencial, demandas, cronograma e diário de bordo dos projetos de implantação.",
      },
      { property: "og:title", content: "IMPLANTA — Gestão de Projetos" },
      {
        property: "og:description",
        content: "Painel gerencial, demandas, cronograma e diário de bordo dos projetos de implantação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  if (typeof window !== "undefined") {
    window.location.replace("/implanta-preview.html");
  }

  return (
    <div className="min-h-screen w-full bg-background" aria-label="Abrindo IMPLANTA" />
  );
}
