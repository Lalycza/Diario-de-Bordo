import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { STAGE_STATUS, effectiveStageStatus, type StageStatus } from "@/lib/status";

export type GradeStage = {
  modulo: string | null;
  responsavel?: string | null;
  responsavel_tipo?: string | null;
  data_inicio: string | null;
  data_prevista: string | null;
  data_conclusao: string | null;
  status?: string | null;
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

const SEMANAS = ["S1", "S2", "S3", "S4", "S5"];

function semanaDoMes(dia: number) {
  if (dia <= 7) return 0;
  if (dia <= 14) return 1;
  if (dia <= 21) return 2;
  if (dia <= 28) return 3;
  return 4;
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
    const mapa = new Map<string, { responsavel: string; marcas: Map<string, StageStatus> }>();
    for (const s of stages) {
      const nome = s.modulo ?? "Sem módulo";
      const linha =
        mapa.get(nome) ??
        { responsavel: s.responsavel_tipo ?? s.responsavel ?? "", marcas: new Map<string, StageStatus>() };
      if (!linha.responsavel && (s.responsavel_tipo || s.responsavel)) {
        linha.responsavel = s.responsavel_tipo ?? s.responsavel ?? "";
      }
      const status = effectiveStageStatus({
        status: s.status ?? "nao_iniciada",
        data_prevista: s.data_prevista,
        data_conclusao: s.data_conclusao,
      });
      for (const d of [s.data_inicio, s.data_prevista, s.data_conclusao]) {
        if (!d) continue;
        const partes = d.split("-").map(Number);
        const y = partes[0] ?? 0;
        const m = partes[1] ?? 1;
        const dia = partes[2] ?? 1;
        if (y !== ano) continue;
        const chave = `${m - 1}-${semanaDoMes(dia)}`;
        const atual = linha.marcas.get(chave);
        const prioridade: Record<StageStatus, number> = {
          nao_iniciada: 1,
          em_risco: 2,
          atrasada: 3,
          replanejada: 4,
          em_andamento: 5,
          concluida: 6,
          homologada: 7,
        };
        if (!atual || prioridade[status] > prioridade[atual]) {
          linha.marcas.set(chave, status);
        }
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
                <th key={m} className="border-l px-3 py-2 text-center" colSpan={5}>
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
                    const status = linha.marcas.get(`${m}-${i}`);
                    const statusStyle = status
                      ? {
                          nao_iniciada: "bg-red-100 dark:bg-red-600",
                          em_andamento: "bg-yellow-100 dark:bg-yellow-500",
                          concluida: "bg-green-100 dark:bg-green-600",
                          atrasada: "bg-red-200 dark:bg-red-700",
                          em_risco: "bg-orange-200 dark:bg-orange-600",
                          replanejada: "bg-blue-100 dark:bg-blue-600",
                          homologada: "bg-purple-100 dark:bg-purple-600",
                        }[status]
                      : "bg-muted dark:bg-muted/60";
                    return (
                      <td
                        key={`${linha.nome}-${m}-${s}`}
                        className={`px-2 py-2 ${i === 0 ? "border-l" : ""}`}
                      >
                        <div
                          className={`mx-auto h-3 w-full rounded-sm ${statusStyle}`}
                          aria-label={
                            status
                              ? `${linha.nome} — ${STAGE_STATUS[status].label} em ${MESES[m]} ${s}`
                              : undefined
                          }
                          title={status ? STAGE_STATUS[status].label : undefined}
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
