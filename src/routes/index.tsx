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
  return (
    <iframe
      title="Prévia do IMPLANTA"
      src="/implanta-preview.html"
      className="block h-screen w-full border-0 bg-background"
    />
  );
}
