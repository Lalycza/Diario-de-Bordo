import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ManagedRole = "admin" | "supervisor" | "analista" | "operador" | "comercial" | "cliente";

const PROTECTED_ADMIN_EMAIL = "larissazonetti@outlook.com";

async function assertAdminOrSupervisor(context: { supabase: any; userId: string }) {
  const { data: authData, error: authError } = await context.supabase.auth.getUser();
  if (authError) throw authError;

  const requesterEmail = authData.user?.email?.toLowerCase() ?? "";
  const isProtectedOwner = requesterEmail === PROTECTED_ADMIN_EMAIL.toLowerCase();

  const { data: isAdminRole, error: adminError } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (adminError) throw adminError;

  if (isProtectedOwner && isAdminRole) return;

  const { data: isSupervisor, error: supervisorError } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "supervisor",
  });
  if (supervisorError) throw supervisorError;
  if (!isSupervisor) {
    throw new Error("Apenas o Administrador principal ou Supervisores podem alterar acessos.");
  }
}

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: ManagedRole }) => input)
  .handler(async ({ data, context }) => {
    await assertAdminOrSupervisor(context as never);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", data.userId)
      .maybeSingle();
    if (targetError) throw targetError;

    const targetIsProtectedAdmin =
      target?.email?.toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase();

    if (targetIsProtectedAdmin && data.role !== "admin") {
      throw new Error("O Administrador principal não pode ser rebaixado ou removido.");
    }

    if (data.role === "admin" && !targetIsProtectedAdmin) {
      throw new Error("Somente o Administrador principal pode definir outro Administrador.");
    }

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
    await assertAdminOrSupervisor(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles, error: pError }, { data: roles, error: rError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, name, email, created_at").order("name"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (pError) throw pError;
    if (rError) throw rError;

    return (profiles ?? []).map((p) => ({
      id: p.id as string,
      nome: (p.name as string) ?? "",
      email: (p.email as string) ?? "",
      role: ((roles ?? []).find((r) => r.user_id === p.id)?.role as ManagedRole) ?? "operador",
      protectedAdmin:
        (p.email ?? "").toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase(),
    }));
  });
