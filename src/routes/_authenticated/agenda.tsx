import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock3, Edit3, Plus, X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Minha Agenda — IMPLANTA" },
      { name: "description", content: "Organize compromissos, reuniões e treinamentos." },
    ],
  }),
  component: AgendaPage,
});

type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string;
  status: string;
  client_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
};

type EventForm = {
  id?: string;
  title: string;
  description: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  client_id: string;
  project_id: string;
  status: string;
};

type ClientOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; client_id: string | null };

const EVENT_TYPES = [
  { value: "reuniao", label: "Reunião", color: "bg-sky-500" },
  { value: "treinamento", label: "Treinamento", color: "bg-emerald-500" },
  { value: "tarefa", label: "Atividade", color: "bg-violet-500" },
  { value: "lembrete", label: "Lembrete", color: "bg-amber-500" },
] as const;

function localDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function fromLocalInput(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
function toLocalInput(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
function dateAtNoon(key: string) {
  return new Date(key + "T12:00:00");
}
function formatDate(key: string) {
  return dateAtNoon(key).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function eventTypeLabel(value: string) {
  return EVENT_TYPES.find((type) => type.value === value)?.label ?? "Compromisso";
}
function eventTypeColor(value: string) {
  return EVENT_TYPES.find((type) => type.value === value)?.color ?? "bg-sky-500";
}
function monthTitle(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
function makeForm(date: Date = new Date()): EventForm {
  const start = new Date(date);
  start.setHours(Math.max(8, start.getHours() + 1), 0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + 1);
  return {
    title: "",
    description: "",
    event_type: "reuniao",
    starts_at: toLocalInput(start),
    ends_at: toLocalInput(end),
    client_id: "",
    project_id: "",
    status: "scheduled",
  };
}

function AgendaPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  });
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [view, setView] = useState<"month" | "list">("month");
  const [form, setForm] = useState<EventForm | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const eventsQuery = useQuery({
    queryKey: ["personal-calendar-events", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarEvent[];
    },
  });

  const clientsQuery = useQuery({
    queryKey: ["agenda-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as ClientOption[];
    },
  });

  const projectsQuery = useQuery({
    queryKey: ["agenda-projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name, client_id").order("name");
      if (error) throw error;
      return (data ?? []) as ProjectOption[];
    },
  });

  const saveEvent = useMutation({
    mutationFn: async (value: EventForm) => {
      const startsAt = fromLocalInput(value.starts_at);
      const endsAt = fromLocalInput(value.ends_at);
      if (!value.title.trim()) throw new Error("Informe o título do compromisso.");
      if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
        throw new Error("O encerramento precisa ser posterior ao início.");
      }
      const payload = {
        user_id: user.id,
        title: value.title.trim(),
        description: value.description.trim() || null,
        event_type: value.event_type,
        starts_at: startsAt,
        ends_at: endsAt,
        status: "scheduled",
        client_id: value.client_id || null,
        project_id: value.project_id || null,
      };
      const result = value.id
        ? await supabase.from("personal_calendar_events").update(payload).eq("id", value.id).eq("user_id", user.id)
        : await supabase.from("personal_calendar_events").insert(payload);
      if (result.error) throw result.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["personal-calendar-events", user.id] });
      toast.success("Compromisso salvo na sua agenda.");
      setDialogOpen(false);
      setForm(null);
    },
    onError: (error) => toast.error(error.message || "Não foi possível salvar o compromisso."),
  });

  const cancelEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("personal_calendar_events")
        .update({ status: "cancelled" })
        .eq("id", eventId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["personal-calendar-events", user.id] });
      toast.success("Compromisso cancelado.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível cancelar o compromisso."),
  });

  const events = eventsQuery.data ?? [];
  const activeEvents = useMemo(() => events.filter((event) => event.status !== "cancelled"), [events]);
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = localDateKey(new Date(event.starts_at));
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [month]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const upcomingEvents = events.filter((event) => event.status !== "cancelled" && new Date(event.ends_at) >= new Date());
  const filteredProjects = useMemo(() => {
    const clientId = form?.client_id ?? "";
    return (projectsQuery.data ?? []).filter((project) => !clientId || !project.client_id || project.client_id === clientId);
  }, [form?.client_id, projectsQuery.data]);

  function openNewEvent() {
    setForm(makeForm(dateAtNoon(selectedDate)));
    setDialogOpen(true);
  }
  function openEditEvent(event: CalendarEvent) {
    setForm({
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      event_type: event.event_type,
      starts_at: toLocalInput(event.starts_at),
      ends_at: toLocalInput(event.ends_at),
      client_id: event.client_id ?? "",
      project_id: event.project_id ?? "",
      status: event.status,
    });
    setDialogOpen(true);
  }
  function changeMonth(amount: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1, 12));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form) saveEvent.mutate(form);
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-card">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-sky-500/10 to-transparent" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-4">
            <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-3 text-sky-500">
              <CalendarDays className="size-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">Meu Perfil</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Minha Agenda</h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Reuniões, treinamentos e lembretes em um só lugar.
              </p>
            </div>
          </div>
          <Button onClick={openNewEvent} className="gap-2 self-start sm:self-auto">
            <Plus className="size-4" />
            Novo compromisso
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Próximos compromissos</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{upcomingEvents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Hoje</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {(eventsByDate.get(localDateKey(new Date())) ?? []).filter((event) => event.status !== "cancelled").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Compromissos cadastrados</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{activeEvents.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg capitalize">{monthTitle(month)}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Sua agenda pessoal, com compromissos vinculados opcionalmente a projetos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} aria-label="Mês anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" onClick={() => {
              const now = new Date();
              setMonth(new Date(now.getFullYear(), now.getMonth(), 1, 12));
              setSelectedDate(localDateKey(now));
            }}>Hoje</Button>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)} aria-label="Próximo mês">
              <ChevronRight className="size-4" />
            </Button>
            <div className="ml-1 flex rounded-lg border p-1">
              <Button size="sm" variant={view === "month" ? "default" : "ghost"} onClick={() => setView("month")}>Mês</Button>
              <Button size="sm" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}>Agenda</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {eventsQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando seus compromissos…</div>
          ) : eventsQuery.isError ? (
            <div className="p-8 text-center">
              <p className="font-medium">Não foi possível carregar a agenda.</p>
              <p className="mt-1 text-sm text-muted-foreground">Confirme se a migração da agenda foi aplicada ao Supabase.</p>
              <Button className="mt-4" variant="outline" onClick={() => void eventsQuery.refetch()}>Tentar novamente</Button>
            </div>
          ) : view === "month" ? (
            <div>
              <div className="grid grid-cols-7 border-b bg-muted/30">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
                  <div key={day} className="px-1 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const key = localDateKey(day);
                  const dayEvents = eventsByDate.get(key) ?? [];
                  const inMonth = day.getMonth() === month.getMonth();
                  const selected = key === selectedDate;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      className={[
                        "min-h-24 border-b border-r p-1.5 text-left transition-colors sm:min-h-28 sm:p-2",
                        inMonth ? "bg-card" : "bg-muted/20 text-muted-foreground/60",
                        selected ? "ring-2 ring-inset ring-sky-500 bg-sky-500/5" : "hover:bg-muted/50",
                      ].join(" ")}
                    >
                      <span className={["inline-flex size-7 items-center justify-center rounded-full text-xs", key === localDateKey(new Date()) ? "bg-sky-500 font-semibold text-white" : ""].join(" ")}>
                        {day.getDate()}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div key={event.id} className={["truncate rounded px-1.5 py-1 text-[10px] font-medium text-white sm:text-xs", eventTypeColor(event.event_type), event.status === "cancelled" ? "opacity-40 line-through" : ""].join(" ")}>
                            {formatTime(event.starts_at)} {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 ? <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 2} mais</p> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {upcomingEvents.length ? upcomingEvents.map((event) => (
                <EventRow key={event.id} event={event} onEdit={() => openEditEvent(event)} onCancel={() => cancelEvent.mutate(event.id)} cancelling={cancelEvent.isPending} />
              )) : (
                <div className="p-10 text-center">
                  <CalendarDays className="mx-auto size-8 text-muted-foreground/60" />
                  <p className="mt-3 font-medium">Sua agenda está livre</p>
                  <p className="mt-1 text-sm text-muted-foreground">Adicione um compromisso para começar a se organizar.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {view === "month" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 p-4">
            <div>
              <CardTitle className="text-base">Compromissos de {formatDate(selectedDate)}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{selectedEvents.length ? selectedEvents.length + " compromisso(s)" : "Nenhum compromisso nesta data"}</p>
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={openNewEvent}>
              <Plus className="size-4" /> Adicionar
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {selectedEvents.length ? (
              <div className="divide-y">
                {selectedEvents.map((event) => <EventRow key={event.id} event={event} onEdit={() => openEditEvent(event)} onCancel={() => cancelEvent.mutate(event.id)} cancelling={cancelEvent.isPending} />)}
              </div>
            ) : (
              <div className="px-4 pb-5 text-sm text-muted-foreground">Selecione outra data ou crie um novo compromisso.</div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {EVENT_TYPES.map((type) => (
          <span key={type.value} className="flex items-center gap-2">
            <span className={["size-2.5 rounded-full", type.color].join(" ")} />
            {type.label}
          </span>
        ))}
        <span className="ml-auto">Os compromissos são privados e visíveis somente para você.</span>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setForm(null); }}>
        <DialogContent className="!max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
            <DialogDescription>Cadastre os detalhes da reunião, treinamento, atividade ou lembrete.</DialogDescription>
          </DialogHeader>
          {form ? (
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="agenda-title">Título *</Label>
                <Input id="agenda-title" autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Alinhamento com o cliente" required maxLength={160} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.event_type} onValueChange={(value) => setForm({ ...form, event_type: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>{EVENT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cliente (opcional)</Label>
                  <Select value={form.client_id || "none"} onValueChange={(value) => setForm({ ...form, client_id: value === "none" ? "" : value, project_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Vincular cliente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem cliente vinculado</SelectItem>
                      {(clientsQuery.data ?? []).map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agenda-start">Início *</Label>
                  <Input id="agenda-start" type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-end">Encerramento *</Label>
                  <Input id="agenda-end" type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Projeto (opcional)</Label>
                <Select value={form.project_id || "none"} onValueChange={(value) => setForm({ ...form, project_id: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Vincular projeto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem projeto vinculado</SelectItem>
                    {filteredProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda-description">Descrição / observações</Label>
                <Textarea id="agenda-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Pauta, participantes ou informações importantes..." rows={3} maxLength={2000} />
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setForm(null); }}>Cancelar</Button>
                <Button type="submit" disabled={saveEvent.isPending}>{saveEvent.isPending ? "Salvando..." : "Salvar compromisso"}</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventRow({ event, onEdit, onCancel, cancelling }: {
  event: CalendarEvent;
  onEdit: () => void;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const cancelled = event.status === "cancelled";
  return (
    <div className={["flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between", cancelled ? "opacity-60" : ""].join(" ")}>
      <div className="flex min-w-0 items-start gap-3">
        <span className={["mt-1 size-2.5 shrink-0 rounded-full", eventTypeColor(event.event_type)].join(" ")} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={["font-medium", cancelled ? "line-through" : ""].join(" ")}>{event.title}</p>
            <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{eventTypeLabel(event.event_type)}</span>
            {cancelled ? <span className="text-xs text-destructive">Cancelado</span> : null}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock3 className="size-3.5" />
            {new Date(event.starts_at).toLocaleDateString("pt-BR")} · {formatTime(event.starts_at)}–{formatTime(event.ends_at)}
          </p>
          {event.description ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-2 self-end sm:self-auto">
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5"><Edit3 className="size-3.5" /> Editar</Button>
        {!cancelled ? <Button variant="ghost" size="sm" disabled={cancelling} onClick={onCancel} className="gap-1.5 text-muted-foreground"><X className="size-3.5" /> Cancelar</Button> : null}
      </div>
    </div>
  );
}
