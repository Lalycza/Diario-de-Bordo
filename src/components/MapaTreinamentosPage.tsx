import { useParams, useRouteContext } from "@tanstack/react-router";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ProjectHeader } from "@/components/ProjectTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProject } from "@/lib/useProject";

type PM={project_id:string;module_id:string;planned_training_date:string|null;module:{id:string;name:string}|null};
type SM={id:string;module_id:string;name:string};
type TR={id:string;module_id:string|null;submodule_id:string|null;planned_date:string|null;responsible:string|null;status:string;realization_date:string|null;homologation_date:string|null;homologation_responsible:string|null;training_start_date:string|null;training_completion_date:string|null};
type F={kind:"module"|"submodule";moduleId:string;moduleName:string;submoduleId?:string;submoduleName?:string;plannedDate:string;month:string;week:string;start:string;completion:string;homDate:string;homBy:string;status:string;id?:string};
const STAT=["Pendente","Em andamento","Concluído","Homologado"];
const mw=(v:string)=>{if(!v)return{month:"",week:""};const d=new Date(v+"T12:00:00"),m=d.toLocaleDateString("pt-BR",{month:"long"});return{month:m.charAt(0).toUpperCase()+m.slice(1),week:String(Math.min(5,Math.ceil(d.getDate()/7)))}};
const st=(a:string,b:string,c:string,d:string)=>c&&d?"Homologado":b?"Concluído":a?"Em andamento":"Pendente";
const fd=(v?:string|null)=>v?new Date(v+"T12:00:00").toLocaleDateString("pt-BR"):"—";

export function MapaTreinamentosPage(){
 const { projectId } = useParams({ from: "/_authenticated/projeto/$projectId/modulos" }); const { user } = useRouteContext({ from: "/_authenticated/projeto/$projectId/modulos" }); const project=useProject(projectId); const qc=useQueryClient(); const [form,setForm]=useState<F|null>(null);
 const mods=useQuery({queryKey:["mapa-mods",projectId],queryFn:async()=>{const{data,error}=await supabase.from("project_modules").select("project_id,module_id,planned_training_date,module:modules!project_modules_module_id_fkey(id,name)").eq("project_id",projectId).order("module_id");if(error)throw error;return(data??[]) as unknown as PM[]}});
 const subs=useQuery({queryKey:["mapa-subs",projectId],enabled:!mods.isLoading,queryFn:async()=>{const ids=(mods.data??[]).map(x=>x.module_id);if(!ids.length)return[] as SM[];const{data,error}=await supabase.from("submodules").select("id,module_id,name").in("module_id",ids).eq("active",true).order("name");if(error)throw error;return(data??[]) as SM[]}});
 const trs=useQuery({queryKey:["mapa-trs",projectId],queryFn:async()=>{const{data,error}=await supabase.from("trainings").select("id,module_id,submodule_id,planned_date,responsible,status,realization_date,homologation_date,homologation_responsible,training_start_date,training_completion_date").eq("project_id",projectId);if(error)throw error;return(data??[]) as TR[]}});
 const inv=()=>{qc.invalidateQueries({queryKey:["mapa-mods",projectId]});qc.invalidateQueries({queryKey:["mapa-subs",projectId]});qc.invalidateQueries({queryKey:["mapa-trs",projectId]});qc.invalidateQueries({queryKey:["stages",projectId]});};
 const save=useMutation({mutationFn:async(f:F)=>{
   if(!f.plannedDate)throw new Error("Informe a data prevista do treinamento.");
   if(f.kind==="module"){
     const{error:e1}=await supabase.from("project_modules").update({planned_training_date:f.plannedDate}).eq("project_id",projectId).eq("module_id",f.moduleId);if(e1)throw e1;
     const{data:x,error:e2}=await supabase.from("trainings").select("id").eq("project_id",projectId).eq("module_id",f.moduleId).is("submodule_id",null).limit(1).maybeSingle();if(e2)throw e2;
     const p={planned_date:f.plannedDate,planned_month:new Date(f.plannedDate+"T12:00:00").getMonth()+1,planned_week:Number(f.week),responsible:"HPRO",status:f.status};
     if(x){const{error}=await supabase.from("trainings").update(p).eq("id",x.id);if(error)throw error}else{const{error}=await supabase.from("trainings").insert({...p,project_id:projectId,module_id:f.moduleId,submodule_id:null,created_by:user.id});if(error)throw error}
     const ss=f.status==="Homologado"?"homologada":f.status==="Concluído"?"concluida":f.status==="Em andamento"?"em_andamento":"nao_iniciada";
     const{data:s,error:e3}=await supabase.from("project_stages").select("id").eq("project_id",projectId).eq("modulo",f.moduleName).limit(1).maybeSingle();if(e3)throw e3;
     const p2={nome:f.moduleName,modulo:f.moduleName,responsavel:"HPRO",data_prevista:f.plannedDate,status:ss};
     if(s){const{error}=await supabase.from("project_stages").update(p2).eq("id",s.id);if(error)throw error}else{const{error}=await supabase.from("project_stages").insert({...p2,project_id:projectId,created_by:user.id});if(error)throw error}
     return;
   }
   if(!f.start&&f.completion)throw new Error("Informe a data de início antes da conclusão.");
   if(f.status==="Em andamento"&&!f.start)throw new Error("Informe a data de início.");
   if(f.status==="Concluído"&&!f.completion)throw new Error("Informe a data de conclusão.");
   if(f.status==="Homologado"&&(!f.completion||!f.homDate||!f.homBy))throw new Error("Para homologar, informe conclusão, data e responsável pela homologação.");
   const main=(trs.data??[]).find(x=>x.module_id===f.moduleId&&!x.submodule_id);const planned=main?.planned_date||f.plannedDate;const m=mw(planned);const status=st(f.start,f.completion,f.homDate,f.homBy);
   const p={planned_date:planned||null,planned_month:planned?new Date(planned+"T12:00:00").getMonth()+1:null,planned_week:planned?Number(m.week):null,responsible:f.start||f.completion?"CLIENTE":"HPRO",status,realization_date:f.start||null,training_start_date:f.start||null,training_completion_date:f.completion||null,homologation_date:status==="Homologado"?f.homDate:null,homologation_responsible:status==="Homologado"?f.homBy:null};
   const{data:x,error:e}=await supabase.from("trainings").select("id").eq("project_id",projectId).eq("module_id",f.moduleId).eq("submodule_id",f.submoduleId).limit(1).maybeSingle();if(e)throw e;
   if(x){const{error}=await supabase.from("trainings").update(p).eq("id",x.id);if(error)throw error}else{const{error}=await supabase.from("trainings").insert({...p,project_id:projectId,module_id:f.moduleId,submodule_id:f.submoduleId,created_by:user.id});if(error)throw error}
 },onSuccess:()=>{inv();setForm(null);toast.success("Treinamento salvo.")},onError:e=>toast.error(e instanceof Error?e.message:"Não foi possível salvar.")});
 const del=useMutation({mutationFn:async(id:string)=>{const{error}=await supabase.from("trainings").delete().eq("id",id);if(error)throw error},onSuccess:inv});
 const openModule=(m:PM)=>{const t=(trs.data??[]).find(x=>x.module_id===m.module_id&&!x.submodule_id);const d=t?.planned_date||m.planned_training_date||"";const x=mw(d);setForm({kind:"module",moduleId:m.module_id,moduleName:m.module?.name||"Módulo",plannedDate:d,month:x.month,week:x.week,start:"",completion:"",homDate:"",homBy:"",status:t?.status||"Pendente",id:t?.id})};
 const openSub=(m:PM,s:SM)=>{const t=(trs.data??[]).find(x=>x.submodule_id===s.id);const main=(trs.data??[]).find(x=>x.module_id===m.module_id&&!x.submodule_id);const d=main?.planned_date||m.planned_training_date||"";setForm({kind:"submodule",moduleId:m.module_id,moduleName:m.module?.name||"Módulo",submoduleId:s.id,submoduleName:s.name,plannedDate:d,month:mw(d).month,week:mw(d).week,start:t?.training_start_date||t?.realization_date||"",completion:t?.training_completion_date||"",homDate:t?.homologation_date||"",homBy:t?.homologation_responsible||"",status:t?st(t.training_start_date||t.realization_date||"",t.training_completion_date||"",t.homologation_date||"",t.homologation_responsible||""):"Pendente",id:t?.id})};
 const data=mods.data??[];const ss=subs.data??[];const ts=trs.data??[];
 return <AppShell userLabel={user.email}><ProjectHeader projectId={projectId} cliente={project.data?.cliente??"Projeto"} subtitle={project.data?.descricao}/>
  <div className="space-y-4">{data.map(m=>{const main=ts.find(t=>t.module_id===m.module_id&&!t.submodule_id);const children=ss.filter(s=>s.module_id===m.module_id);return <section key={m.module_id} className="overflow-hidden rounded-lg border bg-card">
   <header className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-3"><div><h3 className="text-sm font-semibold">{m.module?.name??"Módulo"}</h3><p className="text-xs text-muted-foreground">Módulo fixo do produto</p></div><Badge variant="secondary">{main?.status??"Pendente"}</Badge><div className="ml-auto"><Button size="sm" onClick={()=>openModule(m)}><Plus className="size-4"/> Treinamento</Button></div></header>
   <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-2">Submódulo</th><th className="px-4 py-2">Previsão</th><th className="px-4 py-2">Início</th><th className="px-4 py-2">Conclusão</th><th className="px-4 py-2">Homologação</th><th className="px-4 py-2">Responsável</th><th className="px-4 py-2">Status</th><th/></tr></thead><tbody>{children.map(s=>{const t=ts.find(x=>x.submodule_id===s.id);const d=main?.planned_date||m.planned_training_date||"";const a=t?.training_start_date||t?.realization_date||"",b=t?.training_completion_date||"",c=t?.homologation_date||"",h=t?.homologation_responsible||"";return <tr key={s.id} className="border-t"><td className="px-4 py-3 font-medium">{s.name}</td><td className="px-4 py-3">{fd(d)}</td><td className="px-4 py-3">{fd(a)}</td><td className="px-4 py-3">{fd(b)}</td><td className="px-4 py-3">{fd(c)}{h?<div className="text-xs text-muted-foreground">{h}</div>:null}</td><td className="px-4 py-3">{t?.responsible||"HPRO"}</td><td className="px-4 py-3"><Badge variant="secondary">{st(a,b,c,h)}</Badge></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={()=>openSub(m,s)}><Pencil className="size-4"/></Button>{t?<Button variant="ghost" size="icon" onClick={()=>del.mutate(t.id)}><Trash2 className="size-4"/></Button>:null}</div></td></tr>})}</tbody></table></div>
  </section>})}</div>
  <Dialog open={form!==null} onOpenChange={o=>!o&&setForm(null)}><DialogContent><DialogHeader><DialogTitle>{form?.kind==="module"?"Treinamento do módulo principal":"Treinamento do submódulo"}</DialogTitle></DialogHeader>{form?<form className="space-y-4" onSubmit={e=>{e.preventDefault();save.mutate(form)}}>{form.kind==="module"?<>
    <div className="space-y-1.5"><Label>Módulo Fixo</Label><Input value={form.moduleName} readOnly disabled/></div>
    <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Data prevista do treinamento</Label><Input type="date" value={form.plannedDate} required onChange={e=>{const d=e.target.value;const z=mw(d);setForm({...form,plannedDate:d,month:z.month,week:z.week})}}/></div>
    <div className="space-y-1.5"><Label>Mês/Semana</Label><div className="grid grid-cols-2 gap-2"><Select value={form.month||"mes"} disabled><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="mes">Mês</SelectItem>{Array.from({length:12},(_,i)=>{const n=new Date(2026,i,1).toLocaleDateString("pt-BR",{month:"long"});return <SelectItem key={i} value={n}>{n.charAt(0).toUpperCase()+n.slice(1)}</SelectItem>})}</SelectContent></Select><Select value={form.week||"semana"} disabled><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{[1,2,3,4,5].map(w=><SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>)}</SelectContent></Select></div></div></div>
    <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{STAT.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
  </>:<>
    <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Submódulo</Label><Input value={form.submoduleName||""} readOnly disabled/></div><div className="space-y-1.5"><Label>Data prevista do treinamento do módulo principal</Label><Input type="date" value={form.plannedDate} readOnly disabled/></div></div>
    <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Data início treinamento</Label><Input type="date" value={form.start} onChange={e=>{const v=e.target.value;setForm({...form,start:v,status:v?(form.completion?"Concluído":"Em andamento"):"Pendente"})}}/></div><div className="space-y-1.5"><Label>Data de conclusão do Treinamento</Label><Input type="date" value={form.completion} onChange={e=>{const v=e.target.value;setForm({...form,completion:v,status:v?(form.homDate&&form.homBy?"Homologado":"Concluído"):form.start?"Em andamento":"Pendente"})}}/></div></div>
    <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Data homologação</Label><Input type="date" value={form.homDate} disabled={form.status!=="Homologado"} onChange={e=>setForm({...form,homDate:e.target.value})}/></div><div className="space-y-1.5"><Label>Responsável pela homologação</Label><Input value={form.homBy} disabled={form.status!=="Homologado"} onChange={e=>setForm({...form,homBy:e.target.value})}/></div></div>
    <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={v=>{if(v==="Em andamento"&&!form.start){toast.error("Informe a data de início.");return}if(v==="Concluído"&&!form.completion){toast.error("Informe a data de conclusão.");return}if(v==="Homologado"&&(!form.completion)){toast.error("Informe a data de conclusão antes de homologar.");return}setForm({...form,status:v})}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{STAT.filter(s=>{if(!form.start)return s==="Pendente";if(!form.completion)return s==="Em andamento";return s==="Concluído"||s==="Homologado"}).map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">Responsabilidade do treinamento: <strong>{form.start||form.completion?"CLIENTE":"HPRO"}</strong>. A homologação fica registrada separadamente com nome e data.</div>
  </>}{/* footer */}<DialogFooter><Button type="button" variant="outline" onClick={()=>setForm(null)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>Salvar</Button></DialogFooter></form>:null}</DialogContent></Dialog>
 </AppShell>;
}

type TrainingForm = {id?:string;kind:"module"|"submodule";moduleId:string;moduleName:string;submoduleId?:string;submoduleName?:string;plannedDate:string;month:string;week:string;start:string;completion:string;homDate:string;homBy:string;status:string};
function getMapaMonthWeek(v:string){return mw(v)}
