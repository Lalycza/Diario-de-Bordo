import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Apenas administradores podem alterar acessos.");
}

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: "admin" | "operador" }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: delError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (delError) throw delError;

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw error;
    return { ok: true };
  });

export const listUsersWithRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles, error: pError }, { data: roles, error: rError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, nome, email, created_at").order("nome"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (pError) throw pError;
    if (rError) throw rError;

    return (profiles ?? []).map((p) => ({
      id: p.id as string,
      nome: (p.nome as string) ?? "",
      email: (p.email as string) ?? "",
      role: ((roles ?? []).find((r) => r.user_id === p.id)?.role as string) ?? "operador",
    }));
  });
