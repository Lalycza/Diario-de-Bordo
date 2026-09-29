export type StageStatus =
  | "nao_iniciada"
  | "em_andamento"
  | "concluida"
  | "atrasada"
  | "em_risco"
  | "replanejada"
  | "homologada";

export type ModuleStatus =
  | "pendente"
  | "em_configuracao"
  | "em_teste"
  | "homologado"
  | "bloqueado";

export const STAGE_STATUS: Record<StageStatus, { label: string; className: string }> = {
  nao_iniciada: { label: "Não iniciada", className: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em andamento", className: "bg-warning/20 text-warning-foreground" },
  concluida: { label: "Concluída", className: "bg-success/20 text-success" },
  atrasada: { label: "Atrasada", className: "bg-danger/15 text-danger" },
  em_risco: { label: "Em risco", className: "bg-danger/10 text-danger" },
  replanejada: { label: "Replanejada", className: "bg-info/15 text-info" },
  homologada: { label: "Homologada", className: "bg-success/25 text-success" },
};

/** Módulos padrão do cronograma de implantação. */
export const MODULOS = [
  "Sistema",
  "Cadastros",
  "Vendas",
  "Faturamento",
  "Estoque",
  "Suprimentos",
  "Produção",
  "Gerencial",
  "DRE",
  "Fiscal",
] as const;

export const MODULE_STATUS: Record<ModuleStatus, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-muted text-muted-foreground" },
  em_configuracao: { label: "Em configuração", className: "bg-info/15 text-info" },
  em_teste: { label: "Em teste", className: "bg-warning/20 text-warning-foreground" },
  homologado: { label: "Homologado", className: "bg-success/20 text-success" },
  bloqueado: { label: "Bloqueado", className: "bg-danger/15 text-danger" },
};

export const STAGE_STATUS_KEYS = Object.keys(STAGE_STATUS) as StageStatus[];
export const MODULE_STATUS_KEYS = Object.keys(MODULE_STATUS) as ModuleStatus[];

/** Uma etapa está atrasada quando passou da data prevista sem conclusão. */
export function effectiveStageStatus(stage: {
  status: string;
  data_prevista: string | null;
  data_conclusao: string | null;
}): StageStatus {
  const status = stage.status as StageStatus;
  if (status === "homologada") return "homologada";
  if (status === "concluida" || stage.data_conclusao) return "concluida";
  if (status === "replanejada") return "replanejada";
  if (stage.data_prevista && stage.data_prevista < todayISO()) return "atrasada";
  return status;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 5);
}

/** Verdadeiro quando alguma das datas da etapa cai no dia de hoje. */
export function isToday(...dates: (string | null | undefined)[]) {
  const hoje = todayISO();
  return dates.some((d) => Boolean(d) && d!.slice(0, 10) === hoje);
}

/** Segunda a domingo da semana atual, em ISO. */
export function currentWeekRange() {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - day);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { inicio: monday.toISOString().slice(0, 10), fim: sunday.toISOString().slice(0, 10) };
}
