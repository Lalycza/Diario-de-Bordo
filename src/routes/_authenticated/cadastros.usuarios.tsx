import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, RotateCcw, ShieldCheck, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createManagedUser, listUsersWithRoles, resetManagedUserPassword, setUserRole, type ManagedRole } from "@/lib/admin.functions";
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

const ROLE_LABELS: Record<ManagedRole, string> = {
  admin: "Administrador", supervisor: "Supervisor", analista: "Analista", operador: "Operador", cs: "CS", comercial: "Comercial", cliente: "Cliente",
};

function UsuariosPage() {
  const { user } = Route.useRouteContext();
  const { isAdmin, isSupervisor, isLoading } = useRole();
  const queryClient = useQueryClient();
  const carregar = useServerFn(listUsersWithRoles);
  const criar = useServerFn(createManagedUser);
  const redefinir = useServerFn(resetManagedUserPassword);
  const alterar = useServerFn(setUserRole);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState<Exclude<ManagedRole, "admin">>("operador"); const [temporaryPassword, setTemporaryPassword] = useState("");
  const [resetId, setResetId] = useState<string | null>(null); const [resetPassword, setResetPassword] = useState("");

  const usersQuery = useQuery({ queryKey: ["users-roles"], enabled: isAdmin || isSupervisor, queryFn: async () => carregar({ data: undefined }) });
  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ["users-roles"] }); queryClient.invalidateQueries({ queryKey: ["my-roles"] }); };
  const createMutation = useMutation({
    mutationFn: () => criar({ data: { name, email, role, temporaryPassword } }),
    onSuccess: () => { setOpen(false); setName(""); setEmail(""); setRole("operador"); setTemporaryPassword(""); invalidate(); toast.success("Usuário criado. Entregue a senha temporária ao usuário com segurança."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const resetMutation = useMutation({
    mutationFn: () => redefinir({ data: { userId: resetId!, temporaryPassword: resetPassword } }),
    onSuccess: () => { setResetId(null); setResetPassword(""); toast.success("Senha temporária redefinida. O usuário deverá trocá-la no próximo acesso."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const roleMutation = useMutation({ mutationFn: (input: { userId: string; role: ManagedRole }) => alterar({ data: input }), onSuccess: () => { invalidate(); toast.success("Perfil atualizado."); }, onError: (e: Error) => toast.error(e.message) });

  return <AppShell userLabel={user.email}>
    <div className="mb-6 flex items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Usuários e perfis</h1><p className="text-sm text-muted-foreground">Criação com senha temporária e troca obrigatória no primeiro acesso.</p></div>
      {(isAdmin || isSupervisor) && <Button onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />Novo usuário</Button>}
    </div>
    {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : !(isAdmin || isSupervisor) ? <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Apenas administradores ou supervisores podem gerenciar acessos.</div> :
      <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-2 text-left">Nome</th><th className="px-4 py-2 text-left">E-mail</th><th className="px-4 py-2 text-left">Perfil</th><th className="px-4 py-2 text-right">Acesso</th></tr></thead><tbody>
      {(usersQuery.data ?? []).map(u => <tr key={u.id} className="border-t"><td className="px-4 py-3 font-medium">{u.nome || "—"}</td><td className="px-4 py-3">{u.email}</td><td className="px-4 py-3"><Select value={u.role} onValueChange={r => roleMutation.mutate({ userId:u.id, role:r as ManagedRole })} disabled={roleMutation.isPending || u.protectedAdmin}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).filter(([r]) => isAdmin || r !== "admin").map(([r,label]) => <SelectItem key={r} value={r}>{label}</SelectItem>)}</SelectContent></Select></td><td className="px-4 py-3 text-right">{u.protectedAdmin ? <ShieldCheck className="ml-auto size-4" aria-label="Administrador principal protegido" /> : <Button variant="ghost" size="sm" onClick={() => setResetId(u.id)}><RotateCcw className="mr-1 size-4" />Redefinir senha</Button>}</td></tr>)}</tbody></table></div>}

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader><div className="space-y-4">
      <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={e=>setName(e.target.value)} /></div>
      <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>Perfil</Label><Select value={role} onValueChange={v=>setRole(v as Exclude<ManagedRole,"admin">)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).filter(([r])=>r!=="admin").map(([r,label])=><SelectItem key={r} value={r}>{label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Senha temporária</Label><Input type="password" value={temporaryPassword} onChange={e=>setTemporaryPassword(e.target.value)} placeholder="Mínimo 8 caracteres" /></div>
    </div><DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button><Button disabled={createMutation.isPending || !name || !email || temporaryPassword.length<8} onClick={()=>createMutation.mutate()}>{createMutation.isPending?"Criando…":"Criar usuário"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(resetId)} onOpenChange={v=>!v&&setResetId(null)}><DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle>Redefinir senha</DialogTitle></DialogHeader><div className="space-y-2"><Label>Nova senha temporária</Label><Input type="password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)} placeholder="Mínimo 8 caracteres" /></div><DialogFooter><Button variant="outline" onClick={()=>setResetId(null)}>Cancelar</Button><Button disabled={resetMutation.isPending || resetPassword.length<8} onClick={()=>resetMutation.mutate()}>{resetMutation.isPending?"Salvando…":"Redefinir senha"}</Button></DialogFooter></DialogContent></Dialog>
  </AppShell>;
}
