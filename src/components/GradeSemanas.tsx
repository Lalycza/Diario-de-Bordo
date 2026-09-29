import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

export type GradeStage = {
  modulo: string | null;
  responsavel?: string | null;
  responsavel_tipo?: string | null;
  data_inicio: string | null;
  data_prevista: string | null;
  data_conclusao: string | null;
};

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const SEMANAS = ["S1", "S2", "S3", "S4"];

function semanaDoMes(dia: number) {
  if (dia <= 7) return 0;
  if (dia <= 14) return 1;
  if (dia <= 21) return 2;
  return 3;
}

export function GradeSemanas({ stages }: { stages: GradeStage[] }) {
  const anos = useMemo(() => {
    const set = new Set<number>();
    for (const s of stages) {
      for (const d of [s.data_inicio, s.data_prevista, s.data_conclusao]) {
        if (d) set.add(Number(d.slice(0, 4)));
      }
    }
    if (set.size === 0) set.add(new Date().getFullYear());
    return Array.from(set).sort();
  }, [stages]);

  const [ano, setAno] = useState(() => {
    const atual = new Date().getFullYear();
    return anos.includes(atual) ? atual : anos[0];
  });
  const [trimestre, setTrimestre] = useState(() => Math.floor(new Date().getMonth() / 3));

  const linhas = useMemo(() => {
    const mapa = new Map<string, { responsavel: string; marcas: Set<string> }>();
    for (const s of stages) {
      const nome = s.modulo ?? "Sem módulo";
      const linha =
        mapa.get(nome) ??
        { responsavel: s.responsavel_tipo ?? s.responsavel ?? "", marcas: new Set<string>() };
      if (!linha.responsavel && (s.responsavel_tipo || s.responsavel)) {
        linha.responsavel = s.responsavel_tipo ?? s.responsavel ?? "";
      }
      for (const d of [s.data_inicio, s.data_prevista, s.data_conclusao]) {
        if (!d) continue;
        const partes = d.split("-").map(Number);
        const y = partes[0] ?? 0;
        const m = partes[1] ?? 1;
        const dia = partes[2] ?? 1;
        if (y !== ano) continue;
        linha.marcas.add(`${m - 1}-${semanaDoMes(dia)}`);
      }
      mapa.set(nome, linha);
    }
    return Array.from(mapa.entries()).map(([nome, v]) => ({ nome, ...v }));
  }, [stages, ano]);

  const meses = [0, 1, 2].map((i) => trimestre * 3 + i);

  if (stages.length === 0) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-lg border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-3">
        <h2 className="text-sm font-semibold">Próximos passos · {trimestre + 1}° trimestre</h2>
        <div className="ml-auto flex items-center gap-1">
          {anos.length > 1
            ? anos.map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant={a === ano ? "default" : "outline"}
                  onClick={() => setAno(a)}
                >
                  {a}
                </Button>
              ))
            : null}
          {[0, 1, 2, 3].map((t) => (
            <Button
              key={t}
              size="sm"
              variant={t === trimestre ? "default" : "outline"}
              onClick={() => setTrimestre(t)}
            >
              {t + 1}°
            </Button>
          ))}
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-2 text-left">Atividade crítica</th>
              <th className="px-3 py-2 text-left">Responsável</th>
              {meses.map((m) => (
                <th key={m} className="border-l px-3 py-2 text-center" colSpan={4}>
                  {MESES[m]}
                </th>
              ))}
            </tr>
            <tr className="border-b">
              <th />
              <th />
              {meses.map((m) =>
                SEMANAS.map((s, i) => (
                  <th
                    key={`${m}-${s}`}
                    className={`px-2 py-1 text-center font-normal ${i === 0 ? "border-l" : ""}`}
                  >
                    {s}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.nome} className="border-t">
                <td className="px-3 py-2 font-medium">{linha.nome}</td>
                <td className="px-3 py-2 text-muted-foreground">{linha.responsavel || "—"}</td>
                {meses.map((m) =>
                  SEMANAS.map((s, i) => {
                    const marcada = linha.marcas.has(`${m}-${i}`);
                    return (
                      <td
                        key={`${linha.nome}-${m}-${s}`}
                        className={`px-2 py-2 ${i === 0 ? "border-l" : ""}`}
                      >
                        <div
                          className={`mx-auto h-3 w-full rounded-sm ${marcada ? "bg-primary" : "bg-muted"}`}
                          aria-label={marcada ? `${linha.nome} em ${MESES[m]} ${s}` : undefined}
                        />
                      </td>
                    );
                  }),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
