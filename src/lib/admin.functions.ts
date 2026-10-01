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
      supabaseAdmin.from("profiles").select("id, name, email, active, created_at").order("name"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (pError) throw pError;
    if (rError) throw rError;

    return (profiles ?? []).map((p) => ({
      id: p.id as string,
      nome: (p.name as string) ?? "",
      email: (p.email as string) ?? "",
      active: p.active !== false,
      role: ((roles ?? []).find((r) => r.user_id === p.id)?.role as ManagedRole) ?? "operador",
      protectedAdmin:
        (p.email ?? "").toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase(),
    }));
  });

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; email: string; role: Exclude<ManagedRole, "admin">; temporaryPassword: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdminOrSupervisor(context as never);
    if (!data.name.trim() || !data.email.trim() || data.temporaryPassword.length < 8) {
      throw new Error("Nome, e-mail e uma senha temporária de no mínimo 8 caracteres são obrigatórios.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.temporaryPassword,
      email_confirm: true,
      user_metadata: { name: data.name.trim() },
    });
    if (error) throw error;
    if (!created.user) throw new Error("Não foi possível criar o usuário.");
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ name: data.name.trim(), email: data.email.trim().toLowerCase(), active: true, must_change_password: true })
      .eq("id", created.user.id);
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw roleError;
    }
    return { ok: true, userId: created.user.id };
  });

export const updateManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; name: string; email: string; role: ManagedRole }) => input)
  .handler(async ({ data, context }) => {
    await assertAdminOrSupervisor(context as never);
    if (!data.name.trim() || !data.email.trim()) {
      throw new Error("Nome e e-mail são obrigatórios.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", data.userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) throw new Error("Usuário não encontrado.");

    const targetIsProtectedAdmin =
      target.email?.toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase();

    if (targetIsProtectedAdmin && data.role !== "admin") {
      throw new Error("O Administrador principal não pode ter o perfil alterado.");
    }
    if (data.role === "admin" && !targetIsProtectedAdmin) {
      throw new Error("Somente o Administrador principal pode definir outro Administrador.");
    }
    if (targetIsProtectedAdmin && data.email.trim().toLowerCase() !== PROTECTED_ADMIN_EMAIL.toLowerCase()) {
      throw new Error("O e-mail do Administrador principal não pode ser alterado.");
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: { name: data.name.trim() },
    });
    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ name: data.name.trim(), email: normalizedEmail })
      .eq("id", data.userId);
    if (profileError) throw profileError;

    const { error: delError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (delError) throw delError;

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (roleError) throw roleError;

    return { ok: true };
  });

export const setManagedUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; active: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertAdminOrSupervisor(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", data.userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) throw new Error("Usuário não encontrado.");

    if (target.email?.toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase() && !data.active) {
      throw new Error("O Administrador principal não pode ser inativado.");
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ active: data.active })
      .eq("id", data.userId);
    if (error) throw error;

    return { ok: true, active: data.active };
  });

export const resetManagedUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; temporaryPassword: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdminOrSupervisor(context as never);
    if (data.temporaryPassword.length < 8) {
      throw new Error("A senha temporária deve ter no mínimo 8 caracteres.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles").select("id, email").eq("id", data.userId).maybeSingle();
    if (targetError) throw targetError;
    if (!target) throw new Error("Usuário não encontrado.");
    if (target.email?.toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase()) {
      throw new Error("A senha do Administrador principal não pode ser redefinida por este fluxo.");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.temporaryPassword });
    if (error) throw error;
    const { error: profileError } = await supabaseAdmin
      .from("profiles").update({ must_change_password: true }).eq("id", data.userId);
    if (profileError) throw profileError;
    return { ok: true };
  });
