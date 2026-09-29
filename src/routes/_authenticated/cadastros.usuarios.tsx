import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";

import { listUsersWithRoles, setUserRole, type ManagedRole } from "@/lib/admin.functions";
import { useRole } from "@/lib/useRole";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/cadastros/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários e perfis" },
      {
        name: "description",
        content: "Gerencie os cinco perfis de acesso do IMPLANTA.",
      },
    ],
  }),
  component: UsuariosPage,
});

const ROLE_LABELS: Record<ManagedRole, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  analista: "Analista",
  operador: "Operador",
  comercial: "Comercial",
  cliente: "Cliente",
};

function UsuariosPage() {
  const { user } = Route.useRouteContext();
  const { isAdmin, isSupervisor, isLoading } = useRole();
  const queryClient = useQueryClient();
  const carregar = useServerFn(listUsersWithRoles);
  const alterar = useServerFn(setUserRole);

  const usersQuery = useQuery({
    queryKey: ["users-roles"],
    enabled: isAdmin || isSupervisor,
    queryFn: async () => carregar({ data: undefined }),
  });

  const mudarPapel = useMutation({
    mutationFn: async (input: { userId: string; role: ManagedRole }) =>
      alterar({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-roles"] });
      queryClient.invalidateQueries({ queryKey: ["my-roles"] });
      toast.success("Perfil atualizado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell userLabel={user.email}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Usuários e perfis</h1>
        <p className="text-sm text-muted-foreground">
          Administrador, Supervisor, Analista, Operador, Comercial e Cliente.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !(isAdmin || isSupervisor) ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Apenas administradores ou supervisores podem gerenciar acessos.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">E-mail</th>
                <th className="px-4 py-2 text-left">Perfil</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {(usersQuery.data ?? []).map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{u.nome || "—"}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={u.role}
                      onValueChange={(role) =>
                        mudarPapel.mutate({ userId: u.id, role: role as ManagedRole })
                      }
                      disabled={mudarPapel.isPending || !isAdmin || u.protectedAdmin}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([role, label]) => (
                          <SelectItem key={role} value={role}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.protectedAdmin ? (
                      <ShieldCheck className="ml-auto size-4" aria-label="Administrador principal protegido" />
                    ) : (
                      <UserCog className="ml-auto size-4 text-muted-foreground" aria-label="Usuário" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
