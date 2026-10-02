import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, RotateCcw, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { listUsersWithRoles, resetManagedUserPassword, setUserRole, updateManagedUser, type ManagedRole } from "@/lib/admin.functions";
import { useRole } from "@/lib/useRole";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/cadastros/usuarios")({
  head: () => ({ meta: [{ title: "Usuários e perfis" }] }),
  component: UsuariosPage,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ROLE_LABELS: Record<ManagedRole, string> = {
  admin: "Administrador", supervisor: "Supervisor", analista: "Analista", operador: "Operador", comercial: "Comercial", cliente: "Cliente",
};

function UsuariosPage() {
  const isValidUserId = (id: string) => UUID_RE.test(id);
  const { user } = Route.useRouteContext();
  const { isAdmin, isSupervisor, isLoading } = useRole();
  const queryClient = useQueryClient();
  const carregar = useServerFn(listUsersWithRoles);
  const redefinir = useServerFn(resetManagedUserPassword);
  const alterar = useServerFn(setUserRole);
  const atualizar = useServerFn(updateManagedUser);
  const [resetId, setResetId] = useState<string | null>(null); const [resetPassword, setResetPassword] = useState("");
  const [editId, setEditId] = useState<string | null>(null); const [editName, setEditName] = useState(""); const [editEmail, setEditEmail] = useState(""); const [editRole, setEditRole] = useState<ManagedRole>("operador"); const [editActive, setEditActive] = useState(true);

  const usersQuery = useQuery({ queryKey: ["users-roles"], enabled: isAdmin || isSupervisor, queryFn: async () => carregar({ data: undefined }) });
  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ["users-roles"] }); queryClient.invalidateQueries({ queryKey: ["my-roles"] }); };
  const resetMutation = useMutation({
    mutationFn: () => redefinir({ data: { userId: resetId!, temporaryPassword: resetPassword } }),
    onSuccess: () => { setResetId(null); setResetPassword(""); toast.success("Senha temporária redefinida. O usuário deverá trocá-la no próximo acesso."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const roleMutation = useMutation({ mutationFn: (input: { userId: string; role: ManagedRole }) => alterar({ data: input }), onSuccess: () => { invalidate(); toast.success("Perfil atualizado."); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({
    mutationFn: () => atualizar({ data: { userId: editId!, name: editName, email: editEmail, role: editRole, active: editActive } }),
    onSuccess: () => { setEditId(null); invalidate(); toast.success(editActive ? "Usuário atualizado e ativo." : "Usuário inativado. O acesso ao portal foi bloqueado."); },
    onError: (e: Error) => toast.error(e.message),
  });

  return <AppShell userLabel={user.email}>
    <div className="mb-6 flex items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Usuários e perfis</h1><p className="text-sm text-muted-foreground">Edite dados, perfil e acesso dos usuários existentes.</p></div>
    </div>
    {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : !(isAdmin || isSupervisor) ? <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Apenas administradores ou supervisores podem gerenciar acessos.</div> :
      <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-2 text-left">Nome</th><th className="px-4 py-2 text-left">E-mail</th><th className="px-4 py-2 text-left">Acesso</th><th className="px-4 py-2 text-left">Perfil</th><th className="px-4 py-2 text-right">Ações</th></tr></thead><tbody>
      {(usersQuery.data ?? []).map(u => <tr key={u.id} className="border-t"><td className="px-4 py-3 font-medium">{u.nome || "—"}</td><td className="px-4 py-3">{u.email}</td><td className="px-4 py-3"><Badge variant={u.active ? "default" : "secondary"}>{u.active ? "Ativo" : "Inativo"}</Badge></td><td className="px-4 py-3"><Badge variant="outline">{ROLE_LABELS[u.role]}</Badge></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-1">{u.protectedAdmin ? <Badge variant="outline"><ShieldCheck className="mr-1 size-4 inline" />Protegido</Badge> : <><Button variant="ghost" size="sm" onClick={() => { if (!isValidUserId(u.id)) { toast.error("Registro de usuário inválido. Atualize a lista e tente novamente."); return; } setEditId(u.id); setEditName(u.nome); setEditEmail(u.email); setEditRole(u.role); setEditActive(u.active); }}><Pencil className="mr-1 size-4" />Editar</Button><Button variant="ghost" size="sm" onClick={() => { if (!isValidUserId(u.id)) { toast.error("Registro de usuário inválido. Atualize a lista e tente novamente."); return; } setResetId(u.id); }}><RotateCcw className="mr-1 size-4" />Redefinir senha</Button></>}</div></td></tr>)}</tbody></table></div>}

    <Dialog open={Boolean(editId)} onOpenChange={v=>!v&&setEditId(null)}><DialogContent><DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader><div className="space-y-4">
      <div className="space-y-2"><Label>Nome</Label><Input value={editName} onChange={e=>setEditName(e.target.value)} /></div>
      <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>Perfil</Label><Select value={editRole} onValueChange={v=>setEditRole(v as ManagedRole)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).filter(([r])=>r!=="admin").map(([r,label])=><SelectItem key={r} value={r}>{label}</SelectItem>)}</SelectContent></Select></div>
      <div className="flex items-center justify-between rounded-lg border p-3"><div><div className="font-medium">{editActive ? "Acesso ativo" : "Acesso inativo"}</div><div className="text-xs text-muted-foreground">{editActive ? "O usuário pode entrar no portal." : "O usuário não poderá entrar no portal."}</div></div><Button type="button" variant={editActive ? "outline" : "default"} onClick={()=>setEditActive(v=>!v)}>{editActive ? <><UserX className="mr-2 size-4" />Inativar</> : <><UserCheck className="mr-2 size-4" />Ativar</>}</Button></div>
    </div><DialogFooter><Button variant="outline" onClick={()=>setEditId(null)}>Cancelar</Button><Button disabled={updateMutation.isPending || !editName.trim() || !editEmail.trim()} onClick={()=>updateMutation.mutate()}>{updateMutation.isPending?"Salvando…":"Salvar alterações"}</Button></DialogFooter></DialogContent></Dialog>
    
    <Dialog open={Boolean(resetId)} onOpenChange={v=>!v&&setResetId(null)}><DialogContent><DialogHeader><DialogTitle>Redefinir senha</DialogTitle></DialogHeader><div className="space-y-2"><Label>Nova senha temporária</Label><Input type="password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)} placeholder="Mínimo 8 caracteres" /></div><DialogFooter><Button variant="outline" onClick={()=>setResetId(null)}>Cancelar</Button><Button disabled={resetMutation.isPending || resetPassword.length<8} onClick={()=>resetMutation.mutate()}>{resetMutation.isPending?"Salvando…":"Redefinir senha"}</Button></DialogFooter></DialogContent></Dialog>
  </AppShell>;
}
