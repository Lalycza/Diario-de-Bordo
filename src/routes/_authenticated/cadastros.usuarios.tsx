import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";

import { listUsersWithRoles, setUserRole } from "@/lib/admin.functions";
import { useRole } from "@/lib/useRole";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/cadastros/usuarios")({
  head: () => ({
    meta: [
      { title: "Administradores e operadores" },
      {
        name: "description",
        content:
          "Defina quem é administrador (gerência) e quem é operador (analista) responsável por projetos.",
      },
      { property: "og:title", content: "Administradores e operadores" },
      {
        property: "og:description",
        content: "Controle de acesso por perfil: gerentes veem tudo, analistas veem seus projetos.",
      },
    ],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { user } = Route.useRouteContext();
  const { isAdmin, isLoading } = useRole();
  const queryClient = useQueryClient();
  const carregar = useServerFn(listUsersWithRoles);
  const alterar = useServerFn(setUserRole);

  const usersQuery = useQuery({
    queryKey: ["users-roles"],
    enabled: isAdmin,
    queryFn: async () => carregar({ data: undefined }),
  });

  const mudarPapel = useMutation({
    mutationFn: async (input: { userId: string; role: "admin" | "operador" }) =>
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
        <h1 className="text-2xl font-semibold tracking-tight">Administradores e operadores</h1>
        <p className="text-sm text-muted-foreground">
          Administradores (gerência) veem todos os projetos e documentos. Operadores (analistas)
          acessam apenas os projetos sob sua responsabilidade.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !isAdmin ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Apenas administradores podem gerenciar acessos.
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
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role === "admin" ? "Administrador" : "Operador"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={mudarPapel.isPending}
                      onClick={() =>
                        mudarPapel.mutate({
                          userId: u.id,
                          role: u.role === "admin" ? "operador" : "admin",
                        })
                      }
                    >
                      {u.role === "admin" ? (
                        <>
                          <UserCog className="size-4" /> Tornar operador
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="size-4" /> Tornar administrador
                        </>
                      )}
                    </Button>
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
