import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ManagedRole = "admin" | "supervisor" | "analista" | "operador" | "cs" | "comercial" | "cliente";
export type BusinessUnit = "sistemas" | "infra" | "ambos";
export type ManagedBusinessUnit = Exclude<BusinessUnit, "ambos">;

const PROTECTED_ADMIN_EMAIL = "larissazonetti@outlook.com";

type ManagerContext = { supabase: any; userId: string };
type ManagerScope = { isCentralAdmin: boolean; businessUnit: BusinessUnit };

async function assertAdminOrSupervisor(context: ManagerContext): Promise<ManagerScope> {
  const { data: authData, error: authError } = await context.supabase.auth.getUser();
  if (authError) throw authError;

  const requesterEmail = authData.user?.email?.toLowerCase() ?? "";
  const isProtectedOwner = requesterEmail === PROTECTED_ADMIN_EMAIL.toLowerCase();

  const [{ data: isAdminRole, error: adminError }, { data: isSupervisor, error: supervisorError }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "supervisor" }),
  ]);
  if (adminError) throw adminError;
  if (supervisorError) throw supervisorError;

  const isCentralAdmin = isProtectedOwner && isAdminRole === true;
  if (!isCentralAdmin && isSupervisor !== true) {
    throw new Error("Apenas o Administrador principal ou Supervisores podem alterar acessos.");
  }
  if (isCentralAdmin) return { isCentralAdmin: true, businessUnit: "ambos" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: requester, error: requesterError } = await supabaseAdmin
    .from("profiles")
    .select("business_unit")
    .eq("id", context.userId)
    .maybeSingle();
  if (requesterError) throw requesterError;

  const businessUnit = (requester?.business_unit ?? "sistemas") as BusinessUnit;
  if (businessUnit === "ambos") {
    throw new Error("Supervisores precisam estar vinculados a uma única área.");
  }
  return { isCentralAdmin: false, businessUnit };
}

function assertTargetInScope(
  target: { email?: string | null; business_unit?: string | null } | null,
  scope: ManagerScope,
) {
  if (!target) throw new Error("Usuário não encontrado.");
  if (!scope.isCentralAdmin && target.business_unit !== scope.businessUnit) {
    throw new Error("Você só pode administrar usuários da sua própria área.");
  }
}

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: ManagedRole }) => input)
  .handler(async ({ data, context }) => {
    const scope = await assertAdminOrSupervisor(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, business_unit")
      .eq("id", data.userId)
      .maybeSingle();
    if (targetError) throw targetError;
    assertTargetInScope(target, scope);

    const targetIsProtectedAdmin = target?.email?.toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase();
    if (targetIsProtectedAdmin && data.role !== "admin") {
      throw new Error("O Administrador principal não pode ser rebaixado ou removido.");
    }
    if (data.role === "admin" && !targetIsProtectedAdmin) {
      throw new Error("Somente o Administrador principal pode definir outro Administrador.");
    }

    const { error: delError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (delError) throw delError;
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) throw error;

    return { ok: true };
  });

export const setUserBusinessUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; businessUnit: ManagedBusinessUnit }) => input)
  .handler(async ({ data, context }) => {
    const scope = await assertAdminOrSupervisor(context as never);
    if (!scope.isCentralAdmin) {
      throw new Error("Somente o Administrador principal pode alterar a área de atuação de um usuário.");
    }
    if (!["sistemas", "infra"].includes(data.businessUnit)) {
      throw new Error("Selecione uma área válida.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", data.userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) throw new Error("Usuário não encontrado.");
    if (target.email?.toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase()) {
      throw new Error("A área do Administrador principal é protegida.");
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ business_unit: data.businessUnit })
      .eq("id", data.userId);
    if (error) throw error;

    return { ok: true };
  });

export const listUsersWithRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await assertAdminOrSupervisor(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error: pError } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, created_at, business_unit")
      .order("name");
    if (pError) throw pError;

    const visibleProfiles = (profiles ?? []).filter((profile) =>
      (profile.email ?? "").toLowerCase() !== PROTECTED_ADMIN_EMAIL.toLowerCase()
    );
    const visibleIds = visibleProfiles.map((profile) => profile.id);
    const { data: roles, error: rError } = visibleIds.length
      ? await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", visibleIds)
      : { data: [], error: null };
    if (rError) throw rError;

    return visibleProfiles.map((profile) => ({
      id: profile.id as string,
      nome: (profile.name as string) ?? "",
      email: (profile.email as string) ?? "",
      role: ((roles ?? []).find((role) => role.user_id === profile.id)?.role as ManagedRole) ?? "operador",
      businessUnit: (profile.business_unit ?? "sistemas") as ManagedBusinessUnit,
      canManage: scope.isCentralAdmin || profile.business_unit === scope.businessUnit,
      protectedAdmin: (profile.email ?? "").toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase(),
    }));
  });

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    name: string;
    email: string;
    role: Exclude<ManagedRole, "admin">;
    businessUnit: ManagedBusinessUnit;
    temporaryPassword: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const scope = await assertAdminOrSupervisor(context as never);
    if (!data.name.trim() || !data.email.trim() || data.temporaryPassword.length < 8) {
      throw new Error("Nome, e-mail e uma senha temporária de no mínimo 8 caracteres são obrigatórios.");
    }
    if (!["sistemas", "infra"].includes(data.businessUnit)) {
      throw new Error("Selecione uma área válida.");
    }
    if (!scope.isCentralAdmin && data.businessUnit !== scope.businessUnit) {
      throw new Error("Você só pode criar usuários para a sua própria área.");
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
      .update({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        must_change_password: true,
        business_unit: data.businessUnit,
      })
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

export const resetManagedUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; temporaryPassword: string }) => input)
  .handler(async ({ data, context }) => {
    const scope = await assertAdminOrSupervisor(context as never);
    if (data.temporaryPassword.length < 8) {
      throw new Error("A senha temporária deve ter no mínimo 8 caracteres.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, business_unit")
      .eq("id", data.userId)
      .maybeSingle();
    if (targetError) throw targetError;
    assertTargetInScope(target, scope);

    if (target?.email?.toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase()) {
      throw new Error("A senha do Administrador principal não pode ser redefinida por este fluxo.");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.temporaryPassword });
    if (error) throw error;
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", data.userId);
    if (profileError) throw profileError;
    return { ok: true };
  });
